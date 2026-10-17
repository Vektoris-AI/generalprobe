---
name: generalprobe
description: Eine Idee, ein Angebot, einen Preis oder eine Entscheidung in einer Generalprobe prüfen. Fünf Ratsmitglieder laufen als Sub-Agenten mit eigenem Dossier durch Pitch → Erster Eindruck → Kreuzverhör → Schlagabtausch → Votum → Urteil; das Ergebnis ist eine Sitzung, die eine Bühnen-Ansicht abspielt. Nutzen bei: „frag den Beirat", „KI-Beirat", „stress-test diese Idee", „prüf dieses Angebot", „was spricht dagegen", „Pitch üben", "stress-test this idea", "roast my plan", "what could go wrong".
---

# Generalprobe

Ein Rat aus Sub-Agenten prüft eine Idee. Jedes Ratsmitglied hat ein eigenes Gehirn (ein Dossier in
`skill/rat/`) und genau eine Leitfrage. Die Mitglieder fragen nach, widersprechen sich gegenseitig und
stimmen am Ende ab: Nein, oder Ja unter Bedingungen. Inspiriert von Nate Herks „/roast-room".

## Pfade

`ROOT` ist das Repo, in dem dieser Skill liegt: der Elternordner von `skill/` (bei einem Symlink den
echten Pfad nehmen, z. B. `cd "<Base directory>" && pwd -P`, dann eine Ebene höher).

| Was | Wo |
|---|---|
| Urteilsregeln (für alle) | `ROOT/skill/urteilsregeln.md`: vier Prüfsteine, Belegpflicht, K.O., Entscheidungsregel |
| Ratsmitglieder | `ROOT/skill/rat/<slug>.md` — Frontmatter `name`, `etikett`, `leitfrage`, `branchen`; Abschnitt „So entscheide ich“ |
| Englischer Rat | `ROOT/skill/council/<slug>.md` — gleiche Felder plus `avatar` (Bildsatz eines deutschen Mitglieds), Abschnitt „How I decide“; Regeln `ROOT/skill/urteilsregeln.en.md` |
| Runden | `node ROOT/scripts/runde.mjs …`: Aufträge schreiben, Antworten holen, Regeln prüfen, Prüfsteine rechnen |
| Kosten und Zitate | `node ROOT/scripts/kosten.mjs <id>`, `node ROOT/scripts/zitate.mjs <id>` |
| Vorlage für neue Mitglieder | `ROOT/skill/rat/_vorlage.md` |
| Sitzung | `ROOT/sessions/<JJJJ-MM-TT>-<kurzname>.json` (Schema unten) |
| Verlauf während der Sitzung | `ROOT/sessions/<id>.verlauf.txt` |
| Prüfen + Ansicht füttern | `node ROOT/scripts/sitzung.mjs <id>` (prüft, schreibt `.js`, `.md`-Protokoll und Index) |
| Ansicht | `ROOT/viewer/index.html` (lokal öffnen oder `python3 -m http.server` im ROOT) |

## Aufruf

`/generalprobe <Vorhaben als Text oder Dateipfad>` — Schalter einfach in den Text schreiben:

- `auto` — keine Rückfragen: Du beantwortest das Kreuzverhör selbst aus dem Vorhaben und kennzeichnest
  alles Unbelegte als Annahme.
- `investoren` — Format „Höhle": Am Ende machen die Mitglieder Angebote (Betrag für Anteil) statt eines
  Votums. Dazu gehört eine Forderung.
- `forderung: 50.000 € für 10 %` — Betrag und Anteil, die du verlangst (`keine`, wenn du keine Beteiligung
  suchst). Daraus wird deine Bewertung vor und nach dem Investment, je Angebot der Abschlag darauf.
- `unterlagen: <Pfad>` — eigene Unterlagen mit Zahlen und Kostenstruktur, die alle Mitglieder lesen.
- `panel: slug1, slug2, …` — feste Besetzung (3–5 Slugs) statt Auswahl.
- `wiedervorlage <id>` — dasselbe Panel prüft den Fortschritt seit einer früheren Sitzung.
- `rueckvergleich` — Treffsicherheit an eigenen früheren Entscheidungen messen.

## Ablauf

