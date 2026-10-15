// Zitate prüfen: Wörtliches (in Anführungszeichen) darf ein Ratsmitglied nur aus „Belegte Wendungen“ seines Dossiers
// sagen, höchstens eine Wendung pro Sitzung. Zitiert es den Pitch, die Gründer oder ein anderes Mitglied, ist das in
// Ordnung, wenn die Stelle vorher in der Sitzung steht.
//   node scripts/zitate.mjs <id>        Exit 1, wenn etwas nicht belegt ist
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2]; if (!id) { console.error('Aufruf: node scripts/zitate.mjs <id>'); process.exit(1); }
const s = JSON.parse(fs.readFileSync(path.join(root, 'sessions', id + '.json'), 'utf8'));
const norm = t => t.toLowerCase().replace(/[^a-zäöüß0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const zitate = t => [...String(t ?? '').matchAll(/[„“"«»]([^„“"”«»]{3,200})[“”"»«]/g)].map(m => m[1]);
const wendungen = slug => {
  for (const d of fs.readdirSync(path.join(root, 'skill'), { withFileTypes: true })) {
    const f = path.join(root, 'skill', d.name, slug + '.md'); if (!d.isDirectory() || !fs.existsSync(f)) continue;
    const t = fs.readFileSync(f, 'utf8'), ab = t.split(/Belegte Wendungen:?/)[1]?.split(/\n## |\n\n[A-ZÄÖÜ]/)[0] ?? '';
    return zitate(ab).map(norm);
  }
  return [];
};
const panel = new Set(s.panel.map(p => p.slug));
let vorher = norm(s.pitch.text + ' ' + (s.pitch.kurz ?? '')), probleme = 0, gesamt = 0; const genutzt = {};
for (const b of s.beitraege) {
  if (panel.has(b.sprecher)) {
    const eigene = wendungen(b.sprecher);
    for (const q of zitate(b.text)) {
      gesamt++; const n = norm(q); if (!n) continue;
      const w = eigene.find(e => e.includes(n) || n.includes(e));
      if (w) { (genutzt[b.sprecher] ??= new Set()).add(w); continue; }
      if (vorher.includes(n)) continue;
      // Sinngemäß aus der Sitzung (z. B. ein Gründer oder Mitglied, frei wiedergegeben): Hinweis, kein Fehler
      const worte = n.split(' ').filter(w => w.length >= 4), drin = worte.filter(w => vorher.includes(w)).length;
      if (worte.length && drin / worte.length >= 0.6) { console.log(`· ${b.sprecher} (${b.phase}): „${q}“ gibt die Sitzung sinngemäß wieder, besser ohne Anführungszeichen`); continue; }
      probleme++; console.log(`✗ ${b.sprecher} (${b.phase}): „${q}“ steht weder in den belegten Wendungen noch vorher in der Sitzung`);
    }
  }
  vorher += ' ' + norm(b.text ?? '');
}
for (const [slug, set] of Object.entries(genutzt)) if (set.size > 1) { probleme++; console.log(`✗ ${slug}: ${set.size} verschiedene Dossier-Wendungen, erlaubt ist eine pro Sitzung`); }
console.log(probleme ? `Zitate: ${probleme} Problem(e) bei ${gesamt} Zitaten` : `Zitate: ${gesamt} geprüft, alle belegt`);
process.exit(probleme ? 1 : 0);
