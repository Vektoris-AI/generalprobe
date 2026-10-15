// Kosten einer Sitzung aus den Claude-Code-Protokollen: Moderation (Haupt-Session) und Ratsmitglieder (Sub-Agenten)
//   node scripts/kosten.mjs <id> [--claude <session-uuid>] [--von ISO] [--bis ISO] [--schreiben]
// Zeitfenster: sonst lauf.start/lauf.ende aus sessions/<id>.json. Ohne --claude die zuletzt geänderte
// Haupt-Session im Projektordner. Mit --schreiben landet das Ergebnis in sitzung.kosten.
// Preise: API-Listenpreise in $ je 1 Mio. Tokens (claude-api-Skill, Stand 2026-10-06). Cache-Schreiben kostet
// bei 5 Minuten Haltezeit das 1,25-Fache, bei einer Stunde das 2-Fache des Eingabepreises. Über ein Claude-Abo
// fällt keine eigene Rechnung an; die Dollarwerte gelten für einen Lauf über die API.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREISE = {
  'claude-opus-5-5': { ein: 4, aus: 20, lesen: 0.2 },
  'claude-sonnet-5-5': { ein: 2, aus: 10, lesen: 0.2 },
  'claude-haiku-5-5': { ein: 0.1, aus: 0.5, lesen: 0.01 },
};
const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : (n === 'claude' ? process.env.CLAUDE_SESSION_UUID ?? null : null); };
const id = process.argv[2];
if (!id || id.startsWith('--')) { console.error('Aufruf: node scripts/kosten.mjs <id> [--claude <uuid>] [--von ISO] [--bis ISO] [--schreiben]'); process.exit(1); }
const datei = path.join(root, 'sessions', id + '.json');
const s = fs.existsSync(datei) ? JSON.parse(fs.readFileSync(datei, 'utf8')) : {};
const von = arg('von') ?? s.lauf?.start, bis = arg('bis') ?? s.lauf?.ende ?? new Date().toISOString();
if (!von) { console.error('Kein Zeitfenster: --von angeben oder lauf.start in der Sitzung setzen.'); process.exit(1); }

const projekte = path.join(os.homedir(), '.claude/projects');
let haupt = arg('claude') ? null : null;
if (arg('claude')) haupt = fs.readdirSync(projekte).map(p => path.join(projekte, p, arg('claude') + '.jsonl')).find(f => fs.existsSync(f));
else haupt = fs.readdirSync(projekte).flatMap(p => fs.readdirSync(path.join(projekte, p)).filter(f => f.endsWith('.jsonl')).map(f => path.join(projekte, p, f)))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
if (!haupt) { console.error('Hauptprotokoll nicht gefunden.'); process.exit(1); }

// Verbrauch je Nachricht einmal zählen (Nachrichten-ID), nur im Zeitfenster
function verbrauch(datei, imFenster = ts => ts >= von && ts <= bis) {
  const t = { anfragen: 0, ein: 0, aus: 0, lesen: 0, schreiben5m: 0, schreiben1h: 0, usd: 0, modell: null }, ids = new Set();
  for (const z of fs.readFileSync(datei, 'utf8').split('\n')) {
    if (!z) continue; let d; try { d = JSON.parse(z); } catch { continue; }
    const m = d.message; if (!m?.usage || !m.id || ids.has(m.id) || !imFenster(d.timestamp ?? '')) continue;
    ids.add(m.id); const u = m.usage, c = u.cache_creation ?? {};
    const s5 = c.ephemeral_5m_input_tokens ?? (c.ephemeral_1h_input_tokens == null ? u.cache_creation_input_tokens ?? 0 : 0), s1 = c.ephemeral_1h_input_tokens ?? 0;
    const p = PREISE[m.model] ?? PREISE['claude-opus-5-5'];
    t.anfragen++; t.modell = m.model; t.ein += u.input_tokens ?? 0; t.aus += u.output_tokens ?? 0; t.lesen += u.cache_read_input_tokens ?? 0; t.schreiben5m += s5; t.schreiben1h += s1;
    t.usd += ((u.input_tokens ?? 0) * p.ein + (u.output_tokens ?? 0) * p.aus + (u.cache_read_input_tokens ?? 0) * p.lesen + s5 * p.ein * 1.25 + s1 * p.ein * 2) / 1e6;
  }
  return t;
}
const mod = verbrauch(haupt);
// Ratsmitglieder: Sub-Agenten dieser Session, die im Fenster liefen und als Ratsmitglied markiert sind
const subDir = haupt.replace(/\.jsonl$/, '') + '/subagents';
const rat = { agenten: 0, tokens: 0, usd: 0, aus: 0 };
for (const f of fs.existsSync(subDir) ? fs.readdirSync(subDir).filter(f => f.endsWith('.jsonl')) : []) {
  const meta = JSON.parse(fs.readFileSync(path.join(subDir, f.replace('.jsonl', '.meta.json')), 'utf8') || '{}');
  if (!(meta.agentType === 'ratsmitglied' || /^Rat[: ]/.test(meta.description ?? ''))) continue;
  const v = verbrauch(path.join(subDir, f));
  if (!v.anfragen) continue;
  rat.agenten++; rat.tokens += v.ein + v.aus + v.lesen + v.schreiben5m + v.schreiben1h; rat.usd += v.usd; rat.aus += v.aus;
}
const r2 = x => Math.round(x * 100) / 100;
const ergebnis = {
  agenten: rat.agenten, tokens: rat.tokens, agent_typ: 'ratsmitglied',
  usd: { moderation: r2(mod.usd), rat: r2(rat.usd), gesamt: r2(mod.usd + rat.usd) },
  moderation: { modell: mod.modell, anfragen: mod.anfragen, ausgabe: mod.aus, cache_lesen: mod.lesen, cache_schreiben: mod.schreiben5m + mod.schreiben1h },
  fenster: { von, bis }, preise_stand: '2026-10-06',
  hinweis: 'API-Listenpreise aus den Claude-Code-Protokollen nachgerechnet. Die letzte Antwort eines Agenten fehlt teils im Protokoll, ihre Ausgabe ist dann nicht enthalten.',
};
console.log(`Moderation (${mod.modell}, ${mod.anfragen} Anfragen): ${ergebnis.usd.moderation} $ · Ausgabe ${mod.aus}, Cache lesen ${mod.lesen}, schreiben ${mod.schreiben5m + mod.schreiben1h}`);
console.log(`Ratsmitglieder: ${rat.agenten} Agenten, ${rat.tokens} Tokens, ${ergebnis.usd.rat} $`);
console.log(`Gesamt: ${ergebnis.usd.gesamt} $ (Fenster ${von} bis ${bis})`);
if (process.argv.includes('--schreiben') && fs.existsSync(datei)) { s.kosten = ergebnis; fs.writeFileSync(datei, JSON.stringify(s, null, 1) + '\n'); console.log('in die Sitzung geschrieben'); }
