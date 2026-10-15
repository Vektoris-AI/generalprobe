// Runden einer Sitzung vorbereiten und einsammeln. Die Moderation tippt keine Texte ab: Jedes Ratsmitglied
// liest seinen Auftrag aus einer Datei und schreibt seine Antwort als JSON-Datei, dieses Skript prüft sie gegen
// die Urteilsregeln, rechnet die Prüfsteine nach und hängt die Beiträge an Sitzung und Verlauf.
//   node scripts/runde.mjs auftrag <id> <runde> [slug,…] [--zusatz <datei.json>]   runde: eindruck|schlagabtausch|angebote|verhandlung
//   node scripts/runde.mjs sammeln <id> <runde> [slug,…] [--erlauben]
//   node scripts/runde.mjs beitrag <id> '<json oder [json,…]>' [--live <phase> "<status>"]
//   node scripts/runde.mjs kernfragen <id> '<[{"frage": "…", "seiten": [{"position": "…", "mitglieder": ["slug"]}]}]>'
//   node scripts/runde.mjs live <id> <phase> "<status>"
//   node scripts/runde.mjs urteil <id> <datei.json>      (ergebnis, deal, begruendung, einwaende, naechster_schritt)
//   node scripts/runde.mjs ende <id>                     (Wertung rechnen, Live beenden, Kosten, Zitate, Protokoll)
//   node scripts/runde.mjs zeit <id> <schritt> <minuten> [--preis 490] [--stundensatz 162.5]
//        Arbeitszeit je Schritt (vorgespraech, vorbereitung, sitzung, auswertung, nachgespraech) für den Deckungsbeitrag;
//        Modellkosten in Dollar grob mit 0,92 in Euro umgerechnet
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process'; import { holen } from './agentantwort.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, id, a3, a4] = process.argv.slice(2);
const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
const datei = path.join(root, 'sessions', id + '.json'), verlauf = path.join(root, 'sessions', id + '.verlauf.txt');
if (!cmd || !id || !fs.existsSync(datei)) { console.error('Sitzung fehlt: sessions/<id>.json zuerst anlegen (Pitch, Panel, "live": true).'); process.exit(1); }
const s = JSON.parse(fs.readFileSync(datei, 'utf8'));
const beirat = s.format === 'beirat';
const speichern = () => fs.writeFileSync(datei, JSON.stringify(s, null, 1) + '\n');
const pruefen = () => { try { console.log(execFileSync('node', [path.join(root, 'scripts/sitzung.mjs'), id], { encoding: 'utf8' }).split('\n')[0]); } catch (e) { console.error(String(e.stdout || e.message)); } };

// Dossiers: skill/<ordner>/<slug>.md, Frontmatter wie in sitzung.mjs
const front = t => Object.fromEntries((t.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').split('\n').map(z => z.match(/^([a-z_0-9]+):\s*(.*)$/)).filter(Boolean)
  .map(([, k, v]) => [k, v.startsWith('[') ? v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean) : v.replace(/^["“„]|["”“]$/g, '')]));
const dossier = slug => { for (const d of fs.readdirSync(path.join(root, 'skill'), { withFileTypes: true })) { const f = path.join(root, 'skill', d.name, slug + '.md'); if (d.isDirectory() && fs.existsSync(f)) return { pfad: f, ...front(fs.readFileSync(f, 'utf8')) }; } throw new Error('Dossier fehlt: ' + slug); };
const name = x => x === 'gruender' ? s.pitch.gruender : x === 'moderator' ? 'Moderation' : (dossier(x).name ?? x);
const panel = s.panel.map(p => p.slug);
const slugs = (txt) => txt && !txt.startsWith('--') ? txt.split(',').map(x => x.trim()) : panel;
const euro = n => new Intl.NumberFormat('de-DE').format(n) + ' €';
const zahl = n => n == null ? '–' : String(n).replace('.', ',');

