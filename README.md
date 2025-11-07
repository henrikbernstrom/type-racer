# Type Competition Highscore

## About this project

This app is intentionally (almost exclusively) vibe coded. It exists to experiment with vibe coding as a way of building software, and to have something playful to hand to visitors at IT fairs. Expect rapid, pragmatic decisions, evolving structure, and a focus on delivering a fun demo over strict architecture.

<img width="406" height="250" alt="Skärmavbild 2025-11-07 kl  09 51 20" src="https://github.com/user-attachments/assets/b872a5ff-bdb9-4113-a796-d51781ec84a3" />
<img width="406" height="250" alt="Skärmavbild 2025-11-07 kl  09 52 23" src="https://github.com/user-attachments/assets/d2a2d176-eaa5-41a3-8bce-fb42c56ea446" />
<img width="406" height="250" alt="Skärmavbild 2025-11-07 kl  09 53 08" src="https://github.com/user-attachments/assets/42151088-cd55-490c-b90b-4d6fccf47bf3" />
<img width="406" height="250" alt="Skärmavbild 2025-11-07 kl  09 53 37" src="https://github.com/user-attachments/assets/6f8b58cb-e9d0-401e-904e-0a7334e67ff3" />
<img width="406" height="250" alt="Skärmavbild 2025-11-07 kl  09 54 03" src="https://github.com/user-attachments/assets/eeb665e1-2be0-4487-9283-6f943100ae4d" />

## Prerequisites

- Node.js 18+
- npm 9+

## Install dependencies

- From the repository root:

```sh
npm install
```

This repo uses npm workspaces. The command above installs dependencies for all workspaces: `client`, `server`, and `shared`.

## Build

- Build shared package (if needed):

```sh
npm run build -w shared
```

- Build client:

```sh
npm run build -w client
```

- Build server:

```sh
npm run build -w server
```

## Run the server (Express + TypeScript)

- From the repository root (recommended):

```sh
npm run dev -w server
```

- Or from the `server` folder:

```sh
npm install
npm run dev
```

## Run the client (Vite + React)

- From the repository root:

```sh
npm run dev -w client
```

- Or from the `client` folder:

```sh
npm install
npm run dev
```

## Production start (server)

- After building the server:

```sh
npm run start -w server
```

## Testing

- Client tests:

```sh
npm run test -w client
```

- Server tests (run mode):

```sh
npm run test -w server
```

## Notes

- Commands shown with `-w <workspace>` must be executed from the repository root.
- You can run client and server in separate terminals for local development.
