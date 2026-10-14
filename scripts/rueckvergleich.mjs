// Rückvergleich: Wie oft entscheidet der simulierte Rat wie das Original?
//   node scripts/rueckvergleich.mjs
// Liest sessions/rueckvergleich/faelle.json (echte Fälle mit bekanntem Ausgang) und simulation.json
// ({"<slug>": [{"firma": "…", "entscheidung": "raus|angebot|nein|ja", …}]}), schreibt bericht.json,
// bericht.md und viewer/rueckvergleich.js für die Anzeige in der Kopfleiste.
import fs from 'node:fs/promises'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'sessions/rueckvergleich');
const faelle = JSON.parse(await fs.readFile(path.join(dir, 'faelle.json'), 'utf8'));
const sim = JSON.parse(await fs.readFile(path.join(dir, 'simulation.json'), 'utf8'));

const ja = e => ['angebot', 'ja'].includes(String(e).toLowerCase());
const gleich = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const je = {}, details = [];
let ent = 0, entRichtig = 0, erg = 0, ergRichtig = 0, basisEnt = 0, basisErg = 0; // Basis: immer „raus“/„nein“

for (const fall of faelle) {
  const mitglieder = fall.mitglieder ?? [];
  const echt = fall.entscheidungen ?? {};
  const zeile = { firma: fall.firma ?? fall.vorhaben, mitglieder: {} };
  const simJa = [];
  for (const slug of mitglieder) {
    const s = (sim[slug] ?? []).find(x => gleich(x.firma, zeile.firma));
    if (!s) continue;
    simJa.push(ja(s.entscheidung));
    const e = typeof echt[slug] === 'object' ? echt[slug]?.entscheidung : echt[slug];
    zeile.mitglieder[slug] = { simulation: s.entscheidung, original: e ?? 'unbekannt' };
    if (e && !/unklar|unbekannt/i.test(e)) {
      const ok = ja(s.entscheidung) === ja(e);
      ent++; entRichtig += ok; basisEnt += !ja(e); (je[slug] ??= { richtig: 0, gesamt: 0 }); je[slug].gesamt++; je[slug].richtig += ok;
      zeile.mitglieder[slug].richtig = ok;
    }
  }
  if (!simJa.length) continue;
  // Investoren (Fall mit Forderung): „mindestens ein Angebot" vergleichen; Beirat: Mehrheit Ja gegen Go/No-Go
  const beirat = !fall.forderung;
  const simPositiv = beirat ? simJa.filter(Boolean).length > simJa.length / 2 : simJa.some(Boolean);
  const echtWerte = Object.values(echt).map(v => typeof v === 'object' ? v?.entscheidung : v).filter(v => v && !/unklar|unbekannt/i.test(v));
  const echtPositiv = !beirat && echtWerte.length ? echtWerte.some(ja) : ['deal', 'go'].includes(String(fall.ergebnis?.typ ?? fall.ergebnis).toLowerCase());
  erg++; ergRichtig += simPositiv === echtPositiv; basisErg += !echtPositiv;
  Object.assign(zeile, { simulation: simPositiv ? (beirat ? 'Go' : 'mind. ein Angebot') : (beirat ? 'No-Go' : 'alle raus'), original: echtPositiv ? (beirat ? 'Go' : 'mind. ein Angebot') : (beirat ? 'No-Go' : 'alle raus'), richtig: simPositiv === echtPositiv });
  details.push(zeile);
}

const bericht = { stand: new Date().toISOString().slice(0, 10), faelle: erg, ergebnis_richtig: ergRichtig, entscheidungen: ent, entscheidungen_richtig: entRichtig, basis_ergebnis: basisErg, basis_entscheidungen: basisEnt, mitglieder: Object.keys(sim), je_mitglied: je, details };
await fs.writeFile(path.join(dir, 'bericht.json'), JSON.stringify(bericht, null, 2) + '\n');
const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '–';
const md = [`# Rückvergleich (${bericht.stand})`, '',
  `> KI-Simulation gegen echte Entscheidungen. Fälle aus \`faelle.json\`, keiner davon steht in einem Dossier.`, '',
  `- **Ausgang je Fall:** ${ergRichtig} von ${erg} richtig (${pct(ergRichtig, erg)})`,
  `- **Einzelentscheidungen:** ${entRichtig} von ${ent} wie im Original (${pct(entRichtig, ent)})`,
  `- **Zum Vergleich, Regel „immer Nein“:** Fälle ${basisErg} von ${erg} (${pct(basisErg, erg)}), Einzelentscheidungen ${basisEnt} von ${ent} (${pct(basisEnt, ent)}). Erst wenn der Rat darüber liegt, sagt er mehr als die einfachste Regel.`, '',
  '| Mitglied | richtig | gesamt |', '|---|---|---|', ...Object.entries(je).map(([s, v]) => `| ${s} | ${v.richtig} | ${v.gesamt} |`), '',
  '| Fall | Simulation | Original | richtig |', '|---|---|---|---|', ...details.map(d => `| ${d.firma} | ${d.simulation} | ${d.original} | ${d.richtig ? 'ja' : 'nein'} |`), ''].join('\n');
await fs.writeFile(path.join(dir, 'bericht.md'), md);
await fs.writeFile(path.join(root, 'viewer/rueckvergleich.js'), `window.LR_RUECKVERGLEICH = ${JSON.stringify({ stand: bericht.stand, faelle: erg, ergebnis_richtig: ergRichtig, entscheidungen: ent, entscheidungen_richtig: entRichtig, basis_entscheidungen: basisEnt, mitglieder: bericht.mitglieder })};\n`);
console.log(md);
