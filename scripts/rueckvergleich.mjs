// Rückvergleich: Wie oft entscheidet der simulierte Rat wie das Original?
//   node scripts/rueckvergleich.mjs                      Standardlauf: faelle.json + simulation.json → bericht.*, Kopfleiste der Ansicht
//   node scripts/rueckvergleich.mjs auftrag <lauf> --art rat|alt|einzel [--faelle faelle.json,faelle-holdout.json]
//   node scripts/rueckvergleich.mjs sammeln <lauf>       Antworten der Agenten holen (Beschreibung „Rat: <Name> · rv-<lauf>“)
//   node scripts/rueckvergleich.mjs auswerten <lauf>     bericht.md/json im Laufordner
//   node scripts/rueckvergleich.mjs vergleich <lauf>,…   eine Zeile je Lauf
// Arten: rat = Dossiers mit „So entscheide ich“ und Urteilsregeln, Regel wird durchgesetzt; alt = Dossiers ohne diesen
// Abschnitt und ohne Regeln (Stand vor dem 14.10.2026 abends); einzel = ein Prompt ohne Rollen und ohne Dossiers.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { holen } from './agentantwort.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'sessions/rueckvergleich');
const [cmd, lauf] = process.argv.slice(2);
const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
const ja = e => ['angebot', 'ja'].includes(String(e).toLowerCase());
const gleich = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '–';
const front = t => Object.fromEntries((t.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').split('\n').map(z => z.match(/^([a-z_0-9]+):\s*(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^["“„]|["”“]$/g, '')]));
const dossier = slug => { for (const d of fs.readdirSync(path.join(root, 'skill'), { withFileTypes: true })) { const f = path.join(root, 'skill', d.name, slug + '.md'); if (d.isDirectory() && fs.existsSync(f)) { const t = fs.readFileSync(f, 'utf8'); return { pfad: f, text: t, ...front(t) }; } } throw new Error('Dossier fehlt: ' + slug); };
const ladeFaelle = liste => liste.flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const blind = f => ({ firma: f.firma, produkt: f.produkt, gruender: f.gruender, forderung: f.forderung, stand: f.stand });

function bewerte(faelle, sim) {
  const je = {}, details = []; let ent = 0, entRichtig = 0, erg = 0, ergRichtig = 0, basisEnt = 0, basisErg = 0, simAng = 0, echtAng = 0;
  for (const fall of faelle) {
    const echt = fall.entscheidungen ?? {}, zeile = { firma: fall.firma ?? fall.vorhaben, mitglieder: {} }, simJa = [];
    for (const slug of fall.mitglieder ?? []) {
      const s = (sim[slug] ?? []).find(x => gleich(x.firma, zeile.firma)); if (!s) continue;
      simJa.push(ja(s.entscheidung));
      const e = typeof echt[slug] === 'object' ? echt[slug]?.entscheidung : echt[slug];
      zeile.mitglieder[slug] = { simulation: s.entscheidung, original: e ?? 'unbekannt' };
      if (e && !/unklar|unbekannt/i.test(e)) {
        const ok = ja(s.entscheidung) === ja(e);
        ent++; entRichtig += ok; basisEnt += !ja(e); simAng += ja(s.entscheidung); echtAng += ja(e);
        (je[slug] ??= { richtig: 0, gesamt: 0 }); je[slug].gesamt++; je[slug].richtig += ok; zeile.mitglieder[slug].richtig = ok;
      }
    }
    if (!simJa.length) continue;
    const beirat = !fall.forderung;
    const simPositiv = beirat ? simJa.filter(Boolean).length > simJa.length / 2 : simJa.some(Boolean);
    const echtWerte = Object.values(echt).map(v => typeof v === 'object' ? v?.entscheidung : v).filter(v => v && !/unklar|unbekannt/i.test(v));
    const echtPositiv = !beirat && echtWerte.length ? echtWerte.some(ja) : ['deal', 'go'].includes(String(fall.ergebnis?.typ ?? fall.ergebnis).toLowerCase());
    erg++; ergRichtig += simPositiv === echtPositiv; basisErg += !echtPositiv;
    Object.assign(zeile, { simulation: simPositiv ? (beirat ? 'Go' : 'mind. ein Angebot') : (beirat ? 'No-Go' : 'alle raus'), original: echtPositiv ? (beirat ? 'Go' : 'mind. ein Angebot') : (beirat ? 'No-Go' : 'alle raus'), richtig: simPositiv === echtPositiv });
    details.push(zeile);
  }
  return { stand: new Date().toISOString().slice(0, 10), faelle: erg, ergebnis_richtig: ergRichtig, entscheidungen: ent, entscheidungen_richtig: entRichtig, basis_ergebnis: basisErg, basis_entscheidungen: basisEnt, angebote_simulation: simAng, angebote_original: echtAng, mitglieder: Object.keys(sim), je_mitglied: je, details };
}
const bericht2md = (b, titel, quelle) => [`# ${titel} (${b.stand})`, '',
  `> KI-Simulation gegen echte Entscheidungen. Fälle aus ${quelle}, keiner davon steht in einem Dossier.`, '',
  `- **Ausgang je Fall:** ${b.ergebnis_richtig} von ${b.faelle} richtig (${pct(b.ergebnis_richtig, b.faelle)})`,
  `- **Einzelentscheidungen:** ${b.entscheidungen_richtig} von ${b.entscheidungen} wie im Original (${pct(b.entscheidungen_richtig, b.entscheidungen)})`,
  `- **Angebote:** Simulation ${b.angebote_simulation}, Original ${b.angebote_original}`,
  `- **Zum Vergleich, Regel „immer Nein“:** Fälle ${b.basis_ergebnis} von ${b.faelle} (${pct(b.basis_ergebnis, b.faelle)}), Einzelentscheidungen ${b.basis_entscheidungen} von ${b.entscheidungen} (${pct(b.basis_entscheidungen, b.entscheidungen)}). Erst wenn der Rat darüber liegt, sagt er mehr als die einfachste Regel.`,
  ...(b.regel_ueberstimmt != null ? [`- **Regel durchgesetzt:** ${b.regel_ueberstimmt} Angebote der Agenten verstießen gegen die Entscheidungsregel und zählen als Ausstieg.`] : []), '',
  '| Mitglied | richtig | gesamt |', '|---|---|---|', ...Object.entries(b.je_mitglied).map(([s, v]) => `| ${s} | ${v.richtig} | ${v.gesamt} |`), '',
  '| Fall | Simulation | Original | richtig |', '|---|---|---|---|', ...b.details.map(d => `| ${d.firma} | ${d.simulation} | ${d.original} | ${d.richtig ? 'ja' : 'nein'} |`), ''].join('\n');

// Prüfsteine nachrechnen und Entscheidungsregel durchsetzen (wie scripts/runde.mjs)
const DECKEL = { fehlt: 4, annahme: 6, pitch: 10 };
function regelEntscheid(e, beirat) {
  const ps = e.pruefsteine ?? {}, w = k => Math.min(Number(ps[k]?.wert ?? 0), DECKEL[ps[k]?.herkunft] ?? 6);
  const sn = Math.round((2 * w('p1') + w('p2') + w('p3') + w('p4')) / 5 * 10) / 10;
  const erlaubt = !e.ko && sn >= 6.5 && (beirat || w('p4') >= 7);
  const final = ja(e.entscheidung) && erlaubt ? (beirat ? 'ja' : 'angebot') : (beirat ? 'nein' : 'raus');
  return { schnitt: sn, erlaubt, final, ueberstimmt: ja(e.entscheidung) && !erlaubt };
}

const LD = l => path.join(dir, l);
if (!cmd) {
  const b = bewerte(ladeFaelle(['faelle.json']), JSON.parse(fs.readFileSync(path.join(dir, 'simulation.json'), 'utf8')));
  fs.writeFileSync(path.join(dir, 'bericht.json'), JSON.stringify(b, null, 2) + '\n');
  const md = bericht2md(b, 'Rückvergleich', '`faelle.json`'); fs.writeFileSync(path.join(dir, 'bericht.md'), md);
  fs.writeFileSync(path.join(root, 'viewer/rueckvergleich.js'), `window.LR_RUECKVERGLEICH = ${JSON.stringify({ stand: b.stand, faelle: b.faelle, ergebnis_richtig: b.ergebnis_richtig, entscheidungen: b.entscheidungen, entscheidungen_richtig: b.entscheidungen_richtig, basis_entscheidungen: b.basis_entscheidungen, mitglieder: b.mitglieder })};\n`);
  console.log(md);
}
else if (cmd === 'auftrag') {
  const art = arg('art'), faelleListe = (arg('faelle') ?? 'faelle.json').split(','), faelle = ladeFaelle(faelleListe);
  fs.mkdirSync(path.join(LD(lauf), 'auftrag'), { recursive: true });
  // Beirat: eigene frühere Entscheidungen ohne Forderung (ja/nein statt Angebot)
  const beirat = faelle.every(f => !f.forderung);
  fs.writeFileSync(path.join(LD(lauf), 'lauf.json'), JSON.stringify({ art, beirat, faelle: faelleListe, erstellt: new Date().toISOString() }, null, 1) + '\n');
  const slugs = [...new Set(faelle.flatMap(f => f.mitglieder ?? []))].sort();
  const namen = Object.fromEntries(slugs.map(s => [s, dossier(s).name]));
  const AUSGANG = 'Der Ausgang ist unbekannt. Nutze nur die Angaben im Fall und die genannten Dateien, such nicht nach dem Ausgang. Entscheide jeden Fall für sich.';
  const ENT = beirat ? '"entscheidung": "ja|nein"' : '"entscheidung": "raus|angebot", "betrag": 0, "anteil": 0';
  const FORMAT_ALT = `{"entscheidungen": [{"firma": "…", ${ENT}, "begruendung": "1 Satz"}]}`;
  const FORMAT_RAT = `{"entscheidungen": [{"firma": "…", "pruefsteine": {"p1": {"wert": 0, "herkunft": "pitch|annahme|fehlt", "grund": "≤ 12 Wörter"}, "p2": …, "p3": …, "p4": …}, "ko": null, "schnitt": 0.0, ${ENT}, "regel": "…", "begruendung": "1 Satz"}]}`;
  if (art === 'einzel') {
    const f = path.join(LD(lauf), 'auftrag', 'einzel.md');
    fs.writeFileSync(f, `Dieser Auftrag ist eine Vergleichsmessung ohne Rolle: Lies keine Urteilsregeln und kein Dossier, nur diese Datei.

Du bist Analyst. Unten stehen echte Pitches aus einer TV-Investorenshow. Sag für jeden Fall voraus, welche der anwesenden Investoren aussteigen und welche ein Angebot machen. Nutze die Angaben im Fall und dein Allgemeinwissen über die Personen. ${AUSGANG}

Investoren: ${slugs.map(s => `${s} = ${namen[s]}`).join('; ')}

Fälle (JSON):
${JSON.stringify(faelle.map(x => ({ ...blind(x), anwesend: x.mitglieder })), null, 1)}

Antwort: nur ein JSON-Objekt, ohne Codeblock und ohne Vorrede.
Format: {"faelle": [{"firma": "…", "entscheidungen": {"<slug>": "raus|angebot"}}]}
`);
    console.log(`Rat: Einzel-Prompt · rv-${lauf}\t${f}`);
  } else {
    if (art === 'alt') fs.mkdirSync(path.join(LD(lauf), 'dossiers'), { recursive: true });
    for (const slug of slugs) {
      const d = dossier(slug), meine = faelle.filter(x => (x.mitglieder ?? []).includes(slug)).map(blind);
      let pfad = d.pfad;
      if (art === 'alt') { pfad = path.join(LD(lauf), 'dossiers', slug + '.md'); fs.writeFileSync(pfad, d.text.replace(/## So entscheide ich[\s\S]*?(?=## Quellen)/, '')); }
      const f = path.join(LD(lauf), 'auftrag', slug + '.md');
      fs.writeFileSync(f, `Du bist ${d.name} (${d.etikett}), Mitglied eines KI-Rats, der ${beirat ? 'frühere Entscheidungen' : 'echte Pitches einer Investorenshow'} blind nachentscheidet (Simulation).
${art === 'rat' ? `Lies zuerst die Urteilsregeln: ${path.join(root, 'skill/urteilsregeln.md')}\nDann dein Dossier, zuerst „So entscheide ich“: ${pfad}` : `Lies zuerst dein Dossier: ${pfad}\nEs ist dein Gedächtnis: Urteile nach deinen dort belegten Kriterien, roten Flaggen und Denkmustern.`}
Deine Leitfrage: „${d.leitfrage}“

Rückvergleich, blind: Unten stehen ${meine.length} echte ${beirat ? 'Vorhaben' : 'Pitches, bei denen du in der Sendung saßt'}. ${AUSGANG}${art === 'rat' ? ' Bewerte jeden Fall mit deinen vier Prüfsteinen und entscheide nach der Entscheidungsregel.' : beirat ? ' Entscheide: ja oder nein.' : ' Entscheide: aussteigen oder ein Angebot machen.'}

Fälle (JSON):
${JSON.stringify(meine, null, 1)}

Antwort: nur ein JSON-Objekt, ohne Codeblock und ohne Vorrede.
Format: ${art === 'rat' ? FORMAT_RAT : FORMAT_ALT}
`);
      console.log(`Rat: ${d.name} · rv-${lauf}\t${f}`);
    }
  }
  console.log(`\nJe Agent: description genau wie oben vor dem Tab, subagent_type ratsmitglied, Prompt: Lies deinen Auftrag in <Pfad> und befolge ihn genau.`);
}
else if (cmd === 'sammeln') {
  const meta = JSON.parse(fs.readFileSync(path.join(LD(lauf), 'lauf.json'), 'utf8')), faelle = ladeFaelle(meta.faelle), sim = {}; let fehlt = 0, ueber = 0;
  const slugs = [...new Set(faelle.flatMap(f => f.mitglieder ?? []))].sort();
  if (meta.art === 'einzel') {
    const a = holen(path.join(LD(lauf), 'antwort', 'einzel.json'), `Rat: Einzel-Prompt · rv-${lauf}`);
    if (!a) { console.log('✗ Einzel-Prompt: keine Antwort'); process.exit(2); }
    for (const f of a.faelle ?? []) for (const [slug, e] of Object.entries(f.entscheidungen ?? {})) (sim[slug] ??= []).push({ firma: f.firma, entscheidung: e });
  } else for (const slug of slugs) {
    const a = holen(path.join(LD(lauf), 'antwort', slug + '.json'), `Rat: ${dossier(slug).name} · rv-${lauf}`);
    if (!a) { console.log(`✗ ${slug}: keine Antwort`); fehlt++; continue; }
    sim[slug] = (a.entscheidungen ?? []).map(e => {
      if (meta.art !== 'rat') return e;
      const r = regelEntscheid(e, meta.beirat); ueber += r.ueberstimmt;
      return { ...e, entscheidung_agent: e.entscheidung, entscheidung: r.final, schnitt_nachgerechnet: r.schnitt };
    });
  }
  fs.writeFileSync(path.join(LD(lauf), 'simulation.json'), JSON.stringify(sim, null, 1) + '\n');
  if (meta.art === 'rat') fs.writeFileSync(path.join(LD(lauf), 'regel.json'), JSON.stringify({ ueberstimmt: ueber }) + '\n');
  console.log(`gesammelt: ${Object.keys(sim).length} Mitglieder${fehlt ? `, ${fehlt} fehlen` : ''}${meta.art === 'rat' ? `, ${ueber} Angebote von der Regel überstimmt` : ''}`);
  if (fehlt) process.exit(2);
}
else if (cmd === 'auswerten') {
  const meta = JSON.parse(fs.readFileSync(path.join(LD(lauf), 'lauf.json'), 'utf8')), teil = arg('faelle')?.split(',');
  const b = bewerte(ladeFaelle(teil ?? meta.faelle), JSON.parse(fs.readFileSync(path.join(LD(lauf), 'simulation.json'), 'utf8')));
  if (teil) meta.faelle = teil;
  const nm = arg('name') ? '-' + arg('name') : '';
  if (fs.existsSync(path.join(LD(lauf), 'regel.json'))) b.regel_ueberstimmt = JSON.parse(fs.readFileSync(path.join(LD(lauf), 'regel.json'), 'utf8')).ueberstimmt;
  b.art = meta.art; b.lauf = lauf;
  fs.writeFileSync(path.join(LD(lauf), `bericht${nm}.json`), JSON.stringify(b, null, 2) + '\n');
  const md = bericht2md(b, `Rückvergleich ${lauf} (${meta.art})`, meta.faelle.map(f => '`' + f + '`').join(' und ')); fs.writeFileSync(path.join(LD(lauf), `bericht${nm}.md`), md); console.log(md);
}
else if (cmd === 'anzeigen') {
  // Kopfleiste der Ansicht auf einen Lauf setzen
  const b = JSON.parse(fs.readFileSync(path.join(LD(lauf), 'bericht.json'), 'utf8'));
  fs.writeFileSync(path.join(root, 'viewer/rueckvergleich.js'), `window.LR_RUECKVERGLEICH = ${JSON.stringify({ stand: b.stand, lauf, faelle: b.faelle, ergebnis_richtig: b.ergebnis_richtig, entscheidungen: b.entscheidungen, entscheidungen_richtig: b.entscheidungen_richtig, basis_entscheidungen: b.basis_entscheidungen, mitglieder: b.mitglieder })};\n`);
  console.log(`Kopfleiste: ${lauf}, ${b.ergebnis_richtig}/${b.faelle} Pitches, ${b.entscheidungen_richtig}/${b.entscheidungen} Einzelentscheidungen`);
}
else if (cmd === 'vergleich') {
  console.log('| Lauf | Art | Fälle richtig | Einzelentscheidungen richtig | Angebote (Sim./Original) | „immer raus“ |\n|---|---|---|---|---|---|');
  for (const l of lauf.split(',')) {
    const b = JSON.parse(fs.readFileSync(path.join(LD(l), `bericht${arg('name') ? '-' + arg('name') : ''}.json`), 'utf8'));
    console.log(`| ${l} | ${b.art} | ${b.ergebnis_richtig}/${b.faelle} (${pct(b.ergebnis_richtig, b.faelle)}) | ${b.entscheidungen_richtig}/${b.entscheidungen} (${pct(b.entscheidungen_richtig, b.entscheidungen)}) | ${b.angebote_simulation}/${b.angebote_original} | ${b.basis_entscheidungen}/${b.entscheidungen} (${pct(b.basis_entscheidungen, b.entscheidungen)}) |`);
  }
}
