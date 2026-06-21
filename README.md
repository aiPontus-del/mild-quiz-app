# Mild Quiz

A live, Kahoot-style multiplayer quiz with the Mild brand. One host runs the game on a
big screen; players join from their phones with a game PIN and a nickname — **no login**.

This is the **real multiplayer version**: a Node server (Next.js + Socket.IO) holds the
game rooms in memory and pushes everything to every device in real time. No database and
no third-party API keys needed.

## Funktioner

- **QR-anslutning** — värdskärmen visar en QR-kod; spelaren skannar och PIN:en fylls i automatiskt (`/?pin=…`).
- **Frågeförhandsvisning** — frågan (och ev. bild/video) visas några sekunder innan svarsknapparna öppnas.
- **Streaks & bonus** — flera rätt i rad ger +100 bonus per fråga (max +500).
- **Dubbla poäng** — frågor kan markeras `"double": true` för ×2 poäng.
- **Bakgrundsmusik** — en lugn, loopande slinga (byggd i webbläsaren med WebAudio, ingen ljudfil) spelas på värdskärmen och styrs av samma ljud-knapp.
- **Ljud** — enkla ljudeffekter (nedräkning, rätt/fel, vinst) med en ljud-på/av-knapp på värdskärmen.
- **Återanslutning** — om en spelares telefon låser sig eller laddas om kommer hen tillbaka till samma spel med poängen kvar (en token sparas i webbläsaren). Värdskärmen återansluter på samma sätt.
- **Frågetyper** — vanlig (4 alt.), sant/falskt, och flera rätta. Frågor kan ha bild eller video.

Se **QUIZZES.md** för hur du använder allt i dina egna quiz.

## Run it locally

```bash
cd mild-quiz
npm install
npm run dev
```

- **Host / big screen:** open http://localhost:3000/host
- **Players / phones:** open http://localhost:3000 — enter the PIN shown on the host screen + a nickname.

### Play with real phones on the same wifi

1. Find your computer's local IP (e.g. `192.168.1.42`):
   - Windows: run `ipconfig` and look for "IPv4 Address".
   - Mac: System Settings → Wi-Fi → Details.
2. On the host computer open `http://localhost:3000/host`.
3. On each phone (same wifi) open `http://<your-ip>:3000` — e.g. `http://192.168.1.42:3000`.
4. Type the PIN, pick a nickname, and play.

## How a game flows

1. Host opens `/host` → a room is created and a 6-digit **PIN** appears.
2. Players open `/` on their phones, type the PIN + nickname → they pop into the host's lobby live.
3. Host picks a quiz and clicks **Starta spelet**.
4. Each question: a countdown, then the question on the big screen and four colored shape
   buttons on every phone. A live counter shows how many have answered.
5. After each question: the correct answer, an answer breakdown, and the leaderboard.
6. After the last question: the winner podium. **Spela igen** resets the same room.

Scoring is the classic Kahoot formula — a correct answer is worth up to 1000 points,
scaled by how fast you answered.

## Admin – skapa och redigera quiz

Öppna **`/admin`** (länk finns även på värdens lobbyskärm: *✎ Skapa / redigera quiz*).
Där kan du skapa nya quiz och redigera befintliga i ett formulär – lägga till frågor,
välja frågetyp (ett rätt, sant/falskt, flera rätta), markera rätt svar, sätta tid,
dubbla poäng och valfri bild/video. Ändringarna sparas som JSON-filer i `quizzes/` och
dyker upp direkt i värdens quizlista.

> Obs: admin-sidan har ingen inloggning. Lägg den bakom t.ex. en enkel lösenordsskydd
> (Basic Auth på hosten) innan du delar appen publikt, om du inte vill att vem som helst
> ska kunna ändra dina quiz.

## Adding quizzes

See **QUIZZES.md**. Each quiz is a JSON file in `quizzes/`; the server auto-loads every
`.json` file at startup, so you just drop a file in and restart.

## Robusthet & datalagring

- **Spelare som tappar uppkopplingen** återansluter automatiskt och hamnar på rätt skärm med poängen kvar. Värden likaså — en kort tapp avslutar inte spelet (servern väntar upp till 2 minuter på att värden ska komma tillbaka).
- **Överlever serveromstart (valfritt):** sätt miljövariabeln `REDIS_URL` så speglas alla pågående spel till Redis (t.ex. gratis [Upstash](https://upstash.com)). Startas servern om — eller driftsätter du en ny version mitt i ett spel — läses rummen in igen och en pågående fråga återupptas. Utan `REDIS_URL` körs allt i minnet (perfekt lokalt; ett spel nollställs då vid omstart).

```bash
# .env.local (valfritt)
REDIS_URL=rediss://default:<token>@<host>.upstash.io:6379
```

## Deploy online (Render — free, no own server)

Render runs the Node app for you from your GitHub repo. You don't manage any server.

1. Put this project on **GitHub** (push the `mild-quiz` folder as a repo).
2. Go to https://render.com → **New → Web Service** → connect your repo.
3. Settings:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Instance type:** Free is fine to start.
   - *(Valfritt)* lägg till miljövariabeln `REDIS_URL` (t.ex. från Upstash) så överlever pågående spel omstart/deploy.
4. Click **Create Web Service**. Render gives you a public URL like
   `https://mild-quiz.onrender.com`.
5. Share that URL — host opens `…/host`, players open the root URL on their phones from anywhere.

The server reads the port from the `PORT` environment variable, which Render sets
automatically — nothing to configure.

> Note on Vercel: the standard Vercel setup can't host a long-lived WebSocket server, which
> is why we use Render (or Railway/Fly.io) for this real-time version. If you specifically
> need Vercel later, the realtime layer can be swapped for a managed service (Ably/Pusher)
> + Upstash Redis without changing the screens.

## Project layout

```
mild-quiz/
  server.js        Node server: Next.js + Socket.IO + in-memory game rooms
  app/
    page.js        player phone view (join → answer → feedback)
    host/page.js   host big-screen view (lobby → questions → winner)
    layout.js      fonts + page shell
    globals.css    brand tokens, resets, keyframes
  components/
    Host.js        lobby, countdown, question, results, winner
    Player.js      join, waiting, answer (+ locked), feedback
    ui.js          shared Card / Phone / Shape / Tag
  lib/
    game.js        scoring + the 4 answer shapes (shared brand bits)
    socketClient.js  browser Socket.IO connection
  quizzes/
    *.json         one file per quiz (auto-loaded)
  public/assets/   Mild logo
```