**Grundsatz:** Du bist Moderation, kein Mitglied. Du argumentierst keine Seite. Fehlt ein wichtiger Punkt, gibst
du ihn als Kernfrage an das passende Mitglied. Texte der Mitglieder tippst du nie ab: `runde.mjs` holt sie aus
den Agent-Protokollen und prüft sie gegen die Urteilsregeln.

### 0 · Vorhaben aufnehmen
**Sprache:** Ist das Vorhaben auf Englisch, bekommt die Sitzung `"sprache": "en"` und das Panel kommt aus
`skill/council/` (The Sales Lead, The Operator, The Customer, The CFO, The Skeptic). Aufträge, Verlauf, Regeln, Bühne
und Protokoll sind dann englisch, Kernfragen, Urteil und Antworten im Kreuzverhör schreibst du ebenfalls auf Englisch.
Deutsche Vorhaben nutzen `skill/rat/`. Die beiden Räte nicht mischen.
**Format `investoren`:** Die Forderung (`forderung: 50.000 € für 10 %` oder `keine`) gibt der Nutzer an; fehlt sie,
einmal fragen, nie selbst ansetzen. `runde.mjs` rechnet daraus die Bewertung und je Angebot den Abschlag.
**Unterlagen:** Neben dem kurzen Pitch-Text entsteht `ROOT/sessions/<id>.unterlagen.md` mit belegten Zahlen,
Preisen und der vollen Kostenstruktur inklusive Gehältern bzw. Unternehmerlohn (vom Nutzer erfragt, als Annahme
markiert). Hat der Nutzer schon Unterlagen (`unterlagen: <Pfad>`, meist `ROOT/unterlagen/<name>.md`), kommt der
Pfad als `"unterlagen"` in die Sitzung. Vorlage: `ROOT/unterlagen/beispiel-baeckerei.md`. Alle Mitglieder lesen
die Unterlagen vor dem Urteil; ohne Unterlagen rechnen sie Kosten und Reichweite nicht selbst aus (Urteilsregeln 12).
Nennt der Pitch-Text eine Forderung, muss sie mit `pitch.forderung` übereinstimmen, sonst bricht `runde.mjs` ab.
Was, für wen, Stand (Kunden, Zahlen), was entschieden werden soll, die Möglichkeiten (immer auch „lassen“),
wohin der Gründer neigt. Nur belegte Zahlen, nichts erfinden. Daraus `pitch.text` mit höchstens 150 Wörtern
in der Ich-/Wir-Form.

### 1 · Besetzung und Gewichte
Frontmatter aller Dossiers in `skill/rat/` lesen. Bis zu fünf Mitglieder wählen, mindestens eines als
Gegenstimme. Je Mitglied ein Satz Begründung (`panel[].warum`) und ein Gewicht (`panel[].gewicht`: 3 = die
Entscheidung liegt in seinem Feld, 2 = stark berührt, 1 = am Rand). Dann `sessions/<id>.json` anlegen
(`"format": "beirat"`, Pitch, Panel, `"live": true`, `"beitraege": []`). Die Ansicht spielt die Sitzung live mit.

### 2 · Erster Eindruck, parallel
`node ROOT/scripts/runde.mjs auftrag <id> eindruck` gibt je Mitglied eine Zeile `Rat: <Name> · eindruck` und den
Pfad aus. Je Zeile ein `Agent` im selben Block: `description` exakt so, `subagent_type: ratsmitglied`, Prompt
`Lies deinen Auftrag in <Pfad> und befolge ihn genau.` Danach `node ROOT/scripts/runde.mjs sammeln <id> eindruck`.

### 3 · Kernfragen und Kreuzverhör
Ein bis drei Kernfragen ableiten, die erklären, warum das Panel auseinanderliegt, mit den Mitgliedern auf
jeder Seite: `runde.mjs kernfragen <id> '<json>'`. Meldet `sammeln` **EINIGKEIT**, wird die stärkste
unbesprochene Gegenposition eine Kernfrage. Die Fragen aus `sammeln` zusammenlegen, höchstens vier. Standard:
dem Nutzer stellen. `auto`: selbst antworten, Unbelegtes mit „Das wissen wir noch nicht“ und `annahme: true`.
Je Frage zwei Beiträge per `runde.mjs beitrag <id> '[…]'`.

### 4 · Schlagabtausch, nacheinander
Je Mitglied in Panel-Reihenfolge: `auftrag <id> schlagabtausch <slug>` → ein Agent → `sammeln <id>
schlagabtausch <slug>`. Parallel brächten alle denselben Punkt.

