---
name: ki-beirat
description: Eine Idee, ein Angebot, einen Preis oder eine Entscheidung vor einem KI-Beirat prüfen. Fünf Ratsmitglieder laufen als Sub-Agenten mit eigenem Dossier durch Pitch → Erster Eindruck → Kreuzverhör → Schlagabtausch → Votum → Urteil; das Ergebnis ist eine Sitzung, die eine Bühnen-Ansicht abspielt. Nutzen bei: „frag den Beirat", „KI-Beirat", „stress-test diese Idee", „prüf dieses Angebot", „was spricht dagegen", „Pitch üben".
---

# KI-Beirat

Ein Rat aus Sub-Agenten prüft eine Idee. Jedes Ratsmitglied hat ein eigenes Gehirn (ein Dossier in
`skill/rat/`) und genau eine Leitfrage. Die Mitglieder fragen nach, widersprechen sich gegenseitig und
stimmen am Ende ab: Nein, oder Ja unter Bedingungen. Inspiriert von Nate Herks „/roast-room".

## Pfade

`ROOT` ist das Repo, in dem dieser Skill liegt: der Elternordner von `skill/` (bei einem Symlink den
echten Pfad nehmen, z. B. `cd "<Base directory>" && pwd -P`, dann eine Ebene höher).

| Was | Wo |
|---|---|
| Ratsmitglieder | `ROOT/skill/rat/<slug>.md` — Frontmatter `name`, `etikett`, `leitfrage`, `branchen` |
| Vorlage für neue Mitglieder | `ROOT/skill/rat/_vorlage.md` |
| Sitzung | `ROOT/sessions/<JJJJ-MM-TT>-<kurzname>.json` (Schema unten) |
| Verlauf während der Sitzung | `ROOT/sessions/<id>.verlauf.txt` |
| Prüfen + Ansicht füttern | `node ROOT/scripts/sitzung.mjs <id>` (prüft, schreibt `.js`, `.md`-Protokoll und Index) |
| Ansicht | `ROOT/viewer/index.html` (lokal öffnen oder `python3 -m http.server` im ROOT) |

## Aufruf

`/ki-beirat <Vorhaben als Text oder Dateipfad>` — Schalter einfach in den Text schreiben:

- `auto` — keine Rückfragen: Du beantwortest das Kreuzverhör selbst aus dem Vorhaben und kennzeichnest
  alles Unbelegte als Annahme.
- `investoren` — Format „Höhle": Am Ende machen die Mitglieder Angebote (Betrag für Anteil) statt eines
  Votums. Dafür im Vorhaben eine Forderung nennen.
- `panel: slug1, slug2, …` — feste Besetzung (3–5 Slugs) statt Auswahl.
- `wiedervorlage <id>` — dasselbe Panel prüft den Fortschritt seit einer früheren Sitzung.
- `rueckvergleich` — Treffsicherheit an eigenen früheren Entscheidungen messen.

## Ablauf

### 0 · Vorhaben aufnehmen
Was, für wen, Stand (Kunden, Zahlen), was entschieden werden soll. Nur belegte Zahlen verwenden, nichts
erfinden. Daraus `pitch.text` mit höchstens 150 Wörtern in der Ich-/Wir-Form schreiben. Den Verlauf
anlegen: `ROOT/sessions/<id>.verlauf.txt` mit Pitch und Panel.

### 1 · Besetzung
Frontmatter aller Dossiers in `skill/rat/` lesen. Bis zu fünf Mitglieder wählen, die zum Vorhaben passen,
mindestens eines davon als Gegenstimme. Je Mitglied ein Satz Begründung (`panel[].warum`).

### 2 · Erster Eindruck — parallel
Je Mitglied ein `Agent`-Aufruf im selben Block (`subagent_type: ratsmitglied`, siehe unten), Prompt
nach der VORLAGE unten. Aufgabe: Bauchgefühl aus Sicht der eigenen Leitfrage plus zwei Fragen.
Format: `{"text": "…", "haltung": {"status": "interessiert|skeptisch", "wert": 0-10}, "fragen": ["…", "…"], "kernpunkt": "≤ 12 Wörter"}`