// Prüfsteine: Obergrenzen nach Herkunft, Schnitt = (2·P1 + P2 + P3 + P4) / 5
const DECKEL = { fehlt: 4, annahme: 6, pitch: 10 };
function normPS(ps = {}) {
  const out = {}, korr = [];
  for (const k of ['p1', 'p2', 'p3', 'p4']) {
    const p = ps[k]; if (!p) continue;
    let w = Math.max(0, Math.min(10, Number(p.wert))); const h = DECKEL[p.herkunft] != null ? p.herkunft : 'annahme';
    if (w > DECKEL[h]) { korr.push(`${k.toUpperCase()} ${w}→${DECKEL[h]} (${h})`); w = DECKEL[h]; }
    out[k] = { wert: w, herkunft: h, grund: p.grund ?? '' };
  }
  return { out, korr };
}
const schnitt = ps => ['p1', 'p2', 'p3', 'p4'].every(k => ps[k]) ? Math.round((2 * ps.p1.wert + ps.p2.wert + ps.p3.wert + ps.p4.wert) / 5 * 10) / 10 : null;
const stand = slug => { const z = {}; for (const b of s.beitraege) if (b.sprecher === slug && b.pruefsteine) Object.assign(z, { ps: b.pruefsteine, ko: b.ko ?? z.ko ?? null, schnitt: b.schnitt, sicherheit: b.sicherheit ?? z.sicherheit }); return z; };
const status = (ko, sn) => ko || sn == null || sn < 6.5 ? 'skeptisch' : 'interessiert';
const regel = (z) => z.ko ? { erlaubt: false, grund: 'K.O.: ' + z.ko } : z.schnitt == null ? { erlaubt: false, grund: 'keine Prüfsteine' } : z.schnitt < 6.5 ? { erlaubt: false, grund: `Schnitt ${zahl(z.schnitt)} unter 6,5` } : !beirat && (z.ps?.p4?.wert ?? 0) < 7 ? { erlaubt: false, grund: `Hebel ${z.ps?.p4?.wert} unter 7` } : { erlaubt: true, grund: `Schnitt ${zahl(z.schnitt)}${beirat ? '' : `, Hebel ${z.ps.p4.wert}`}` };
// Pitch-Unterlagen, die alle Mitglieder lesen: Feld „unterlagen“ (Pfad relativ zum Repo oder absolut), sonst sessions/<id>.unterlagen.md
const UNTERLAGEN = s.unterlagen ? path.resolve(root, s.unterlagen) : fs.existsSync(path.join(root, 'sessions', id + '.unterlagen.md')) ? path.join(root, 'sessions', id + '.unterlagen.md') : null;
if (s.unterlagen && !fs.existsSync(UNTERLAGEN)) { console.error('Unterlagen fehlen: ' + UNTERLAGEN); process.exit(1); }
// Bewertung: Post-Money = Betrag ÷ Anteil, Pre-Money = Post − Betrag; Abschlag eines Angebots gegen die Forderung
const bewertung = a => a?.anteil > 0 && a?.betrag > 0 ? { post: Math.round(a.betrag / a.anteil * 100), pre: Math.round(a.betrag / a.anteil * 100 - a.betrag) } : null;
const FB = bewertung(s.pitch.forderung);
const abschlag = a => { const b = bewertung(a); return b && FB ? Math.round((1 - b.post / FB.post) * 100) : null; };
// Der Pitch-Text darf keine andere Forderung nennen als pitch.forderung, sonst rechnen die Mitglieder mit zwei Zahlen
const imText = [...(s.pitch.text ?? '').matchAll(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*(?:Euro|€|EUR)\s+für\s+(\d+(?:,\d+)?)\s*(?:Prozent|%)/gi)].map(m => ({ betrag: Number(m[1].replace(/[.\s]/g, '')), anteil: Number(m[2].replace(',', '.')) }));
const fw = s.pitch.forderung;
const widerspruch = imText.find(t => !fw || t.betrag !== fw.betrag || t.anteil !== fw.anteil);
if (widerspruch && cmd === 'auftrag') { console.error(`Pitch-Text nennt ${euro(widerspruch.betrag)} für ${String(widerspruch.anteil).replace('.', ',')} %, pitch.forderung sagt ${fw ? `${euro(fw.betrag)} für ${fw.anteil} %` : 'keine'}. Erst angleichen.`); process.exit(1); }
// Optionen (Varianten des Vorhabens, eine davon „lassen“ oder „weiter wie bisher“): jedes Mitglied bewertet jede 0–10
const OPT = s.optionen ?? [];
const optText = () => OPT.map(o => `${o.id}) ${o.text}`).join('\n');
function normOpt(o = {}) { const out = {}; for (const x of OPT) if (o[x.id] != null) out[x.id] = Math.max(0, Math.min(10, Number(o[x.id]))); return out; }
const optZeile = o => o && Object.keys(o).length ? OPT.map(x => `${x.id} ${o[x.id] ?? '–'}`).join(' · ') : '';
const optStand = slug => { let o = {}; for (const b of s.beitraege) if (b.sprecher === slug && b.optionen) o = { ...o, ...b.optionen }; return o; };
const psZeile = (ps, sn, ko) => ps ? `P1 ${ps.p1?.wert} · P2 ${ps.p2?.wert} · P3 ${ps.p3?.wert} · P4 ${ps.p4?.wert} · Schnitt ${zahl(sn)}${ko ? ' · K.O.: ' + ko : ''}` : '';
function verlaufZeile(b) {
  const h = b.haltung ? ` (${b.haltung.status}${b.schnitt != null ? ' ' + zahl(b.schnitt) : ''})` : '';
  const ang = b.angebot && b.haltung?.status !== 'raus' ? ` [${b.angebot.betrag == null ? 'Ja, wenn' : `Angebot ${euro(b.angebot.betrag)} für ${b.angebot.anteil} %`}: ${(b.angebot.bedingungen ?? []).join('; ')}]` : '';
  const ps = b.pruefsteine ? ` {${psZeile(b.pruefsteine, b.schnitt, b.ko)}${b.optionen ? ` · Optionen ${optZeile(b.optionen)}` : ''}}` : '';
  fs.appendFileSync(verlauf, `[${b.phase}] ${name(b.sprecher)} → ${b.an ? name(b.an) : 'alle'}: ${b.text}${ang}${h}${ps}\n`);
}
function live(phase, txt) { if (s.live) { s.live_phase = phase; s.live_status = txt; } }

