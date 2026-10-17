# Judging rules for all council members

These apply to every member, whether it makes offers for a stake (format `investoren`) or plays a role (format `beirat`).
Your dossier says **what** you judge by; these rules say **how**. Structure modeled on Nate Herk's Roast Room
(github.com/nateherkai/roast-room, MIT), adapted to our back-test of October 14, 2026.

## 1. Criteria instead of gut feeling

Every dossier has four criteria in its "How I decide" section:

- **P1 Lead question** (counts double) and **P2**, with their own anchors from your dossier
- **P3 Price and valuation**, the same for everyone (section 3)
- **P4 My leverage**: Can I move this forward measurably with my knowledge, network, or sales reach? (section 4)

Each criterion gets 0–10. **Average = (2 × P1 + P2 + P3 + P4) ÷ 5**, one decimal place.
Anchors for everyone: 0–3 clearly against · 4–6 open or mixed · 7–8 in favor ·
9–10 exceptionally strong and documented.

## 2. Evidence before claims

Every criterion carries its source. Write it exactly as one of these three values, because the scripts check them:
`pitch` (it is in the pitch or in an answer from the founders), `annahme` (an assumption: your own inference),
or `fehlt` (missing).

- `fehlt` → 4 at most. What the pitch doesn't show, you can't score high.
- `annahme` → 6 at most.
- Above 6 only with `pitch`.
- The founders' plans, goals, and market sizes are intentions, not evidence.

## 3. Price and valuation (P3)

**Format `investoren`:** The valuation is in your brief: post-money is amount ÷ stake × 100
($100,000 for 10% = $1 million), pre-money is that value minus the amount. Weigh it against revenue and traction.
In your offer, state which valuation your terms imply; the founders use this to test their own valuation.

- Without documented revenue and with a valuation above $1 million: 3 at most.
- More than ten times documented annual revenue: 4 at most.
- Score at the founders' terms. A correction through a larger stake belongs in your offer, not in the score.

**Format `beirat`** and **ask `keine`** (none: the founders aren't looking for anyone to take a stake): P3 is the ratio of
price or cost to the documented benefit. Without a number for the benefit, 4 at most.

## 4. Leverage (P4)

- Your yardstick is your fields (frontmatter `branchen`) and your leverage as described in your dossier. If the
  proposal lies outside them, 4 at most. In that case you let the experts go first.
- 7 or more only if you can say concretely what you contribute: a channel, a contact, a skill.
- **Format `beirat`:** P4 is called "Plan for my area": Is there a concrete, checkable plan for the risk in your
  area? The anchors are in your dossier.

## 5. K.O. criteria

Your dossier names two to three K.O. criteria. If one demonstrably applies (source `pitch`), you are out, no matter
what the average says. A mere suspicion is not a K.O.; it is a low criterion score.

## 6. Decision rule

- **Format `investoren`:** Make an offer (`angebot`) only if no K.O. applies, the average is at least **6.5**, and P4
  is at least **7**. Otherwise you are out (`raus`).
- **Format `beirat`:** "Yes, if …" (`ja_wenn`) only if no K.O. applies and the average is at least **6.5**.
  Every condition must be checkable: a number, a date, a test result. Otherwise No (`nein`).
- **Base rate:** Most pitches end with the members dropping out. In our own back-test (20 real pitches with a
  known outcome), 83 of 100 individual decisions were a drop-out. Without these rules, the simulated council made
  offers too often (23 instead of 17). An offer needs a clear, documented reason.
- Your decision names the rule it falls under, e.g. "K.O.: technology not explained",
  "average 5.4 below 6.5", "leverage 4: outside my field" or "average 7.0, leverage 8".

## 7. Confidence, changing your mind, consensus

- **Confidence 1–5:** How well does the evidence support your judgment?
- **What would change my mind:** a concrete fact or number, not "more information".
- Move only for a better argument or a new fact. Then say which criterion changes, from what to what.
- Concede the strongest point of the other side, or say why it doesn't hold.
- If everyone agrees, attack the weakest spot of your own position.

## 8. Blind spots and what the simulation can't see

- Your dossier says where your view is off ("Where my view is off"). If that applies to this pitch, say so and
  lower your confidence.
- The simulation only knows text. Product tests, demos, presence, and likability are missing. If a lot depends on
  them (taste, feel, charisma), say so and lower your confidence. That is exactly where the back-test was off.

## 9. Quotes

Put in quotation marks only phrases from the "Belegte Wendungen" (documented phrases) section of your dossier, at
most one per session; the heading stays German because the script looks for it. Everything else you phrase
yourself, without quotation marks. `node scripts/zitate.mjs <id>` checks this after every session.

## 10. Options

Often the question isn't yes or no, but which variant. Then the proposal names two to four options; one of them is
always "drop it" or "carry on as before".

- Score each option 0–10 by how strongly you support it from your lead question. The anchors from section 1 apply
  here too.
- Source caps apply to options too: if an option's benefit is only claimed, 6 at most.
- A small option that closes exactly the gap you criticize (a test, a measurement, a prerequisite) may score
  higher than the big one, if its effort is documented as small.
- Your criteria score the proposal as pitched. The options show which path you would take instead. A No to the
  proposal and a high score for a smaller option don't contradict each other.

## 11. Verdict levels (for the moderator)

The level follows from the weighted average of the best option (without options: from the score):
**Go** (`los`) from 7.5 · **Go with conditions** (`los_mit_bedingungen`) 6.0–7.4 · **Rework** (`umbauen`) 4.5–5.9 ·
**Drop** (`lassen`) below 4.5, or when "drop it" itself comes out on top. **Wait** (`warten`) is set by the
moderator when the best option hinges on a missing prerequisite; the moderator then names the trigger and the date.
The result itself, deal or no deal, is not affected by the level.

## 12. Documents and costs

- If there are pitch documents, read them in full before you judge. What is stated there with a source has the
  source `pitch`. What you overlook, you can't criticize.
- Costs, margin, runway, and payback you calculate only with the cost structure from the documents: salaries or
  the owner's pay, fixed costs, tools, contractors. An imputed salary for the owner is marked there as an
  assumption and counts anyway.
- If the cost structure is missing, every criterion that depends on costs is `fehlt` (4 at most). Then you write
  "costs missing" and don't calculate your own runway or margin without salaries.
