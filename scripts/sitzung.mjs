// Sitzung prüfen und für die Ansicht aufbereiten (file:// kann kein fetch, deshalb .js-Hüllen)
//   node scripts/sitzung.mjs <id>     prüft sessions/<id>.json, schreibt sessions/<id>.js
//                                     (mit "live": true ohne Urteil; die Ansicht lädt die Sitzung dann laufend nach)
//   node scripts/sitzung.mjs          baut nur sessions/index.js und viewer/rat.js neu
import fs from 'node:fs/promises'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = path.join(root, 'sessions');
// Ratsmitglieder: jeder Unterordner von skill/ mit Dossiers; Dateien mit _ sind Vorlagen
const ORDNER = (await fs.readdir(path.join(root, 'skill'), { withFileTypes: true })).filter(d => d.isDirectory()).map(d => path.join(root, 'skill', d.name));

// Dossier-Frontmatter: nur einfache „key: wert"-Zeilen, Listen als [a, b]
const front = txt => Object.fromEntries((txt.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').split('\n')
  .map(z => z.match(/^([a-z_0-9]+):\s*(.*)$/)).filter(Boolean)
  .map(([, k, v]) => [k, v.startsWith('[') ? v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean) : v.replace(/^["“„]|["”“]$/g, '')]));
