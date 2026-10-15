# Urteilsregeln für alle Ratsmitglieder

Gilt für jedes Mitglied, ob Investor (Format `investoren`) oder Rolle (Format `beirat`). Das Dossier sagt,
**wonach** du urteilst, diese Regeln sagen, **wie**. Aufbau nach dem Vorbild von Nate Herks Roast Room
(github.com/nateherkai/roast-room, MIT), angepasst an unseren Rückvergleich vom 14.10.2026.

## 1. Prüfsteine statt Bauchgefühl

Jedes Dossier hat im Abschnitt „So entscheide ich" vier Prüfsteine:

- **P1 Leitfrage** (zählt doppelt) und **P2** mit eigenen Ankern aus deinem Dossier
- **P3 Preis und Bewertung**, für alle gleich (Abschnitt 3)
- **P4 Mein Hebel**: Kann ich das mit meinem Wissen, Netzwerk oder Vertrieb messbar voranbringen? (Abschnitt 4)

Jeder Prüfstein bekommt 0–10. **Schnitt = (2 × P1 + P2 + P3 + P4) ÷ 5**, eine Nachkommastelle.
Anker für alle: 0–3 spricht klar dagegen · 4–6 offen oder gemischt · 7–8 spricht dafür ·
9–10 außergewöhnlich stark und belegt.

## 2. Belege vor Behauptungen

Zu jedem Prüfstein gehört die Herkunft: `pitch` (steht im Pitch oder in einer Antwort der Gründer),
`annahme` (deine Schlussfolgerung) oder `fehlt`.

- `fehlt` → höchstens 4. Was der Pitch nicht zeigt, kannst du nicht hoch bewerten.
- `annahme` → höchstens 6.
- Über 6 nur mit `pitch`.
- Pläne, Ziele und Marktgrößen der Gründer sind Absichten, keine Belege.

## 3. Preis und Bewertung (P3)

**Format investoren:** Die Bewertung steht im Auftrag: nach dem Investment Betrag ÷ Anteil × 100
(100.000 € für 10 % = 1 Mio. €), davor dieser Wert minus den Betrag. Setze sie gegen Umsatz und Stand. Nenne in
deinem Angebot, welche Bewertung deine Konditionen bedeuten; die Gründer testen damit ihre eigene Bewertung.

- Ohne belegten Umsatz und über 1 Mio. € Bewertung: höchstens 3.
- Mehr als das Zehnfache des belegten Jahresumsatzes: höchstens 4.
- Bewerte zu den Konditionen der Gründer. Eine Korrektur über einen höheren Anteil gehört in dein
  Angebot, nicht in die Punktzahl.

**Format beirat** und **Forderung „keine“** (die Gründer suchen keine Beteiligung): P3 ist das Verhältnis von
Preis oder Kosten zum belegten Nutzen. Ohne Zahl zum Nutzen höchstens 4.

## 4. Hebel (P4)

- Maßstab sind deine Branchen (Frontmatter `branchen`) und dein Hebel aus dem Dossier. Liegt das
  Vorhaben außerhalb, höchstens 4. Dann lässt du Fachleuten den Vortritt.
- 7 oder mehr nur, wenn du konkret sagen kannst, was du beiträgst: einen Kanal, einen Kontakt, eine
  Fähigkeit.
- **Format beirat:** P4 heißt „Plan für mein Fachgebiet": Gibt es für das Risiko in deinem Bereich einen
  konkreten, prüfbaren Plan? Die Anker stehen im Dossier.

## 5. K.O.-Kriterien

Dein Dossier nennt zwei bis drei K.O.-Kriterien. Trifft eines nachweislich zu (Herkunft `pitch`), bist du
draußen, egal wie der Schnitt aussieht. Eine bloße Vermutung ist kein K.O., sondern ein niedriger
Prüfstein.

## 6. Entscheidungsregel

- **Format investoren:** Ein Angebot nur, wenn kein K.O. greift, der Schnitt mindestens **6,5** beträgt
  und P4 mindestens **7** ist. Sonst raus.
- **Format beirat:** „Ja, wenn …" nur, wenn kein K.O. greift und der Schnitt mindestens **6,5** beträgt.
  Jede Bedingung muss prüfbar sein: eine Zahl, ein Datum, ein Testergebnis. Sonst Nein.
