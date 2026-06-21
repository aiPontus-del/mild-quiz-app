# Lägga till nya quiz / tävlingar

Varje quiz är **en JSON-fil** i mappen `quizzes/`. Servern läser in alla `.json`-filer
automatiskt vid start — du behöver inte registrera dem någonstans.

## Så lägger du till ett nytt quiz (2 steg)

1. **Kopiera** en befintlig fil (t.ex. `quizzes/rymden.json`) och döp om kopian.
2. **Redigera** titel och frågor, spara, och starta om servern (`npm run dev`).

## Grundformat

```json
{
  "id": "historia",
  "title": "Historia",
  "description": "Visas i listan på värdskärmen.",
  "questions": [
    { "text": "Vilket år föll Berlinmuren?", "choices": ["1987", "1989", "1991", "1993"], "correct": 1, "timeLimit": 20 }
  ]
}
```

- `id` unikt, små bokstäver, inga mellanslag.
- `correct` = **index** för rätt svar (`0` = första alternativet).
- `timeLimit` = sekunder per fråga.

## Frågetyper (`type`)

**Vanlig (standard)** — 4 alternativ, ett rätt. Sätt ingen `type` (eller `"single"`).

**Sant/Falskt** — `"type": "truefalse"`. Inga `choices` behövs (blir "Sant"/"Falskt"). `correct`: `0` = Sant, `1` = Falskt.
```json
{ "type": "truefalse", "text": "Solen är en stjärna.", "correct": 0, "timeLimit": 15 }
```

**Flera rätta** — `"type": "multi"`. `correct` är en **lista** med index. Spelaren markerar flera och trycker "Skicka". Full poäng bara om svaret matchar exakt.
```json
{ "type": "multi", "text": "Vilka är planeter?", "choices": ["Mars", "Månen", "Neptunus", "Pluto"], "correct": [0, 2], "timeLimit": 25 }
```

## Extra på vilken fråga som helst

- **Bild:** `"image": "https://…/bild.jpg"` — visas på storbilden.
- **Video:** `"video": "https://…/klipp.mp4"` — spelas upp på storbilden (mp4).
- **Dubbla poäng:** `"double": true` — frågan ger ×2 poäng (bonus inkluderad).

```json
{ "text": "Vad heter kaninen?", "double": true, "video": "https://…/klipp.mp4",
  "choices": ["Bugs", "Big Buck Bunny", "Roger", "Thumper"], "correct": 1, "timeLimit": 25 }
```

## Poäng

Rätt svar ger upp till 1000 poäng (snabbare = mer). Ovanpå det:
- **Streak-bonus:** +100 poäng per fråga i en svit av rätta svar (max +500).
- **Dubbla poäng:** hela summan (bas + bonus) ×2 på frågor med `"double": true`.

> Tips: `quizzes/blandat.json` innehåller ett exempel på varje funktion.
