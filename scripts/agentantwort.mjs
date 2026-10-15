// Antwort eines Ratsmitglieds holen: zuerst aus der Antwortdatei (Agent mit Write-Werkzeug), sonst aus dem
// Claude-Code-Protokoll des Sub-Agenten, erkannt an seiner Beschreibung („Rat: <Name> · <runde>“). So muss die
// Moderation keine Antwort abtippen, auch wenn der Agent nur lesen darf.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';

export function jsonAus(text) {
  const t = String(text ?? '').replace(/^```(json)?|```$/gm, ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('kein JSON-Objekt gefunden');
  return JSON.parse(t.slice(a, b + 1));
}

// Neueste Haupt-Session (oder die mit --claude genannte) und ihre Sub-Agenten
export function subagentenOrdner(uuid) {
  const projekte = path.join(os.homedir(), '.claude/projects');
  const alle = fs.readdirSync(projekte).flatMap(p => { try { return fs.readdirSync(path.join(projekte, p)).filter(f => f.endsWith('.jsonl')).map(f => path.join(projekte, p, f)); } catch { return []; } });
  const haupt = uuid ? alle.find(f => path.basename(f, '.jsonl') === uuid) : alle.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  return haupt ? haupt.replace(/\.jsonl$/, '') + '/subagents' : null;
}

// Ohne uuid alle Sessions durchsuchen und den neuesten Agenten mit dieser Beschreibung nehmen. So stört eine andere
// Session nicht, die gerade parallel schreibt.
function alleSubagentenOrdner() {
  const projekte = path.join(os.homedir(), '.claude/projects');
  return fs.readdirSync(projekte).flatMap(p => { try { return fs.readdirSync(path.join(projekte, p), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(projekte, p, d.name, 'subagents')); } catch { return []; } }).filter(d => fs.existsSync(d));
}
export function ausProtokoll(beschreibung, uuid) {
  const ordner = uuid ? [subagentenOrdner(uuid)].filter(d => d && fs.existsSync(d)) : alleSubagentenOrdner();
  const treffer = ordner.flatMap(dir => fs.readdirSync(dir).filter(f => f.endsWith('.meta.json')).map(f => ({ dir, f, meta: (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return {}; } })() })))
    .filter(x => x.meta.description === beschreibung)
    .sort((a, b) => fs.statSync(path.join(b.dir, b.f)).mtimeMs - fs.statSync(path.join(a.dir, a.f)).mtimeMs);
  if (!treffer.length) return null;
  const zeilen = fs.readFileSync(path.join(treffer[0].dir, treffer[0].f.replace('.meta.json', '.jsonl')), 'utf8').split('\n').filter(Boolean).reverse();
  for (const z of zeilen) {
    let d; try { d = JSON.parse(z); } catch { continue; }
    const inhalt = d.message?.content; if (d.type !== 'assistant' || !Array.isArray(inhalt)) continue;
    for (const c of inhalt) {
      if (c.type === 'tool_use' && c.name === 'SubagentHandback' && c.input?.message?.includes('{')) return c.input.message;
      if (c.type === 'text' && c.text.includes('{')) return c.text;
    }
  }
  return null;
}

export function holen(pfad, beschreibung) {
  if (fs.existsSync(pfad)) return jsonAus(fs.readFileSync(pfad, 'utf8'));
  const t = ausProtokoll(beschreibung, process.env.CLAUDE_SESSION_UUID);
  if (!t) return null;
  const a = jsonAus(t); fs.mkdirSync(path.dirname(pfad), { recursive: true }); fs.writeFileSync(pfad, JSON.stringify(a, null, 1) + '\n');
  return a;
}
