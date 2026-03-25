# Shoqnohu

Social web app: **React (Vite) + MUI** frontend, **Express + Prisma + PostgreSQL** backend. Features include feed, posts, comments (with images), events (with venue photos), groups (with chat and members), messages, profiles, search, and a support FAQ.

## Requirements

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** 14+ running locally or hosted
- **npm** (uses workspaces)

## Quick start

1. **Clone the repo**

   ```bash
   git clone <your-repo-url>
   cd Shoqnohu
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure the API**

   ```bash
   copy server\.env.example server\.env
   ```

   Edit `server/.env` and set:

   - `DATABASE_URL` — PostgreSQL connection string, e.g.  
     `postgresql://USER:PASSWORD@localhost:5432/shoqnohu?schema=public`
   - `JWT_SECRET` — long random string for signing tokens
   - `CLIENT_ORIGIN` — usually `http://localhost:5173` in development

4. **Create database tables**

   ```bash
   cd server
   npx prisma db push
   npx prisma generate
   cd ..
   ```

5. **Run dev (API + client)**

   From the repo root:

   ```bash
   npm run dev
   ```

   - App: http://localhost:5173  
   - API: http://localhost:4000  

   The Vite dev server proxies `/api` and `/uploads` to the API.

6. **Optional — client env**

   ```bash
   copy client\.env.example client\.env
   ```

   Leave `VITE_API_URL` empty to use the proxy, or set it to your API base URL for production builds.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Run API and client together |
| `npm run build` | Build client + server |
| `npm run db:sync` | `prisma db push` in `server` (sync schema to DB) |
| `npm test` | Run tests (client + server) |

## Production build

```bash
npm run build
```

Start the API with `npm run start -w server` (or `node server/dist/index.js` after `npm run build -w server`). Serve the client `dist` with any static host; set `VITE_API_URL` at build time if the API is on another origin, and configure `CLIENT_ORIGIN` / CORS on the server.

## Push to GitHub

1. Create a **new empty repository** on GitHub (no README if you already have one locally).

2. In the project folder:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: Shoqnohu"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. **Never commit** `server/.env`, `client/.env`, or `server/uploads/` — they are listed in `.gitignore`. Only share `*.env.example` files.

## Support email

FAQ and contact reference **bonevet_ai@bonevet.org** (configured in app copy and Support page).

## License

Add a `LICENSE` file if you need a specific open-source license.