// Aufträge
// Rahmen der Rolle: aus der Sitzung (Feld rahmen), sonst neutral nach Format
const ROLLE = s.rahmen ?? (beirat ? 'im Rat „Generalprobe“, einer KI-Simulation' : 'in einer Investoren-Runde, einer KI-Simulation');
const AUFGABE = {
  eindruck: 'Bewerte das Vorhaben nach deinen vier Prüfsteinen (Urteilsregeln 1–5): je Prüfstein Wert, Herkunft und Grund, dazu K.O. und Schnitt. Dann dein erster Eindruck im eigenen Ton (text, 2–4 Sätze, direkt mit deinem stärksten Punkt) und zwei Fragen an die Gründer, die deine schwächsten Prüfsteine klären würden.',
  schlagabtausch: 'Lies im Verlauf die KERNFRAGEN und alle Beiträge davor. Widersprich genau einem anderen Mitglied in 2–3 Sätzen, ohne seinen Namen im Text zu nennen, und bring einen Punkt, den in dieser Runde noch keiner gebracht hat. Gestehe den stärksten Punkt der Gegenseite zu oder sag, warum er nicht trägt. Ändere Prüfsteine nur für ein besseres Argument oder einen neuen Fakt aus dem Kreuzverhör, und gib nur die geänderten an.',
  angebote: beirat ? 'Stimme nach der Entscheidungsregel (Urteilsregeln 6) mit deinem aktuellen Stand ab: „ja_wenn“ mit prüfbaren Bedingungen oder „nein“ mit 1–2 Sätzen im eigenen Ton.'
    : 'Entscheide nach der Entscheidungsregel (Urteilsregeln 6) mit deinem aktuellen Stand. Beim Ausstieg 1–2 Sätze im eigenen Ton mit deiner Absage-Formel. Ein Angebot nennt Betrag, Anteil und Bedingungen im Stil von „Wenn ich biete“ aus deinem Dossier; du darfst ein anderes Mitglied als Partner vorschlagen (mit).',
  verhandlung: 'Die Gründer antworten auf dein Angebot (letzte Zeilen im Verlauf). Entscheide: annehmen, ablehnen oder nachbessern. Beim Nachbessern das vollständige Angebot mit allen Bedingungen neu nennen.',
};
const PS = '{"wert": 0, "herkunft": "pitch|annahme|fehlt", "grund": "≤ 15 Wörter"}';
const FORMAT = {
  eindruck: `{"pruefsteine": {"p1": ${PS}, "p2": …, "p3": …, "p4": …}, "ko": null oder "welches K.O., mit Beleg aus dem Pitch", "schnitt": 0.0, "sicherheit": 1, "text": "…", "fragen": ["…", "…"], "meinung_aendert": "ein konkreter Fakt oder eine Zahl", "kernpunkt": "≤ 12 Wörter"}`,
  schlagabtausch: `{"an": "<slug>", "text": "…", "zugestaendnis": "1 Satz", "pruefsteine": {"p2": ${PS}}, "bewegt": "nein" oder "P2 von 4 auf 6, weil …", "bedingungen": ["prüfbar: Zahl, Datum oder Test"], "kernpunkt": "≤ 12 Wörter"}`,
  angebote: beirat ? '{"entscheidung": "nein|ja_wenn", "regel": "z. B. Schnitt 5,4 unter 6,5", "text": "…", "bedingungen": ["prüfbar"]}'
    : '{"entscheidung": "raus|angebot", "regel": "z. B. Schnitt 5,4 unter 6,5", "text": "…", "angebot": {"betrag": 0, "anteil": 0, "bedingungen": ["…"], "mit": []}}',
  verhandlung: '{"entscheidung": "angenommen|abgelehnt|neues_angebot", "text": "…", "angebot": {"betrag": 0, "anteil": 0, "bedingungen": ["…"]}}',
};
const antwortPfad = (runde, slug) => path.join(root, 'sessions', id, 'antwort', `${runde}-${slug}.json`);