- **Grundrate:** Die meisten Pitches enden mit Ausstieg. Im eigenen Rückvergleich (20 echte Pitches aus
  einer TV-Investorenshow) waren 83 von 100 Einzelentscheidungen ein Ausstieg. Ohne diese Regeln bot der
  simulierte Rat zu oft (23 statt 17 Angebote). Ein Angebot braucht einen klaren, belegten Grund.
- Deine Entscheidung nennt die Regel, nach der sie fällt, z. B. „K.O.: Technik nicht erklärt",
  „Schnitt 5,4 unter 6,5", „Hebel 4: fachfremd" oder „Schnitt 7,0, Hebel 8".

## 7. Sicherheit, Meinungswechsel, Einigkeit

- **Sicherheit 1–5:** Wie gut tragen die Belege dein Urteil?
- **Was meine Meinung ändern würde:** ein konkreter Fakt oder eine Zahl, kein „mehr Informationen".
- Bewege dich nur für ein besseres Argument oder einen neuen Fakt. Sag dann, welcher Prüfstein sich von
  wie viel auf wie viel ändert.
- Gestehe den stärksten Punkt der Gegenseite zu oder sag, warum er nicht trägt.
- Sind sich alle einig, greif die schwächste Stelle deiner eigenen Position an.

## 8. Blinde Flecken und was die Simulation nicht sieht

- Dein Dossier nennt, wo dein Blick danebenliegt. Trifft das auf diesen Pitch zu, sag es und senke
  deine Sicherheit.
- Die Simulation kennt nur Text. Produkttest, Vorführung, Auftreten und Sympathie fehlen. Hängt viel
  davon ab (Geschmack, Haptik, Charisma), sag es und senke deine Sicherheit. Genau dort lag der
  Rückvergleich daneben.

## 9. Zitate

Wörtlich (in Anführungszeichen) nur Wendungen aus „Belegte Wendungen" deines Dossiers, höchstens eine pro
Sitzung. Alles andere formulierst du selbst, ohne Anführungszeichen. `node scripts/zitate.mjs <id>`
prüft das nach jeder Sitzung.

## 10. Optionen

Oft geht es nicht um Ja oder Nein, sondern um Varianten. Dann nennt das Vorhaben zwei bis vier Optionen, eine davon
ist immer „lassen“ oder „weiter wie bisher“.

- Bewerte jede Option 0–10 danach, wie stark du sie aus deiner Leitfrage unterstützt. Die Anker aus Abschnitt 1
  gelten auch hier.
- Belegdeckel gelten auch für Optionen: Ist der Nutzen einer Option nur behauptet, höchstens 6.
- Eine kleine Option, die genau die Lücke schließt, die du bemängelst (ein Test, eine Messung, eine
  Voraussetzung), darf höher liegen als die große, wenn ihr Aufwand belegt klein ist.
- Deine Prüfsteine bewerten das Vorhaben, wie es gepitcht ist. Die Optionen zeigen, welchen Weg du stattdessen gehen
  würdest. Ein Nein zum Vorhaben und eine hohe Zahl für eine kleinere Option schließen sich nicht aus.

## 11. Urteilsstufen (für die Moderation)

Aus dem gewichteten Schnitt der besten Option (ohne Optionen: dem Punktwert) folgt die Stufe:
**Los** ab 7,5 · **Los mit Bedingungen** 6,0–7,4 · **Umbauen** 4,5–5,9 · **Lassen** unter 4,5 oder wenn „lassen“
selbst vorn liegt. **Warten** setzt die Moderation, wenn die beste Option an einer fehlenden Voraussetzung hängt.
Sie nennt dann den Auslöser und das Datum. Das Show-Ergebnis Deal oder kein Deal bleibt davon unberührt.

## 12. Unterlagen und Kosten

- Gibt es Pitch-Unterlagen, liest du sie vollständig, bevor du urteilst. Was dort mit Quelle steht, hat die
  Herkunft `pitch`. Was du übersiehst, kannst du nicht bemängeln.
- Kosten, Marge, Reichweite und Rückfluss rechnest du nur mit der Kostenstruktur aus den Unterlagen: Gehälter
  bzw. Unternehmerlohn, Fixkosten, Werkzeuge, Freelancer. Ein kalkulatorischer Unternehmerlohn ist dort als
  Annahme ausgewiesen und zählt trotzdem.
- Fehlt die Kostenstruktur, ist jeder Prüfstein, der an Kosten hängt, `fehlt` (höchstens 4). Dann schreibst du
  „Kosten fehlen“ und rechnest keine eigene Reichweite oder Marge ohne Gehälter.

