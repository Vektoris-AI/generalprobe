// Avatare für den Rat als 3D-Karikaturen über kie.ai (Google Nano Banana, 4 Credits je Bild, 1K)
//   node scripts/avatare.mjs balance
//   node scripts/avatare.mjs submit <slug…|alle> --ok          (bezahlt, deshalb --ok Pflicht)
//   node scripts/avatare.mjs submit <slug…|alle> --varianten --ok   (Mundformen m1–m4 und Blinzeln für die Animation)
//   node scripts/avatare.mjs wait                              (holt fertige Bilder, skaliert auf 512 px)
// Vorlage je Ratsmitglied im Frontmatter des Dossiers (skill/<ordner>/<slug>.md):
//   foto: "<URL oder Pfad relativ zum Repo>"  → Karikatur nach Foto (nano-banana-edit)
//   aussehen: "<Beschreibung auf Englisch>"   → erfundene Figur aus Text (nano-banana)
//   avatar_hinweis: "<Zusatz zum Prompt>"     → optional
//   einwilligung: "<wer, wann>"               → Pflicht bei foto echter Personen (oder nur_intern: ja)
//   zuschnitt: "<w:h:x:y>"                     → optionaler Bildausschnitt (ffmpeg crop) für alle Varianten
// Schlüssel: KIE_API_KEY aus der Umgebung oder aus .env im Repo.
import fs from 'node:fs/promises'; import { existsSync } from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ausEnv = async f => (await fs.readFile(f, 'utf8').catch(() => '')).match(/^KIE_API_KEY\s*=\s*(.+)$/m)?.[1].trim().replace(/^['"]|['"]$/g, '');
const key = process.env.KIE_API_KEY || await ausEnv(path.join(root, '.env'))
if (!key) { console.error('KIE_API_KEY fehlt (Umgebung oder .env im Repo).'); process.exit(1); }
const H = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
const clean = v => JSON.stringify(v).replaceAll(key, '[REDACTED]');
const api = async (route, body) => JSON.parse(clean(await (await fetch('https://api.kie.ai/api/v1' + route, { method: body ? 'POST' : 'GET', headers: H, body: body ? JSON.stringify(body) : undefined })).json()));
const rj = async f => JSON.parse(await fs.readFile(f, 'utf8').catch(() => 'null'));
const jobs = path.join(root, 'scripts/avatar-jobs'); await fs.mkdir(jobs, { recursive: true });
const out = path.join(root, 'viewer/avatare'); await fs.mkdir(out, { recursive: true });

// Frontmatter aller Dossiers lesen (gleiche Regeln wie scripts/sitzung.mjs)
const front = txt => Object.fromEntries((txt.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').split('\n')
  .map(z => z.match(/^([a-z_0-9]+):\s*(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^["“„]|["”“]$/g, '')]));
const RAT = {};
const ordner = (await fs.readdir(path.join(root, 'skill'), { withFileTypes: true })).filter(d => d.isDirectory()).map(d => 'skill/' + d.name);
for (const d of ordner) for (const f of (await fs.readdir(path.join(root, d)).catch(() => [])).filter(f => f.endsWith('.md') && !f.startsWith('_'))) {
  const m = front(await fs.readFile(path.join(root, d, f), 'utf8')); if (m.slug) RAT[m.slug] = m;
}

const STIL = 'stylized 3D animated character portrait, like a character from a modern feature-length animated film: gently caricatured proportions (slightly larger head, expressive eyes), soft subsurface skin shading, detailed hair';
const BILD = 'Chest-up bust, centered, head and shoulders filling the upper two thirds of the frame, looking straight into the camera with a confident, slightly amused expression. Plain flat dark navy background (#0F172A) with no gradient, no objects, no floor. Soft warm key light from the upper left, a subtle cool cyan rim light on the shoulders. Square image. No text, no logos, no brand patches, no jewellery logos, no other people.';
const prompt = m => (m.foto
  ? `Turn the person in the reference photo into a ${STIL}. Keep the person clearly recognizable: same face shape, hairstyle, hair colour, eyebrows, glasses and facial hair as in the photo. Clothing as in the photo, simplified, plain fabrics. ${m.avatar_hinweis ?? ''} ${BILD}`
  : `A ${STIL}. The character: ${m.aussehen}. ${m.avatar_hinweis ?? ''} ${BILD}`).replace(/\s+/g, ' ');
// Varianten für die Animation: Mundformen (Viseme) und Blinzeln, jeweils als minimale Bearbeitung des Rohbilds
const EDIT = x => `Edit this image minimally. Keep the character, face, hair, clothing, pose, framing, lighting and the flat dark navy background exactly identical, pixel for pixel. Change only ${x}. No other changes, no new objects, no text.`;
const VARIANTEN = {
  m1: EDIT('the mouth: lips slightly parted as when starting to speak, a thin gap between the lips, upper teeth barely visible'),
  m2: EDIT('the mouth: open naturally as if in the middle of speaking an "a" sound, lips apart, a little of the upper teeth visible'),
  m3: EDIT('the mouth: lips rounded and pushed slightly forward into a small "o" shape, as when saying "o" or "u"'),
  m4: EDIT('the mouth: lips stretched wide as when saying "e" or "i", both rows of teeth visible'),
  blink: EDIT('the eyes: both eyes gently closed as in the middle of a natural blink; keep the mouth exactly as it is'),
};

async function upload(file) {
  const buf = await fs.readFile(file); const typ = path.extname(file) === '.png' ? 'png' : 'jpeg';
  for (const host of ['https://kieai.redpandaai.co/api/file-base64-upload', 'https://api.kie.ai/api/file-base64-upload']) {
    const r = await fetch(host, { method: 'POST', headers: H, body: JSON.stringify({ base64Data: `data:image/${typ};base64,${buf.toString('base64')}`, uploadPath: 'generalprobe', fileName: path.basename(file) }) }).then(r => r.json()).catch(() => null);
    const url = r?.data?.downloadUrl ?? r?.data?.fileUrl; if (url) return url;
  }
  throw new Error('Upload fehlgeschlagen: ' + file);
}

const rohUrl = {}; // Rohbild je Figur nur einmal hochladen
async function submit(slug, v) {
  const id = v ? `${slug}-${v}` : slug, f = path.join(jobs, id + '.json'), m = RAT[slug];
  if ((await rj(f))?.state === 'done') return console.log(id, 'gibt es schon');
  if (!m) return console.log(slug, 'kein Dossier');
  let auftrag;
  if (v) {
    const roh = path.join(out, slug + '-roh.png');
    if (!existsSync(roh)) return console.log(slug, 'erst den Avatar erzeugen');
    rohUrl[slug] ??= await upload(roh);
    auftrag = { model: 'google/nano-banana-edit', input: { prompt: VARIANTEN[v], image_urls: [rohUrl[slug]], output_format: 'png', image_size: '1:1' } };
  } else if (m.foto) {
    // Echte Personen nur mit Einwilligung – oder ausdrücklich nur für den internen Gebrauch
    if (!m.einwilligung && m.nur_intern !== 'ja') return console.log(slug, 'foto ohne einwilligung im Frontmatter – übersprungen');
    const ref = /^https?:/.test(m.foto) ? m.foto : await upload(path.resolve(root, m.foto));
    auftrag = { model: 'google/nano-banana-edit', input: { prompt: prompt(m), image_urls: [ref], output_format: 'png', image_size: '1:1' } };
  } else if (m.aussehen) {
    auftrag = { model: 'google/nano-banana', input: { prompt: prompt(m), output_format: 'png', image_size: '1:1' } };
  } else return console.log(slug, 'weder foto noch aussehen im Frontmatter');
  const r = await api('/jobs/createTask', auftrag);
  await fs.writeFile(f, JSON.stringify({ id, taskId: r.data?.taskId, state: r.data?.taskId ? 'submitted' : 'rejected', response: r, auftrag, created: new Date().toISOString() }, null, 1));
  console.log(id, r.data?.taskId ? 'eingereicht' : 'abgelehnt', r.msg || '');
}

// Rohbild (1024 px) auf 512 px bringen; „zuschnitt" im Frontmatter (ffmpeg-crop, z. B. 722:722:145:0) gilt für alle Varianten
function verkleinern(von, nach, zuschnitt) {
  const vf = (zuschnitt ? `crop=${zuschnitt},` : '') + 'scale=512:512:flags=lanczos';
  try { execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', von, '-vf', vf, nach]); }
  catch { execFileSync('cp', [von, nach]); }
}

const [cmd, ...args] = process.argv.slice(2);
const varianten = args.includes('--varianten') || args.includes('--mund') ? Object.keys(VARIANTEN)
  : (args.find(a => a.startsWith('--variante='))?.split('=')[1].split(',') ?? [null]);
let slugs = args.filter(a => !a.startsWith('--'));
if (slugs.includes('alle')) slugs = Object.keys(RAT);
const auftraege = slugs.flatMap(s => varianten.map(v => [s, v])).filter(([s, v]) => !existsSync(path.join(out, (v ? `${s}-${v}` : s) + '.png')));
if (cmd === 'balance') console.log('credits', (await api('/chat/credit')).data);
if (cmd === 'submit') {
  if (!args.includes('--ok')) { console.log(`Bezahlter Auftrag (${auftraege.length} × 4 Credits): ${auftraege.map(([s, v]) => v ? `${s}-${v}` : s).join(', ')}. Mit --ok bestätigen.`); process.exit(1); }
  for (const [s, v] of auftraege) await submit(s, v);
}
if (cmd === 'wait') {
  for (let i = 0; i < 120; i++) {
    let open = 0;
    for (const file of (await fs.readdir(jobs)).filter(x => x.endsWith('.json'))) {
      const f = path.join(jobs, file); const rec = await rj(f);
      if (!rec.taskId || ['done', 'fail'].includes(rec.state)) continue;
      const d = (await api('/jobs/recordInfo?taskId=' + rec.taskId)).data || {};
      if (d.state === 'success') {
        const rjs = JSON.parse(d.resultJson || '{}'); const url = rjs.resultUrls?.[0] ?? rjs.result_urls?.[0];
        const roh = path.join(out, rec.id + '-roh.png');
        execFileSync('curl', ['-sSL', '--retry', '5', '-C', '-', '-o', roh, url]);
        const slug = Object.keys(RAT).find(s => rec.id === s || rec.id.startsWith(s + '-'));
        verkleinern(roh, path.join(out, rec.id + '.png'), RAT[slug]?.zuschnitt);
        Object.assign(rec, { state: 'done', resultUrl: url, costTime: d.costTime }); console.log(rec.id, 'fertig');
      } else if (d.state === 'fail') { Object.assign(rec, { state: 'fail', failMsg: d.failMsg }); console.log(rec.id, 'fehlgeschlagen', d.failMsg); }
      else open++;
      await fs.writeFile(f, JSON.stringify(rec, null, 1));
    }
    if (!open) break;
    await new Promise(r => setTimeout(r, 10000));
  }
}
