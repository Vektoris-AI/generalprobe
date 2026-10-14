# Generalprobe

Die Generalprobe für deine Entscheidung: Ein Rat aus KI-Agenten prüft deine Idee, bevor du Geld und
Monate hineinsteckst.

Du beschreibst ein Vorhaben – eine Geschäftsidee, ein Angebot, einen Preis, eine Entscheidung. Fünf
Ratsmitglieder nehmen es auseinander: Jedes hat ein eigenes Dossier und genau eine Leitfrage, alle fragen
nach, widersprechen sich gegenseitig und stimmen am Ende ab: **Nein** oder **Ja, wenn …**. Das Ergebnis
spielt eine Bühnen-Ansicht ab: Die Avatare sprechen silbengenau mit, blinzeln und nicken.

Der Beispielrat sitzt so, wie er in vielen Mittelständlern sitzen könnte:

| Mitglied | Leitfrage |
|---|---|
| Die Vertriebsleiterin | Wer kauft das – und wie kommen wir an genau diese Leute ran? |
| Der Kaufmann | Was kostet es, was bringt es – und wann ist das Geld zurück? |
| Die Kundin | Würde ich das kaufen – und was nervt mich daran? |
| Der Meister | Wer macht die Arbeit – und schaffen wir das neben dem Tagesgeschäft? |
| Die Skeptikerin | Was kann schiefgehen – und dürfen wir das überhaupt? |

## Was du brauchst

- [Claude Code](https://claude.com/claude-code) – der Rat läuft als Skill mit Sub-Agenten
- Node.js 18 oder neuer
- optional: `ffmpeg` (verkleinert die Avatare) und ein [kie.ai](https://kie.ai)-Konto für eigene Avatare

## Startklar in fünf Minuten

```bash
git clone https://github.com/Vektoris-AI/generalprobe.git
cd generalprobe
ln -s "$PWD/skill" ~/.claude/skills/generalprobe
ln -s "$PWD/agents/ratsmitglied.md" ~/.claude/agents/ratsmitglied.md
```

Danach Claude Code neu starten, damit der Agent-Typ `ratsmitglied` geladen wird. Er darf nur lesen
und braucht dadurch rund 70 % weniger Tokens als ein Allzweck-Agent.

Dann in Claude Code:

```
/generalprobe auto Wir wollen für unsere Bäckerei einen Lieferdienst für Firmenfrühstücke starten …
```

Ohne `auto` stellt dir der Rat seine Fragen und wartet auf deine Antworten – so lernst du am meisten.
Die Bühne öffnest du so:

```bash
python3 -m http.server 8000
```

und dann im Browser `http://localhost:8000/viewer/`.

## Deinen eigenen Rat bauen

1. `skill/rat/_vorlage.md` kopieren, als `skill/rat/<kurzname>.md` speichern und ausfüllen. Je genauer
   Kriterien, Fragen und rote Flaggen, desto besser das Urteil.
2. Echte Kolleginnen und Kollegen? Dann ein kurzes Interview führen (Wie entscheidest du? Wann sagst du
   Nein?) – und **nur mit ihrer Einwilligung** nachbilden.
3. Avatar: Im Frontmatter `aussehen:` beschreiben (für eine erfundene Figur) oder `foto:` angeben (nur mit
   Einwilligung der abgebildeten Person). Dann:

```bash
export KIE_API_KEY=…            # oder KIE_API_KEY=… in eine .env im Repo
node scripts/avatare.mjs submit alle --ok          # Avatare
node scripts/avatare.mjs submit alle --varianten --ok   # Mundformen und Blinzeln für die Animation
node scripts/avatare.mjs wait
node scripts/sitzung.mjs                            # Ansicht neu einlesen
```

Ohne Avatare zeigt die Bühne Initialen.

## Was der Rat außerdem kann

- **Kosten sehen:** Unter jedem Urteil steht, wie viele Agenten liefen und wie viele Tokens das kostete.
- **Wiedervorlage:** `/generalprobe wiedervorlage <sitzung>` – derselbe Rat prüft nach ein paar Wochen,
  welche Einwände ausgeräumt sind und welche noch offen.
- **Film:** `viewer/film.html#<sitzung>&format=4x5` (oder `16x9`) spielt eine Sitzung als kurzen Clip auf der
  Sofa-Bühne ab, mit Kamerafahrt und Kernsätzen. Welche Beiträge vorkommen, steht im Feld `film` der Sitzung.
  Die Sofa-Szene gibt es bisher für den Beispielrat.
- **Rückvergleich:** `/generalprobe rueckvergleich` – schick frühere Entscheidungen mit bekanntem Ausgang
  durch den Rat (Vorlage `sessions/rueckvergleich/faelle.beispiel.json`) und miss, wie oft er richtig
  gelegen hätte. Erst danach weißt du, wie viel du seinem Urteil glauben solltest.

## Zwei Formate

- **Abstimmung** (Standard): Am Ende stimmt jedes Mitglied ab – Nein oder Ja unter Bedingungen. Gut für
  Entscheidungen, Angebote und Preise.
- **Investoren**: `investoren` in den Aufruf schreiben und eine Forderung nennen („50.000 € für 10 %").
  Dann machen die Mitglieder Angebote, und es wird verhandelt. Gut, um einen Pitch zu üben.

## Fair bleiben

- Bilde keine echten Personen ohne deren Einwilligung nach – erst recht nicht öffentlich oder in Werbung.
- Der Rat ist eine Simulation. Er ersetzt keine Steuer-, Rechts- oder Finanzberatung.
- Prüfe, was der Rat behauptet. Er arbeitet mit dem, was du ihm gibst, und kann sich irren.

## Herkunft

Die Idee stammt von Nate Herks Claude-Skill „/roast-room"
([Post auf X](https://x.com/nateherk/status/2109841753628914090)). Diese deutsche Fassung kommt von
[Vektoris](https://vektoris.de) – wir bauen Wissenssysteme und KI-Automatisierung für kleine und mittlere
Unternehmen.

**Ihr wollt die Generalprobe mit euren eigenen Leuten** – gespeist aus dem Wissen eures Betriebs, mit
Wiedervorlage im Quartal und einem Logbuch, wie oft er richtig lag? Das richten wir euch ein:
[vektoris.de](https://vektoris.de) · kontakt@vektoris.de

## Lizenz

MIT – siehe [LICENSE](LICENSE).