if (cmd === 'auftrag') {
  const runde = a3; if (!AUFGABE[runde]) throw new Error('Runde unbekannt: ' + runde);
  const zusatz = arg('zusatz') ? JSON.parse(fs.readFileSync(arg('zusatz'), 'utf8')) : {};
  const ziel = path.join(root, 'sessions', id, 'auftrag'); fs.mkdirSync(ziel, { recursive: true }); fs.mkdirSync(path.join(root, 'sessions', id, 'antwort'), { recursive: true });
  if (!fs.existsSync(verlauf)) fs.writeFileSync(verlauf, `VORHABEN:\n${s.pitch.text}\n\nVERLAUF:\n`);
  s.lauf ??= {}; s.lauf.start ??= new Date().toISOString();
  const f = s.pitch.forderung;
  for (const slug of slugs(a4)) {
    const d = dossier(slug), z = stand(slug), p = antwortPfad(runde, slug);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    const andere = panel.filter(x => x !== slug).map(x => `${x} = ${dossier(x).name}, ${dossier(x).etikett}`).join('; ');
    const txt = `Du bist ${d.name} (${d.etikett}) ${ROLLE}.
Lies in dieser Reihenfolge:
1. Urteilsregeln (wie du rechnest und entscheidest): ${path.join(root, 'skill/urteilsregeln.md')}
2. Dein Dossier (dein Gedächtnis, zuerst „So entscheide ich“): ${d.pfad}
${UNTERLAGEN ? `3. Die Pitch-Unterlagen, vollständig, bevor du urteilst: ${UNTERLAGEN}
4.` : '3.'} Den Verlauf dieser Sitzung: ${verlauf}
Deine Leitfrage, die nur du stellst: „${d.leitfrage}“

Regeln:
- Ich-Form, Deutsch, Anrede wie im Dossier. Texte 2–4 Sätze, nicht mit Lob einsteigen.
- Keine erfundenen Fakten über dich oder das Vorhaben. Was fehlt, wertest du nach den Urteilsregeln.
- Hart in der Sache, nie beleidigend. Wörtlich nur Wendungen aus „Belegte Wendungen“, höchstens eine pro Sitzung.
- Dein Text muss zu deinen Zahlen passen.${UNTERLAGEN ? `
- Was in den Unterlagen steht, hat die Herkunft „pitch“. Kosten, Marge und Reichweite rechnest du nur mit der Kostenstruktur aus den Unterlagen, Gehälter eingeschlossen (Urteilsregeln 12).` : `
- Es gibt keine Pitch-Unterlagen. Rechne Kosten, Marge oder Reichweite nicht selbst aus; schreib „Kosten fehlen“ (Urteilsregeln 12).`}

Vorhaben:
${s.pitch.text}${OPT.length ? `\n\nOptionen, über die entschieden wird:\n${optText()}` : ''}
${f && FB ? `Forderung: ${euro(f.betrag)} für ${f.anteil} % (Bewertung: ${euro(FB.pre)} vor, ${euro(FB.post)} nach dem Investment)\n` : f ? `Forderung: ${euro(f.betrag)} ohne Anteil\n` : !beirat && s.pitch.forderung === null ? 'Forderung: keine, die Gründer suchen keine Beteiligung (Urteilsregeln 3).\n' : ''}
Mitspieler: ${andere}
${z.ps ? `\nDein aktueller Stand: ${psZeile(z.ps, z.schnitt, z.ko)}${OPT.length ? ` · Optionen ${optZeile(optStand(slug))}` : ''}\n` : ''}
Runde: ${runde}
Aufgabe: ${AUFGABE[runde]}${OPT.length && runde !== 'verhandlung' ? `\nOptionen: Bewerte jede Option 0–10 danach, wie stark du sie aus deiner Leitfrage unterstützt (Urteilsregeln 10)${runde === 'eindruck' ? ', und nenne deine Empfehlung' : ', alle Optionen, auch unverändert'}.` : ''}${zusatz[slug] ? `\nZusatz: ${zusatz[slug]}` : ''}

Antwort: nur ein JSON-Objekt im Format unten, ohne Codeblock und ohne Vorrede.
Format: ${FORMAT[runde]}${OPT.length && runde !== 'verhandlung' ? `\nZusätzlich im selben Objekt: "optionen": {${OPT.map(o => `"${o.id}": 0`).join(', ')}}${runde === 'eindruck' ? ', "empfehlung": "<Option>"' : ''}` : ''}
`;
    const af = path.join(ziel, `${runde}-${slug}.md`); fs.writeFileSync(af, txt);
    console.log(`Rat: ${d.name} · ${runde}\t${af}`);
  }
  live(runde, runde === 'eindruck' ? 'Die Runde liest Dossier, Regeln und Vorhaben' : runde === 'angebote' ? 'Die Runde entscheidet: aussteigen oder Angebot' : `${slugs(a4).map(x => dossier(x).name).join(', ')} denkt nach`);
  speichern(); pruefen();
  console.log(`\nJe Agent: description genau wie oben vor dem Tab, subagent_type ratsmitglied, Prompt: Lies deinen Auftrag in <Pfad> und befolge ihn genau.`);
}