### 5 · Votum, parallel
`auftrag <id> angebote` → Agenten → `sammeln <id> angebote`. „Ja, wenn …“ nur ohne K.O. und mit Schnitt ≥ 6,5,
mit prüfbaren Bedingungen. Einen Regelverstoß meldet `sammeln`: einmal zurückschicken.

### 6 · Nachfassen (optional)
Antwort des Gründers per `beitrag`, dann `auftrag <id> verhandlung <slug>` → Agent → `sammeln`.

### Optionen und Urteilsstufen

Wo es um Varianten geht, legt die Moderation vor dem ersten Eindruck zwei bis vier **Optionen** in die Sitzung
(`"optionen": [{"id": "A", "text": "…"}, …, {"id": "C", "text": "Lassen", "nicht": true}]`). Immer dabei: „lassen“
oder „weiter wie bisher“ und, wenn passend, die kleinste Variante (ein Test). Jedes Mitglied bewertet dann jede
Option 0–10 (Urteilsregeln 10). `runde.mjs ende` rechnet den gewichteten Schnitt je Option und die **Stufe**: Los ab
7,5, Los mit Bedingungen 6,0–7,4, Umbauen 4,5–5,9, Lassen darunter oder wenn „lassen“ vorn liegt. **Warten** setzt die
Moderation selbst im Urteil (`"stufe": "warten", "ausloeser": "…", "datum": "JJJJ-MM-TT"`). Die Stufe ergänzt das
Ergebnis und ersetzt es nicht. Ohne Optionen folgt die Stufe aus dem Punktwert.

### 7 · Urteil
Ehrlich, nicht schmeichelnd. Argumente zählen, nicht Köpfe. Urteil als JSON-Datei und `runde.mjs urteil <id>
<datei>`: `ergebnis` (`deal` = Go, `kein_deal` = No-Go), bei Go `deal` mit zustimmenden Slugs und Bedingungen,
die drei stärksten Einwände mit Weg zum Ausräumen und ein konkreter nächster Schritt.

### 8 · Abschließen
`node ROOT/scripts/runde.mjs ende <id>` rechnet Wertung und Scorecard, beendet den Live-Modus, schreibt Kosten
und Protokoll und prüft die Zitate. Dem Nutzer das Urteil in 5–8 Zeilen geben.

## Kosten, Arbeitszeit, Wiedervorlage, Rückvergleich

**Agent-Typ:** `ratsmitglied` (nur Lesezugriff, Modell Sonnet, `ROOT/agents/ratsmitglied.md`, einmalig nach
`~/.claude/agents/` verlinken und Claude Code neu starten). Fehlt der Typ, `general-purpose` mit `model: sonnet`.

**Kosten und Arbeitszeit:** `ende` schreibt die Kosten aus den Protokollen (Moderation und Rat, API-Listenpreis).
Die Arbeitszeit je Schritt mit `runde.mjs zeit <id> <schritt> <minuten>` eintragen. Das Protokoll rechnet daraus
den Deckungsbeitrag.

**Wiedervorlage** (`wiedervorlage <id>`): Dasselbe Panel prüft den Fortschritt. Urteil, Einwände und nächster
Schritt der alten Sitzung als „FRÜHERES URTEIL“ an den Anfang des Verlaufs, der Pitch ist der Fortschritt.
Jedes Mitglied prüft zuerst seinen früheren Einwand (`auftrag … --zusatz <datei.json>`). Im Urteil bekommt jeder
Einwand `status`: `ausgeraeumt`, `offen` oder `neu`, die Sitzung `"vorher": "<id>"`.

**Rückvergleich** (`rueckvergleich`): Misst, wie oft der Rat so entscheidet, wie es tatsächlich ausging. Frühere
eigene Entscheidungen mit bekanntem Ausgang nach `ROOT/sessions/rueckvergleich/faelle.json` (Vorlage:
`faelle.beispiel.json`). Dann `node ROOT/scripts/rueckvergleich.mjs auftrag <lauf> --art rat`, je Zeile ein
Agent, `sammeln <lauf>`, `auswerten <lauf>`, `anzeigen <lauf>`. Gegenprobe mit `--art einzel` (ein Prompt ohne
Rollen). Maßstab ist die einfachste Regel (immer Nein): Erst darüber sagt der Rat mehr als sie.

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