### 3 · Kreuzverhör
Fragen sammeln, Doppelte zusammenlegen, höchstens vier behalten. Standard: dem Nutzer gesammelt stellen
und auf Antworten warten. Bei `auto`: selbst antworten, Unbelegtes mit „Das wissen wir noch nicht" und
`annahme: true`. Je Frage zwei Beiträge (`phase: fragen`): Mitglied an `gruender`, dann `gruender`.

### 4 · Schlagabtausch — nacheinander
Ein Mitglied nach dem anderen, nach jedem Beitrag den Verlauf fortschreiben. Jedes widerspricht genau einem
anderen Mitglied in 2–3 Sätzen (Name nicht im Text, die Ansicht zeigt das „an") und bringt einen Punkt,
den noch keiner gebracht hat. Parallel bringen sonst alle denselben Punkt.
Format: `{"an": "<slug>", "text": "…", "haltung": {…}, "kernpunkt": "…"}`

### 5 · Votum — parallel
Jedes Mitglied stimmt: Nein (1–2 Sätze Begründung) oder Ja, wenn … (konkrete Bedingungen).
Format: `{"entscheidung": "nein|ja", "text": "…", "bedingungen": ["…"]}`
In der Sitzung: Nein → `haltung.status: "raus"`; Ja → `haltung.status: "angebot"` und
`angebot: {"bedingungen": [...]}` ohne Betrag. Im Format `investoren` stattdessen Angebote mit
`betrag`, `anteil`, `bedingungen` und danach eine Verhandlungsrunde (`phase: verhandlung`).

### 6 · Nachfassen (optional)
Wenn Bedingungen offen sind: Der Gründer (bei `auto` du) antwortet auf die wichtigste Bedingung, das
Mitglied bestätigt oder verschärft sie (`phase: verhandlung`).

### 7 · Urteil — du als Moderator
Ehrlich, nicht schmeichelnd. `ergebnis`: `deal` (Go) oder `kein_deal` (No-Go). Bei Go `deal` als Beschluss:
`{"mitglieder": [zustimmende Slugs], "bedingungen": [...]}`. Dazu die drei stärksten Einwände (wer, was, wie man
sie ausräumt) und ein konkreter nächster Schritt für die kommende Woche.

### 8 · Schreiben und zeigen
`ROOT/sessions/<id>.json` schreiben (Texte wörtlich aus den Agenten), `node ROOT/scripts/sitzung.mjs <id>`
ausführen und Fehler korrigieren. Dem Nutzer das Urteil in 5–8 Zeilen geben und die Ansicht nennen.

## Kosten, Wiedervorlage, Rückvergleich

**Agent-Typ:** Die Mitglieder laufen als `subagent_type: ratsmitglied` (nur Lesezugriff, Modell
Sonnet; Definition in `ROOT/agents/ratsmitglied.md`, einmalig nach `~/.claude/agents/` verlinken und
Claude Code neu starten). Das spart gegenüber `general-purpose` rund 70 % Tokens. Fehlt der Typ, dann
`general-purpose` mit `model: sonnet`.

**Kosten:** Bei jedem Agent-Aufruf `subagent_tokens` aus dem Ergebnis notieren und in die Sitzung
schreiben: `"kosten": {"agenten": <Anzahl>, "tokens": <Summe>, "agent_typ": "ratsmitglied"}`.

**Wiedervorlage** (`wiedervorlage <id>`): Dasselbe Panel prüft den Fortschritt. Die alte Sitzung
lesen, Urteil, Einwände und nächsten Schritt als „FRÜHERES URTEIL" in den Verlauf schreiben. Der
Pitch ist der Fortschritt seitdem. Jedes Mitglied prüft zuerst seinen früheren Einwand. Im Urteil
bekommt jeder Einwand `status`: `ausgeraeumt`, `offen` oder `neu`, die Sitzung bekommt `"vorher": "<id>"`.

**Rückvergleich** (`rueckvergleich`): Misst, wie oft der Rat so entscheidet, wie es im echten Leben
ausging. Dafür frühere eigene Entscheidungen mit bekanntem Ausgang nach
`ROOT/sessions/rueckvergleich/faelle.json` schreiben (Vorlage: `faelle.beispiel.json`). Dann je
Mitglied ein Agent, blind ohne Ausgang, Format
`{"entscheidungen": [{"firma": "<vorhaben>", "entscheidung": "ja|nein", "begruendung": "1 Satz"}]}`.
Die Antworten nach `simulation.json` (`{"<slug>": [ … ]}`) schreiben und `node ROOT/scripts/rueckvergleich.mjs`
ausführen. Die Ansicht zeigt danach die Trefferquote in der Kopfleiste.

## VORLAGE für die Mitglieder

```
Du bist {NAME} ({ETIKETT}) in einem KI-Beirat. Lies zuerst dein Dossier: {ROOT}/skill/rat/{SLUG}.md
Urteile nach deinen dort beschriebenen Kriterien, Fragen, roten Flaggen und Denkmustern, sprich in deinem
Tonfall. Deine Leitfrage, die nur du stellst: „{LEITFRAGE}"

Regeln:
- Ich-Form, Deutsch, Anrede wie im Dossier. 2–4 Sätze.
- Keine erfundenen Fakten über das Vorhaben. Fehlt etwas, frag danach oder werte es als Risiko.
- Hart in der Sache, nie beleidigend. Nicht mit Lob einsteigen, sondern direkt mit deinem Punkt.
- Antworte ausschließlich mit einem JSON-Objekt im verlangten Format, ohne Codeblock.

Vorhaben, Panel und bisherigen Verlauf liest du hier: {ROOT}/sessions/{ID}.verlauf.txt

Runde: {RUNDE}
Aufgabe: {AUFGABE}
Format: {FORMAT}
```

## Sitzungs-Schema

```json
{
  "version": 1, "format": "beirat",
  "id": "2026-10-20-lieferdienst", "titel": "Lieferdienst", "datum": "2026-10-20", "modus": "auto",
  "pitch": { "gruender": "Name", "kurz": "Ein Satz", "text": "≤ 150 Wörter", "annahmen": [] },
  "panel": [{ "slug": "kaufmann", "warum": "…" }],
  "beitraege": [
    { "phase": "eindruck", "sprecher": "kaufmann", "an": null, "text": "…", "haltung": { "status": "skeptisch", "wert": 4 }, "kernpunkt": "…" },
    { "phase": "fragen", "sprecher": "kaufmann", "an": "gruender", "text": "…" },
    { "phase": "fragen", "sprecher": "gruender", "an": "kaufmann", "text": "…", "annahme": true },
    { "phase": "schlagabtausch", "sprecher": "kundin", "an": "kaufmann", "text": "…", "haltung": { "status": "interessiert", "wert": 6 }, "kernpunkt": "…" },
    { "phase": "angebote", "sprecher": "skeptikerin", "text": "…", "haltung": { "status": "raus" } },
    { "phase": "angebote", "sprecher": "kaufmann", "text": "…", "haltung": { "status": "angebot" }, "angebot": { "bedingungen": ["…"] } }
  ],
  "urteil": {
    "ergebnis": "deal",
    "deal": { "mitglieder": ["kaufmann"], "bedingungen": ["…"] },
    "begruendung": "…",
    "einwaende": [{ "von": "skeptikerin", "text": "…", "ausraeumen": "…" }],
    "naechster_schritt": "…"
  }
}
```

Die Phase `angebote` heißt in der Ansicht „Votum", `verhandlung` heißt „Nachfassen". `sprecher` ist ein
Panel-Slug, `gruender` oder `moderator`. Im Format `investoren` zusätzlich `pitch.forderung: {betrag, anteil}`.