else if (cmd === 'sammeln') {
  const runde = a3; let fehler = 0; const zus = [];
  for (const slug of slugs(a4)) {
    const p = antwortPfad(runde, slug);
    let a; try { a = holen(p, `Rat: ${name(slug)} · ${runde}`); } catch (e) { console.log(`✗ ${slug}: kein gültiges JSON (${e.message})`); fehler++; continue; }
    if (!a) { console.log(`✗ ${slug}: keine Antwort (weder Datei noch Agent „Rat: ${name(slug)} · ${runde}“)`); fehler++; continue; }
    let b;
    if (runde === 'eindruck') {
      const { out, korr } = normPS(a.pruefsteine); const sn = schnitt(out);
      if (sn == null) { console.log(`✗ ${slug}: Prüfsteine unvollständig`); fehler++; continue; }
      b = { phase: 'eindruck', sprecher: slug, an: null, text: a.text, haltung: { status: status(a.ko, sn), wert: sn }, kernpunkt: a.kernpunkt, pruefsteine: out, ko: a.ko || null, schnitt: sn, sicherheit: a.sicherheit, meinung_aendert: a.meinung_aendert, ...(korr.length ? { korrigiert: korr } : {}) };
      if (OPT.length) { b.optionen = normOpt(a.optionen); b.empfehlung = a.empfehlung; }
      (s.offene_fragen ??= {})[slug] = a.fragen ?? [];
      zus.push(`${name(slug)}: ${psZeile(out, sn, b.ko)}${OPT.length ? ` · Optionen ${optZeile(b.optionen)}, Empfehlung ${a.empfehlung}` : ''} · Sicherheit ${a.sicherheit}${korr.length ? ' · gedeckelt: ' + korr.join(', ') : ''}${Math.abs((a.schnitt ?? sn) - sn) > 0.15 ? ` · eigener Schnitt ${a.schnitt} nachgerechnet` : ''}\n   Kern: ${a.kernpunkt}\n   Fragen: ${(a.fragen ?? []).join(' | ')}`);
    } else if (runde === 'schlagabtausch') {
      const z = stand(slug), { out, korr } = normPS(a.pruefsteine ?? {}); const ps = { ...(z.ps ?? {}), ...out }, sn = schnitt(ps) ?? z.schnitt;
      if (!panel.includes(a.an) || a.an === slug) { console.log(`✗ ${slug}: „an“ muss ein anderes Panel-Mitglied sein`); fehler++; continue; }
      b = { phase: 'schlagabtausch', sprecher: slug, an: a.an, text: a.text, haltung: { status: status(z.ko, sn), wert: sn }, kernpunkt: a.kernpunkt, zugestaendnis: a.zugestaendnis, bewegt: a.bewegt, bedingungen: a.bedingungen ?? [], pruefsteine: ps, ko: z.ko, schnitt: sn, ...(korr.length ? { korrigiert: korr } : {}) };
      if (OPT.length && a.optionen) b.optionen = { ...optStand(slug), ...normOpt(a.optionen) };
      zus.push(`${name(slug)} → ${name(a.an)}: ${a.kernpunkt} · bewegt: ${a.bewegt} · ${psZeile(ps, sn, z.ko)}${b.optionen ? ` · Optionen ${optZeile(b.optionen)}` : ''}`);
    } else if (runde === 'angebote') {
      const z = stand(slug), r = regel(z), ja = ['angebot', 'ja_wenn'].includes(a.entscheidung);
      if (ja && !r.erlaubt && !process.argv.includes('--erlauben')) { console.log(`✗ ${slug}: Regelverstoß, bietet trotz „${r.grund}“. Zurückschicken oder mit --erlauben übernehmen.`); fehler++; continue; }
      b = { phase: 'angebote', sprecher: slug, text: a.text, regel: a.regel || r.grund, haltung: { status: ja ? 'angebot' : 'raus' }, ...(ja ? { angebot: beirat ? { betrag: null, anteil: null, bedingungen: a.bedingungen ?? [] } : { mit: [], ...a.angebot } } : {}), ...(ja && !r.erlaubt ? { regel_ok: false } : {}) };
      if (OPT.length && a.optionen) b.optionen = { ...optStand(slug), ...normOpt(a.optionen) };
      if (ja && !beirat && bewertung(a.angebot)) b.bewertung = { ...bewertung(a.angebot), abschlag: abschlag(a.angebot) };
      zus.push(`${name(slug)}: ${ja ? (beirat ? 'Ja, wenn …' : `Angebot ${euro(a.angebot.betrag)} für ${a.angebot.anteil} %${b.bewertung ? ` (Bewertung ${euro(b.bewertung.post)}${b.bewertung.abschlag != null ? `, Abschlag ${b.bewertung.abschlag} %` : ''})` : ''}`) : 'raus'} (${b.regel})${b.optionen ? ` · Optionen ${optZeile(b.optionen)}` : ''}`);
    } else if (runde === 'verhandlung') {
      b = { phase: 'verhandlung', sprecher: slug, an: 'gruender', text: a.text, entscheidung: a.entscheidung, haltung: { status: a.entscheidung === 'abgelehnt' ? 'raus' : 'angebot' }, ...(a.angebot && a.entscheidung !== 'abgelehnt' ? { angebot: a.angebot, ...(bewertung(a.angebot) ? { bewertung: { ...bewertung(a.angebot), abschlag: abschlag(a.angebot) } } : {}) } : {}) };
      zus.push(`${name(slug)}: ${a.entscheidung}${a.angebot ? ` (${euro(a.angebot.betrag)} für ${a.angebot.anteil} %)` : ''}`);
    }
    s.beitraege.push(b); verlaufZeile(b);
  }
  if (runde === 'eindruck') {
    const e = s.beitraege.filter(b => b.phase === 'eindruck'), w = e.map(b => b.schnitt);
    if (e.length > 1 && Math.max(...w) - Math.min(...w) <= 1 && new Set(e.map(b => b.haltung.status)).size === 1)
      zus.push(`\nEINIGKEIT (Spanne ${zahl(Math.round((Math.max(...w) - Math.min(...w)) * 10) / 10)}): Die stärkste unbesprochene Gegenposition als Kernfrage setzen und dem Mitglied zuweisen, dessen Prüfsteine am meisten dafür hergeben.`);
  }
  live(runde, 'Die Moderation sammelt und ordnet');
  speichern(); pruefen();
  console.log(zus.join('\n')); if (fehler) process.exit(2);
}

