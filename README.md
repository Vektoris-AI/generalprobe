English · [Deutsch](README.de.md)

# Generalprobe

A dress rehearsal for your decision ("Generalprobe" is German for dress rehearsal): a council of AI agents tests
your idea before you put money and months into it.

You describe a proposal: a business idea, an offer, a price, a decision. Five council members take it apart. Each
one has their own dossier and exactly one lead question. They cross-examine you, argue with each other, and at the
end they vote: **No** or **Yes, if …**. A stage view plays the session back: the avatars lip-sync syllable by
syllable, blink, and nod.

Two example councils ship with it, seated the way a council could sit in many owner-led companies. The English one
lives in `skill/council/`:

| Member | Lead question |
|---|---|
| The Sales Lead | Who buys this, and how do we reach exactly those people? |
| The CFO | What does it cost, what does it bring, and when is the money back? |
| The Customer | Would I buy this, and what would annoy me about it? |
| The Operator | Who does the work, and can we pull it off next to the daily grind? |
| The Skeptic | What can go wrong, and are we even allowed to do this? |

The German one lives in `skill/rat/` (Die Vertriebsleiterin, Der Kaufmann, Die Kundin, Der Meister, Die
Skeptikerin). If your pitch is in English, the session gets `"sprache": "en"` and the panel comes from
`skill/council/`.

## What you need

- [Claude Code](https://claude.com/claude-code): the council runs as a skill with sub-agents
- Node.js 18 or newer
- optional: `ffmpeg` (shrinks the avatars) and a [kie.ai](https://kie.ai) account for your own avatars

## Set up in five minutes

```bash
git clone https://github.com/Vektoris-AI/generalprobe.git
cd generalprobe
ln -s "$PWD/skill" ~/.claude/skills/generalprobe
ln -s "$PWD/agents/ratsmitglied.md" ~/.claude/agents/ratsmitglied.md
```

Then restart Claude Code so it loads the agent type `ratsmitglied` ("council member"). It can only read files,
which is why it uses about 70% fewer tokens than a general-purpose agent.

Then, in Claude Code:

```
/generalprobe auto We run a 22-person marketing agency in Denver. Our ops coordinator left. Do we rehire, or set up AI agents to do the work instead? …
```

Without `auto`, the council asks you its questions and waits for your answers. That's how you learn the most.
To open the stage:

```bash
python3 -m http.server 8000
```

and then go to `http://localhost:8000/viewer/` in your browser.

## Example session

`sessions/2026-10-17-example-agency` is a complete session: a fictional 22-person marketing agency in Denver
decides whether to rehire an ops coordinator or set up AI agents instead. With the server from above running:

- Stage view: `http://localhost:8000/viewer/index.html#2026-10-17-example-agency`
- Film view: `http://localhost:8000/viewer/film.html#2026-10-17-example-agency&format=16x9`

## How the council judges

All members follow the same rules (`skill/urteilsregeln.en.md`), each with its own anchors in the "How I decide"
section of its dossier:

- **Four criteria** from 0 to 10; the first counts double. Together they give the average.
- **Evidence rule:** what is only claimed gets 6 at most, what is missing gets 4 at most.
- **K.O. criteria** for each member and a fixed threshold: Yes only from an average of 6.5.
- **Options:** if you name several paths (always including "drop it"), every member scores each one. The verdict
  ends with a level: go, go with conditions, rework, wait, or drop.

The rules make every verdict traceable: you see which criterion it hinges on and which piece of evidence is
missing. The council is still an AI simulation. It judges what you give it and does not predict what real people
will do.

## Documents

The pitch text has at most 150 words. Numbers, prices, and costs go into documents that every member reads in full
before judging (`unterlagen` is German for documents):

```
/generalprobe unterlagen: unterlagen/my-company.md Should we rehire our ops coordinator?
```

The template is `unterlagen/example-agency.md` (fictional; the German one is `unterlagen/beispiel-baeckerei.md`).
What matters is the **full cost structure**, including salaries with benefits and a salary for yourself as the
owner. Otherwise the council makes your proposal look better than it is. Without documents, the members don't
work out costs and runway on their own. Your own documents stay on your machine through `.gitignore`.

## Build your own council

1. Copy `skill/council/_template.md`, save it as `skill/council/<short-name>.md`, and fill it in. The more precise
   the criteria, questions, and red flags, the better the verdict. The frontmatter keys stay German
   (`etikett` = label, `leitfrage` = lead question, `branchen` = fields, `aussehen` = appearance) because the
   scripts read them; the values are English.
2. Real colleagues? Then do a short interview (How do you decide? When do you say no?), and model them **only with
   their consent**.
3. Avatar: describe it in the frontmatter under `aussehen:` (for an invented character) or set `foto:` (only with
   the consent of the person shown). The English example members reuse the faces of the German ones through
   `avatar:` (The CFO has `avatar: kaufmann`). For a new member:

```bash
export KIE_API_KEY=…            # or KIE_API_KEY=… in a .env in the repo
node scripts/avatare.mjs submit alle --ok          # avatars (alle = all)
node scripts/avatare.mjs submit alle --varianten --ok   # mouth shapes and blinking for the animation
node scripts/avatare.mjs wait
node scripts/sitzung.mjs                            # reload the view
```

Without avatars, the stage shows initials.

## What else the council can do

- **See the cost:** under every verdict it says how many agents ran, how many tokens that was, and roughly what
  that costs at API list price (`scripts/kosten.mjs` calculates it from Claude Code's logs).
- **Follow-up:** `/generalprobe wiedervorlage <session>`: after a few weeks, the same council checks which
  objections are resolved and which are still open.
- **Film:** `viewer/film.html#<session>&format=4x5` (or `16x9`) plays a session as a short clip on the sofa stage,
  with camera moves and key sentences. Which contributions appear is set in the session's `film` field. So far the
  sofa scene exists for the example council.
- **Back-test:** `/generalprobe rueckvergleich`: run past decisions with a known outcome through the council
  (template `sessions/rueckvergleich/faelle.beispiel.json`) and measure how often it would have been right. Only
  then do you know how much you should trust its verdict.
- **Funding pitch:** with `investoren` in the call, members make offers for a stake instead of voting, and you
  negotiate. This format is described in the [German README](README.de.md).

## Play fair

- Don't model real people without their consent, and certainly not in public or in advertising.
- The council is a simulation. It does not replace tax, legal, or financial advice.
- Check what the council claims. It works with what you give it and can be wrong.

## Credits

The idea comes from Nate Herk's Claude skill "/roast-room"
([post on X](https://x.com/nateherk/status/2109841753628914090)). This version comes from
[Vektoris](https://vektoris.io): we build knowledge systems and AI automation for small and mid-sized businesses.

**Want Generalprobe with your own people**, fed by what your company knows, with a quarterly follow-up and a log
of how often it was right? We set that up for you: [vektoris.io](https://vektoris.io) · kontakt@vektoris.de

## License

MIT, see [LICENSE](LICENSE).
