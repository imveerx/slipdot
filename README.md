# Slip

Pass a file from one device to another. The file stays on the devices. Slip does not keep a copy.

One person hosts a room. The other joins with a six-character code, a link, or the QR mark. Same Wi-Fi is faster. If the devices are on different networks, the file still goes.

## What you can do

- Host a room, or join with a code, a link, or a camera scan.
- Send files, folders, a photo, a voice note, a short note, or the clipboard.
- Drop files on the page, or drop them on a specific device.
- Preview images, audio, video, and text before you accept.
- Accept, decline, pause, resume, cancel, or retry.
- See progress, speed, and how much has moved.
- Check each finished file with SHA-256. A mismatch is marked.
- Seal the room with AES-GCM. The key rides in the link, not on the room server.
- Lock a room with a 4-digit PIN.
- Shred a received file, forget it after a timer, or save into a chosen folder.
- Skip duplicates, shrink large photos, and send smaller files first.
- Chime when someone joins or a file finishes. Notify the browser when a file is waiting.
- Switch dark and light. Rename this device. The name is random until you change it.
- Leave on a timer. Leaving tears off a paper slip: what moved, and one line that is not serious.

## How a transfer works

1. Both browsers join the same room. A short-lived mailbox carries only the WebRTC handshake and, if a direct link cannot open, the file itself in encrypted pieces.
2. When the devices can see each other, the file moves on a WebRTC data channel. Nothing is written to disk on the server.
3. When they cannot, each piece is posted, read once by the other device, and deleted. The piece is encrypted before it is posted. The server never sees the file key.
4. The receiver checks the SHA-256 digest before calling the file intact.

Rooms forget peers when they leave. There is no account and no file library.

A single file can be up to 8 GB. The practical limit is the browser, the network, and how long both tabs stay open.

## Requirements

- Node.js 22 or newer
- npm
- A current Chromium, Safari, or Firefox. The camera, clipboard, and “save folder” picker need a secure page (`https://` or `localhost`).

## Run it locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. The dev server listens on port `8080`.

No database is required. Without `DATABASE_URL`, signaling uses an in-memory Postgres (PGLite) inside the server process. That data disappears when the process stops, which is what you want for a local room.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app for local use |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Typecheck with `tsc` |
| `npm run test` | Run the project tests |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply SQL migrations when `DATABASE_URL` is set |

## Configuration

Create a `.env` only if you are deploying. Do not commit it.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | No | Postgres connection string. When it is set, the room mailbox uses that database instead of the in-memory fallback. |

Auth is not part of Slip. Leave auth disabled. Do not set `DATABASE_URL` together with auth turned off on a host that expects a signed-in app; this repository’s auth layer fails closed in that combination.

## Deploy

The production build targets Vercel (Nitro). From a clean checkout:

```bash
npm install
npm run build
```

Set `DATABASE_URL` on the host if more than one server instance must share the room mailbox. A single instance can run without it.

Both people must open the **deployed** HTTPS origin. A link that points at `localhost` only works on that computer.

## Project layout

```
src/components/slip/slip-app.tsx   the room UI
src/lib/transfer/room.ts           WebRTC session, chunks, relay
src/lib/transfer/cipher.ts         seal token and AES-GCM
src/lib/transfer/mark-qr.ts        the Slip QR mark
src/routes/api/rtc.ts              signaling
src/routes/api/slip.ts             ephemeral mailbox
public/slip-mark.jpg               mark drawn inside the QR
```

## Privacy

- File bytes are not stored as a library. Relay pieces are deleted when the other device reads them.
- The encryption key is in the URL hash (`#k=…`). Hashes are not sent to the server with the request.
- A PIN, if you set one, is checked before a device can use the mailbox. The QR includes it so the other person does not have to type it.
- “Copy receipt” and the closing slip list names, sizes, and checks. They do not contain the files.
- Secure deletion overwrites the in-memory copy this tab still holds. It cannot shred a file the other person already saved.

## Browser notes

- Drag a folder, or use **Choose a folder**, to send a directory. Chromium reads the folder entries. Other browsers may only see the files you pick.
- **Save folder** uses the File System Access API (Chromium). Elsewhere, accepted files download.
- Camera scan uses `BarcodeDetector` when the browser has it, and `jsQR` otherwise.
- Autoplay of the chime can be blocked until you tap the page. Turning **Chime** on plays a short tone so the browser allows the later ones.

## License

[MIT](LICENSE). You can use, change, and ship Slip, including in closed-source work. Keep the copyright notice with copies of the code.