else if (cmd === 'beitrag') {
  const neu = JSON.parse(a3); for (const b of [].concat(neu)) { s.beitraege.push(b); verlaufZeile(b); }
  if (arg('live')) live(arg('live'), process.argv[process.argv.indexOf('--live') + 2]);
  speichern(); pruefen();
}

else if (cmd === 'kernfragen') {
  s.kernfragen = JSON.parse(a3);
  fs.appendFileSync(verlauf, `\nKERNFRAGEN (Moderation):\n${s.kernfragen.map((k, i) => `${i + 1}. ${k.frage} — ${k.seiten.map(x => `${x.position}: ${x.mitglieder.map(name).join(', ')}`).join(' / ')}${k.auftrag ? ` (${k.auftrag})` : ''}`).join('\n')}\n\n`);
  speichern(); console.log('Kernfragen im Verlauf.');
}

else if (cmd === 'live') { live(a3, a4); speichern(); pruefen(); }

else if (cmd === 'urteil') { Object.assign(s.urteil ??= {}, JSON.parse(fs.readFileSync(a3, 'utf8'))); speichern(); console.log('Urteil übernommen.'); }

else if (cmd === 'ende') {
  // Wertung: gewichteter Schnitt der letzten Stände (Gewicht aus panel[].gewicht, sonst 1), Spanne, Bewegung je Mitglied
  const je = {}; let summe = 0, gew = 0; const ende = [];
  for (const p of s.panel) {
    const mit = s.beitraege.filter(b => b.sprecher === p.slug && b.schnitt != null); if (!mit.length) continue;
    const start = mit[0].schnitt, schluss = mit.at(-1).schnitt, g = p.gewicht ?? 1;
    je[p.slug] = { gewicht: g, start, ende: schluss, ko: mit.at(-1).ko ?? null, sicherheit: mit[0].sicherheit ?? null, entscheidung: s.beitraege.filter(b => b.sprecher === p.slug && ['angebote', 'verhandlung'].includes(b.phase)).at(-1)?.haltung?.status ?? null };
    summe += g * schluss; gew += g; ende.push(schluss);
  }
  if (gew) {
    s.urteil ??= {};
    const sich = Object.values(je).map(x => x.sicherheit).filter(Number.isFinite);
    s.urteil.wertung = { punktwert: Math.round(summe / gew * 10) / 10, spanne: Math.round((Math.max(...ende) - Math.min(...ende)) * 10) / 10, sicherheit: sich.length ? Math.round(sich.reduce((x, y) => x + y, 0) / sich.length * 10) / 10 : null, je };
  }
  // Optionen: gewichteter Schnitt je Option aus dem letzten Stand jedes Mitglieds; Stufe nach den Bändern des Roast Room
  if (OPT.length && gew) {
    const werte = {};
    for (const o of OPT) { let su = 0, g = 0; const einzel = []; for (const p of s.panel) { const v = optStand(p.slug)[o.id]; if (v == null) continue; su += (p.gewicht ?? 1) * v; g += p.gewicht ?? 1; einzel.push(v); } if (g) werte[o.id] = { schnitt: Math.round(su / g * 10) / 10, spanne: Math.max(...einzel) - Math.min(...einzel) }; }
    const beste = Object.entries(werte).sort((a, b) => b[1].schnitt - a[1].schnitt)[0];
    const nicht = OPT.find(o => o.nicht)?.id;
    const band = v => v >= 7.5 ? 'los' : v >= 6 ? 'los_mit_bedingungen' : v >= 4.5 ? 'umbauen' : 'lassen';
    s.urteil.wertung.optionen = werte; s.urteil.wertung.beste = beste?.[0];
    if (!s.urteil.stufe) s.urteil.stufe = beste?.[0] === nicht ? 'lassen' : band(beste?.[1].schnitt ?? 0);
  } else if (gew && !s.urteil.stufe) {
    const v = s.urteil.wertung.punktwert; s.urteil.stufe = v >= 7.5 ? 'los' : v >= 6 ? 'los_mit_bedingungen' : v >= 4.5 ? 'umbauen' : 'lassen';
  }
  // Bewertungs-Check: letzte Angebote je Mitglied gegen die eigene Bewertung
  if (FB) {
    const letzte = {};
    for (const b of s.beitraege) if (['angebote', 'verhandlung'].includes(b.phase) && panel.includes(b.sprecher)) letzte[b.sprecher] = b.haltung?.status === 'angebot' && bewertung(b.angebot) ? b : null;
    const ang = Object.entries(letzte).filter(([, b]) => b).map(([slug, b]) => ({ slug, betrag: b.angebot.betrag, anteil: b.angebot.anteil, ...bewertung(b.angebot), abschlag: abschlag(b.angebot) }));
    s.urteil ??= {};
    s.urteil.bewertung = { forderung: FB, angebote: ang, ...(ang.length ? { min: Math.min(...ang.map(x => x.post)), max: Math.max(...ang.map(x => x.post)) } : {}) };
  }
  for (const k of ['live', 'live_phase', 'live_status']) delete s[k];
  s.lauf ??= {}; s.lauf.ende = new Date().toISOString();
  speichern();
  for (const [skript, args] of [['kosten.mjs', [id, '--schreiben']], ['zitate.mjs', [id]]]) {
    try { console.log(execFileSync('node', [path.join(root, 'scripts', skript), ...args], { encoding: 'utf8' }).trim()); } catch (e) { console.log(String(e.stdout || e.message).trim()); }
  }
  pruefen();
  if (s.urteil?.bewertung) { const bw = s.urteil.bewertung; console.log(`Bewertung: deine ${euro(bw.forderung.post)} (vor dem Investment ${euro(bw.forderung.pre)}), ${bw.angebote.length ? `Angebote ${euro(bw.min)}–${euro(bw.max)}, Abschlag ${Math.min(...bw.angebote.map(x => x.abschlag))}–${Math.max(...bw.angebote.map(x => x.abschlag))} %` : 'kein Angebot mit Anteil'}`); }
  if (s.urteil?.wertung) console.log(`Wertung: Punktwert ${zahl(s.urteil.wertung.punktwert)} · Spanne ${zahl(s.urteil.wertung.spanne)} · Sicherheit ${zahl(s.urteil.wertung.sicherheit)} · Stufe ${s.urteil.stufe}${s.urteil.wertung.optionen ? ` · Optionen ${Object.entries(s.urteil.wertung.optionen).map(([k, v]) => `${k} ${zahl(v.schnitt)}`).join(', ')} · beste ${s.urteil.wertung.beste}` : ''}`);
}
else if (cmd === 'zeit') {
  s.check ??= { preis: 490, stundensatz: 162.5, minuten: {} };
  if (arg('preis')) s.check.preis = Number(arg('preis')); if (arg('stundensatz')) s.check.stundensatz = Number(arg('stundensatz'));
  s.check.minuten[a3] = Number(a4); speichern(); pruefen();
  const min = Object.values(s.check.minuten).reduce((x, y) => x + y, 0), arbeit = min / 60 * s.check.stundensatz, modell = (s.kosten?.usd?.gesamt ?? 0) * 0.92;
  console.log(`Arbeitszeit ${min} min = ${euro(Math.round(arbeit))} · Modellkosten rund ${euro(Math.round(modell))} · Deckungsbeitrag ${Math.round((1 - (arbeit + modell) / s.check.preis) * 100)} % bei ${euro(s.check.preis)}`);
}
else { console.error('Unbekannter Befehl: ' + cmd); process.exit(1); }
