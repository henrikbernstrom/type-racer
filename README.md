# Type Competition Highscore

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