const rat = {};
for (const L of ORDNER) for (const f of (await fs.readdir(L).catch(() => [])).filter(f => f.endsWith('.md') && !f.startsWith('_'))) {
  const roh = await fs.readFile(path.join(L, f), 'utf8'), m = front(roh);
  // Namen der vier Prüfsteine aus „So entscheide ich“ bzw. „How I decide“ (für die Anzeige)
  const ps = [...(roh.split(/## (?:So entscheide ich|How I decide)/)[1] ?? '').matchAll(/\*\*P(\d) ([^*(]+?)\s*(\((?:Leitfrage|lead question)\))?:?\*\*/gi)].map(x => x[2].trim());
  // Animationsbilder, die es zu diesem Mitglied gibt (Mundformen m1–m4, Blinzeln). „avatar“ im Frontmatter:
  // Das Mitglied leiht sich die Bilder eines anderen (der englische Rat nutzt die Gesichter des deutschen)
  const av = m.avatar ?? m.slug, frames = [];
  for (const v of ['m1', 'm2', 'm3', 'm4', 'blink']) if (await fs.access(path.join(root, 'viewer/avatare', `${av}-${v}.png`)).then(() => true, () => false)) frames.push(v);
  if (m.slug) rat[m.slug] = { name: m.name, etikett: m.etikett, leitfrage: m.leitfrage, branchen: m.branchen ?? [], frames, pruefsteine: ps, ...(m.avatar ? { avatar: m.avatar } : {}), ...(m.sprache ? { sprache: m.sprache } : {}) };
}
await fs.writeFile(path.join(root, 'viewer/rat.js'), `window.LR_RAT = ${JSON.stringify(rat, null, 1)};\n`);

const PHASEN = ['eindruck', 'fragen', 'schlagabtausch', 'angebote', 'verhandlung'];
const STATUS = ['interessiert', 'skeptisch', 'raus', 'angebot'];
// Laufende Sitzung („live": true): ohne Urteil und ohne vollständige Angebote, die Ansicht lädt sie laufend nach
function pruefe(s) {
  const f = []; const soll = (ok, msg) => ok || f.push(msg);
  for (const k of ['id', 'titel', 'datum', 'pitch', 'panel', 'beitraege', ...(s.live ? [] : ['urteil'])]) soll(s[k] != null, `Feld fehlt: ${k}`);
  if (f.length) return f;
  soll(/^\d{4}-\d{2}-\d{2}$/.test(s.datum), 'datum nicht JJJJ-MM-TT');
  soll(typeof s.pitch.text === 'string' && s.pitch.text.split(/\s+/).length <= 170, 'pitch.text fehlt oder > 150 Wörter');
  // Format investoren: Forderung mit Betrag und Anteil, oder ausdrücklich null („forderung: keine“, ohne Beteiligung)
  if ((s.format ?? 'investoren') === 'investoren') soll(s.pitch.forderung === null || (Number.isFinite(s.pitch.forderung?.betrag) && Number.isFinite(s.pitch.forderung?.anteil)), 'pitch.forderung: betrag/anteil als Zahlen oder null für „keine“');
  soll(['investoren', 'beirat'].includes(s.format ?? 'investoren'), 'format muss investoren oder beirat sein');
  const panel = s.panel.map(p => p.slug);
  soll(panel.length >= 3 && panel.length <= 5, 'panel braucht 3–5 Mitglieder');
  for (const p of panel) soll(rat[p], `unbekanntes Mitglied im panel: ${p}`);
  const wer = new Set([...panel, 'gruender', 'moderator']);
  s.beitraege.forEach((b, i) => {
    const w = `beitraege[${i}]`;
    soll(PHASEN.includes(b.phase), `${w}: phase „${b.phase}"`);
    soll(wer.has(b.sprecher), `${w}: sprecher „${b.sprecher}" nicht im Panel`);
    soll(b.an == null || wer.has(b.an), `${w}: an „${b.an}" unbekannt`);
    soll(b.an !== b.sprecher, `${w}: spricht sich selbst an`);
    soll(typeof b.text === 'string' && b.text.length > 0, `${w}: text leer`);
    if (b.haltung) soll(STATUS.includes(b.haltung.status), `${w}: haltung.status „${b.haltung.status}"`);
    if (b.haltung?.wert != null) soll(b.haltung.wert >= 0 && b.haltung.wert <= 10, `${w}: wert außerhalb 0–10`);
    if (b.angebot?.betrag != null) soll(Number.isFinite(b.angebot.betrag) && Number.isFinite(b.angebot.anteil), `${w}: angebot betrag/anteil keine Zahlen`);
  });
  if (s.live) return f;
  for (const p of panel) soll(s.beitraege.some(b => b.sprecher === p && b.phase === 'angebote'), `${p} hat keine Entscheidung in „angebote"`);
  const u = s.urteil;
  soll(['deal', 'kein_deal'].includes(u.ergebnis), 'urteil.ergebnis muss deal oder kein_deal sein');
  soll(u.ergebnis === 'kein_deal' ? u.deal == null : Array.isArray(u.deal?.mitglieder), 'urteil.deal passt nicht zum ergebnis');
  for (const e of u.einwaende ?? []) {
    soll(panel.includes(e.von), `einwand von „${e.von}" nicht im Panel`);
    if (e.status) soll(['ausgeraeumt', 'offen', 'neu'].includes(e.status), `einwand-status „${e.status}" unbekannt`);
  }
  if (s.kosten) soll(Number.isFinite(s.kosten.agenten) && Number.isFinite(s.kosten.tokens), 'kosten.agenten/tokens keine Zahlen');
  const ids = new Set((s.optionen ?? []).map(o => o.id));
  if (s.optionen) soll(s.optionen.length >= 2 && s.optionen.length <= 4 && s.optionen.every(o => o.id && o.text), 'optionen: 2–4 Einträge mit id und text');
  s.beitraege.forEach((b, i) => { if (b.optionen) soll(Object.keys(b.optionen).every(k => ids.has(k)), `beitraege[${i}]: unbekannte Option`); });
  if (u.stufe) soll(['los', 'los_mit_bedingungen', 'umbauen', 'warten', 'lassen'].includes(u.stufe), `urteil.stufe „${u.stufe}" unbekannt`);
  return f;
}

// Lesbares Protokoll neben der Sitzung: Deutsch, mit "sprache": "en" Englisch
const STUFE = { de: { los: 'Los', los_mit_bedingungen: 'Los mit Bedingungen', umbauen: 'Umbauen', warten: 'Warten', lassen: 'Lassen' },
  en: { los: 'Go', los_mit_bedingungen: 'Go with conditions', umbauen: 'Rework', warten: 'Wait', lassen: 'Drop' } };
const PH = { de: { eindruck: 'Erster Eindruck', fragen: 'Kreuzverhör', schlagabtausch: 'Schlagabtausch', angebote: 'Angebote', verhandlung: 'Verhandlung' },
  en: { eindruck: 'First impression', fragen: 'Cross-examination', schlagabtausch: 'Debate', angebote: 'Vote', verhandlung: 'Follow-up' } };
const HALTUNG_EN = { interessiert: 'interested', skeptisch: 'skeptical', raus: 'out', angebot: 'yes, if' };
const EINWAND = { de: { ausgeraeumt: 'ausgeräumt', offen: 'offen', neu: 'neu' }, en: { ausgeraeumt: 'resolved', offen: 'open', neu: 'new' } };
function protokoll(s) {
  const EN = s.sprache === 'en', t = (de, en) => EN ? en : de;
  const ph = { ...PH[t('de', 'en')], ...(EN && s.format !== 'beirat' ? { angebote: 'Offers', verhandlung: 'Negotiation' } : {}) }, stufe = STUFE[t('de', 'en')];
  const dz = x => EN ? String(x) : String(x).replace('.', ',');
  const euro = n => EN ? '$' + new Intl.NumberFormat('en-US').format(n) : new Intl.NumberFormat('de-DE').format(n) + ' €';
  const kond = a => a.betrag == null ? t('Ja, wenn …', 'Yes, if …') : a.anteil ? `${euro(a.betrag)} ${t('für', 'for')} ${a.anteil} %` : `${euro(a.betrag)} ${t('ohne Anteil', 'without equity')}`;
  const wer = x => x === 'gruender' ? s.pitch.gruender : x === 'moderator' ? t('Moderation', 'Moderator') : (rat[x]?.name ?? x);
  const beirat = s.format === 'beirat';
  const z = [`# ${s.marke ?? (beirat ? 'Generalprobe' : t('Pitch-Runde', 'Pitch round'))}: ${s.titel} (${s.datum})`, '',
    `> ${beirat ? t('KI-Simulation. Die Ratsmitglieder sind Rollen, keine echten Personen.', 'AI simulation. The council members are roles, not real people.') : t('KI-Simulation, keine echten Aussagen der genannten Personen. Nur intern.', 'AI simulation, no real statements by the people named. Internal only.')}`, '',
    `${s.pitch.forderung ? `**${t('Forderung', 'Ask')}:** ${kond(s.pitch.forderung)}${s.pitch.forderung.anteil > 0 ? ` (${t('Bewertung', 'valuation')} ${euro(Math.round(s.pitch.forderung.betrag / s.pitch.forderung.anteil * 100 - s.pitch.forderung.betrag))} ${t('vor', 'pre')}, ${euro(Math.round(s.pitch.forderung.betrag / s.pitch.forderung.anteil * 100))} ${t('nach dem Investment', 'post-money')})` : ''} · ` : s.pitch.forderung === null ? `**${t('Forderung', 'Ask')}:** ${t('keine', 'none')} · ` : ''}**${t('Modus', 'Mode')}:** ${s.modus ?? '–'}${s.unterlagen ? ` · **${t('Unterlagen', 'Documents')}:** \`${s.unterlagen}\`` : ''}`, '',
    `**Panel:** ${s.panel.map(p => `${wer(p.slug)} (${p.warum})`).join('; ')}`, '', '## Pitch', '', s.pitch.text, ''];
  if (s.pitch.annahmen?.length) z.push(`**${t('Annahmen', 'Assumptions')}:**`, ...s.pitch.annahmen.map(a => `- ${a}`), '');
  if (s.optionen?.length) z.push(`**${t('Optionen', 'Options')}:**`, ...s.optionen.map(o => `- **${o.id}:** ${o.text}`), '');
  let phase = '';
  for (const b of s.beitraege) {
    if (b.phase !== phase) { phase = b.phase; z.push(`## ${ph[phase]}`, ''); }
    const an = b.an ? ` → ${wer(b.an)}` : '';
    const halt = b.haltung ? ` _(${EN ? (b.haltung.status === 'angebot' && !beirat ? 'offer' : HALTUNG_EN[b.haltung.status] ?? b.haltung.status) : b.haltung.status}${b.haltung.wert != null ? ' ' + dz(b.haltung.wert) : ''})_` : '';
    const ang = b.angebot && b.haltung?.status !== 'raus' ? ` **${t('Angebot', beirat ? 'Vote' : 'Offer')}: ${kond(b.angebot)}**${b.bewertung ? ` (${t('Bewertung', 'valuation')} ${euro(b.bewertung.post)}${b.bewertung.abschlag != null ? `, ${t('Abschlag', 'discount')} ${b.bewertung.abschlag} %` : ''})` : ''}${b.angebot.bedingungen?.length ? ' – ' + b.angebot.bedingungen.join('; ') : ''}` : '';
    z.push(`**${wer(b.sprecher)}**${an}${b.annahme ? ` _(${t('Annahme', 'assumption')})_` : ''}: ${b.text}${halt}${ang}`, '');
    if (b.pruefsteine) z.push(`> ${['p1', 'p2', 'p3', 'p4'].map((k, i) => `${rat[b.sprecher]?.pruefsteine?.[i] ?? k.toUpperCase()} ${b.pruefsteine[k]?.wert ?? '–'}${b.pruefsteine[k]?.herkunft && b.pruefsteine[k].herkunft !== 'pitch' ? ` (${EN ? { annahme: 'assumption', fehlt: 'missing' }[b.pruefsteine[k].herkunft] ?? b.pruefsteine[k].herkunft : b.pruefsteine[k].herkunft})` : ''}`).join(' · ')} · **${t('Schnitt', 'Average')} ${dz(b.schnitt)}**${b.ko ? ` · K.O.: ${b.ko}` : ''}${b.bewegt && !['nein', 'no'].includes(b.bewegt) ? ` · ${t('bewegt', 'moved')}: ${b.bewegt}` : ''}`, '');
    if (b.optionen) z.push(`> ${t('Optionen', 'Options')}: ${Object.entries(b.optionen).map(([k, v]) => `${k} ${v}`).join(' · ')}${b.empfehlung ? ` · ${t('Empfehlung', 'recommends')} ${b.empfehlung}` : ''}`, '');
    if (b.regel) z.push(`> ${t('Regel', 'Rule')}: ${b.regel}`, '');
  }
  const u = s.urteil;
  z.push(`## ${t('Urteil', 'Verdict')}: ${u.ergebnis === 'deal' ? (beirat ? 'Go' : 'Deal') : (beirat ? 'No-Go' : t('Kein Deal', 'No deal'))}${u.stufe ? ` · ${t('Stufe', 'Level')}: ${stufe[u.stufe]}` : ''}`, '');
  if (u.wertung?.optionen) z.push(`| Option | ${t('Schnitt', 'Average')} | ${t('Spanne', 'Spread')} |`, '|---|---|---|', ...Object.entries(u.wertung.optionen).map(([k, v]) => `| ${k}${k === u.wertung.beste ? t(' (beste)', ' (best)') : ''}: ${(s.optionen ?? []).find(o => o.id === k)?.text ?? ''} | ${dz(v.schnitt)} | ${v.spanne} |`), '');
  if (u.bewertung) z.push(EN ? `**Valuation check:** Your valuation ${euro(u.bewertung.forderung.post)} post-money (${euro(u.bewertung.forderung.pre)} pre). ${u.bewertung.angebote.length ? `Offers ${euro(u.bewertung.min)}–${euro(u.bewertung.max)}, discount ${Math.min(...u.bewertung.angebote.map(x => x.abschlag))}–${Math.max(...u.bewertung.angebote.map(x => x.abschlag))} %.` : 'No offer with equity, so no market price for the valuation.'}`
    : `**Bewertungs-Check:** Deine Bewertung ${euro(u.bewertung.forderung.post)} nach dem Investment (${euro(u.bewertung.forderung.pre)} davor). ${u.bewertung.angebote.length ? `Angebote ${euro(u.bewertung.min)}–${euro(u.bewertung.max)}, Abschlag ${Math.min(...u.bewertung.angebote.map(x => x.abschlag))}–${Math.max(...u.bewertung.angebote.map(x => x.abschlag))} %.` : 'Kein Angebot mit Anteil, also kein Marktpreis für die Bewertung.'}`, '');
  if (u.ausloeser) z.push(`**${t('Warten auf', 'Waiting for')}:** ${u.ausloeser}${u.datum ? ` (${t('bis', 'until')} ${u.datum})` : ''}`, '');
  if (u.deal) z.push(`**${u.deal.mitglieder.map(wer).join(' & ')}:** ${kond(u.deal)}${u.deal.bedingungen?.length ? ' – ' + u.deal.bedingungen.join('; ') : ''}`, '');
  if (u.wertung) z.push(`**${t('Wertung', 'Score')}:** ${t('Punktwert', 'Score')} ${dz(u.wertung.punktwert)} · ${t('Spanne', 'Spread')} ${dz(u.wertung.spanne)} · ${t('Sicherheit', 'Confidence')} ${dz(u.wertung.sicherheit ?? '–')}`, '',
    t('| Mitglied | Gewicht | Schnitt Start | Schnitt Ende | Entscheidung |', '| Member | Weight | Average start | Average end | Decision |'), '|---|---|---|---|---|',
    ...Object.entries(u.wertung.je).map(([k, v]) => `| ${wer(k)} | ${v.gewicht} | ${dz(v.start)} | ${dz(v.ende)} | ${(EN ? HALTUNG_EN[v.entscheidung] : v.entscheidung) ?? '–'} |`), '');
  z.push(u.begruendung, '', `**${t('Die stärksten Einwände', 'The strongest objections')}**`, '', ...(u.einwaende ?? []).map(e => `- **${wer(e.von)}**${e.status ? ` _(${EINWAND[t('de', 'en')][e.status]})_` : ''}: ${e.text} → ${e.ausraeumen}`), '', `**${t('Nächster Schritt', 'Next step')}:** ${u.naechster_schritt}`, '');
  if (s.check?.minuten && Object.keys(s.check.minuten).length) {
    const min = Object.values(s.check.minuten).reduce((x, y) => x + y, 0), arbeit = min / 60 * s.check.stundensatz, modell = (s.kosten?.usd?.gesamt ?? 0) * 0.92;
    z.push(`**Arbeitszeit:** ${Object.entries(s.check.minuten).map(([k, v]) => `${k} ${v} min`).join(', ')}, zusammen ${min} min (${euro(Math.round(arbeit))} zu ${String(s.check.stundensatz).replace('.', ',')} € je Stunde). **Deckungsbeitrag** bei ${euro(s.check.preis)}: ${Math.round((1 - (arbeit + modell) / s.check.preis) * 100)} % nach Arbeitszeit und Modellkosten. Die 70-%-Grenze liegt bei ${Math.round(0.3 * s.check.preis / s.check.stundensatz * 60)} Minuten.`, '');
  }
  if (s.kosten) z.push(EN ? `**Cost:** ${s.kosten.agenten} agent calls, ${new Intl.NumberFormat('en-US').format(s.kosten.tokens)} tokens${s.kosten.usd ? `, about $${s.kosten.usd.gesamt} at API list price (moderator $${s.kosten.usd.moderation}, council $${s.kosten.usd.rat})` : ''}`
    : `**Kosten:** ${s.kosten.agenten} Agentenaufrufe, ${new Intl.NumberFormat('de-DE').format(s.kosten.tokens)} Tokens${s.kosten.usd ? `, rund ${String(s.kosten.usd.gesamt).replace('.', ',')} $ zum API-Listenpreis (Moderation ${String(s.kosten.usd.moderation).replace('.', ',')} $, Rat ${String(s.kosten.usd.rat).replace('.', ',')} $)` : ''}`, '');
  return z.join('\n');
}

const id = process.argv[2];
if (id) {
  const s = JSON.parse(await fs.readFile(path.join(S, id + '.json'), 'utf8'));
  const fehler = pruefe(s);
  if (fehler.length) { console.error('Schemafehler:\n- ' + fehler.join('\n- ')); process.exit(1); }
  await fs.writeFile(path.join(S, id + '.js'), `window.LR_SESSION = ${JSON.stringify(s)};\n`);
  if (s.live) console.log(`live: ${id} (${s.beitraege.length} Beiträge, Phase ${s.live_phase ?? '–'})`);
  else {
    await fs.writeFile(path.join(S, id + '.md'), protokoll(s));
    console.log(`ok: ${id} (${s.beitraege.length} Beiträge, ${s.urteil.ergebnis})`);
  }
}
// Anzeige des Rückvergleichs: ohne Bericht eine leere Datei, damit die Ansicht keinen 404 erzeugt
if (!(await fs.access(path.join(S, 'rueckvergleich/bericht.json')).then(() => true, () => false)))
  await fs.writeFile(path.join(root, 'viewer/rueckvergleich.js'), 'window.LR_RUECKVERGLEICH = null;\n');

const liste = [];
for (const f of (await fs.readdir(S)).filter(f => f.endsWith('.json'))) {
  const s = JSON.parse(await fs.readFile(path.join(S, f), 'utf8'));
  liste.push({ id: s.id, titel: s.titel, datum: s.datum, ergebnis: s.urteil?.ergebnis, ...(s.live ? { live: true } : {}) });
}
liste.sort((a, b) => b.datum.localeCompare(a.datum) || b.id.localeCompare(a.id));
await fs.writeFile(path.join(S, 'index.js'), `window.LR_INDEX = ${JSON.stringify(liste, null, 1)};\n`);
console.log(`index: ${liste.length} Sitzung(en), ${Object.keys(rat).length} Dossiers`);
