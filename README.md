# Slip

Pass a file from one device to another. The file stays on the devices. Slip does not keep a copy.

One person hosts a room. The other joins with a six-character code, a link, or the QR mark. Same Wi-Fi is faster. If the devices are on different networks, the file still goes.

## Use it

1. Open Slip on both devices.
2. On the first, choose **Host a room**. Give the other person the code, the link, or the QR.
3. On the second, type the code, open the link, or scan the mark.
4. Drop files, or choose them. The other person accepts. When you are done, tap **Leave**.

Leaving tears off a paper slip: what moved, and one line that is not serious. **Save slip** downloads that as a picture. The picture is not the files.

There is no account and no file library.

## What you can do

- Host a room, or join with a code, a link, or a camera scan.
- Send files, folders, a photo, a voice note, a short note, or the clipboard.
- Drop files on the page, or drop them on a specific device.
- Preview images, audio, video, and text before you accept.
- Accept, decline, accept or decline a pile, pause, resume, cancel, or retry.
- See progress, speed, and a sent / received total.
- Check each finished file with SHA-256. A mismatch is marked. **Copy receipt** lists names and checks only.
- Seal the room with AES-GCM. The key rides in the link (`#k=…`), not on the room server.
- Lock a room with a 4-digit PIN. The QR includes it.
- Shred a received file, forget it after 1 or 5 minutes, or save into a chosen folder.
- Skip duplicates, shrink large photos, and send smaller files first.
- Chime when someone joins or a file finishes. Notify the browser when a file is waiting.
- Switch dark and light. Rename this device. The name is random until you change it.
- Leave on a 15- or 60-minute timer. The closing slip still appears.

A single file can be up to 8 GB. The practical limit is the browser, the network, and how long both tabs stay open.

## How a transfer works

1. Both browsers join the same room. A short-lived mailbox carries the WebRTC handshake and, if a direct link cannot open, the file in encrypted pieces.
2. When the devices can see each other, the file moves on a WebRTC data channel. Nothing is written to disk on the server.
3. When they cannot, each piece is posted, read once by the other device, and deleted. The piece is encrypted before it is posted. The server never sees the file key.
4. The receiver checks the SHA-256 digest before calling the file intact.

Rooms forget peers when they leave.

## Privacy

- File bytes are not stored as a library. Relay pieces are deleted when the other device reads them.
- The encryption key is in the URL hash. Browsers do not send the hash to the server with the request.
- A PIN, if you set one, is checked before a device can use the mailbox.
- The receipt and the closing slip list names, sizes, and checks. They do not contain the files.
- **Shred** overwrites the copy this tab still holds. It cannot shred a file the other person already saved.

## Requirements

- Node.js 22 or newer
- npm
- A current Chromium, Safari, or Firefox

The camera, clipboard, and **Save folder** picker need a secure page (`https://` or `localhost`).

## Run it locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. The dev server listens on port `8080`.

No database is required. Without `DATABASE_URL`, the room mailbox uses an in-memory Postgres (PGLite) inside the server process. That data disappears when the process stops.

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

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | No | Postgres connection string. When it is set, the room mailbox uses that database instead of the in-memory fallback. |

Do not commit `.env`. Slip does not use accounts. Leave authentication disabled.

## Deploy

The production build targets Vercel (Nitro).

```bash
npm install
npm run build
```

Set `DATABASE_URL` on the host if more than one server instance must share the room mailbox. A single instance can run without it.

Both people must open the deployed HTTPS origin. A link that points at `localhost` only works on that computer.

## Put it on GitHub

From the project root, after [git](https://git-scm.com/) is installed:

```bash
git init
git add .
git status
git commit -m "Add Slip"
git branch -M main
git remote add origin https://github.com/<you>/slip.git
git push -u origin main
```

Check `git status` before the commit. Do not add `.env`, `node_modules`, or `.project_id`. Those are already listed in `.gitignore`.

On GitHub, the license is detected from [LICENSE](LICENSE).

## Stack

- [TanStack Start](https://tanstack.com/start) and React 19
- Tailwind CSS 4
- WebRTC data channels for the direct path
- AES-GCM for the seal, SHA-256 for the check
- Postgres, or PGLite when no database URL is set, for the mailbox only

## Project layout

```
src/components/slip/slip-app.tsx   room UI
src/lib/transfer/room.ts           WebRTC session, chunks, relay
src/lib/transfer/cipher.ts         seal token and AES-GCM
src/lib/transfer/mark-qr.ts        the Slip QR mark
src/routes/api/rtc.ts              signaling
src/routes/api/slip.ts             ephemeral mailbox
public/slip-mark.jpg               mark drawn inside the QR
LICENSE                            MIT license
```

## Browser notes

- Drag a folder, or use **Choose a folder**, to send a directory. Chromium reads the folder entries. Other browsers may only see the files you pick.
- **Save folder** uses the File System Access API (Chromium). Elsewhere, accepted files download.
- Camera scan uses `BarcodeDetector` when the browser has it, and `jsQR` otherwise.
- A browser can block the chime until the page has been tapped. Turning **Chime** on plays a short tone so later ones are allowed.

## License

[MIT](LICENSE). Copyright (c) 2026 Slip contributors. You can use, change, and ship this code, including in closed-source work. Keep the copyright notice with copies of the code.
