# Chinlung Today Backend

A small Express and PostgreSQL API for learning how news publishing works.

## What this first version does

- Creates a news article after an admin signs in
- Lists published news newest-first
- Filters published news by category
- Returns one article using its slug and records its view
- Allows one article to be marked as the Top Story
- Supports draft and published status

Admin authentication uses a separate `admin_users` table, a hashed password, and an eight-hour login token. Public readers do not need accounts. Image file uploads are intentionally left for a later learning step; this version accepts an image URL.

## 1. Install PostgreSQL

Install PostgreSQL for Windows from https://www.postgresql.org/download/windows/.

During installation:

1. Keep PostgreSQL Server and pgAdmin selected.
2. Keep port `5432` unless it is already used.
3. Create and remember the password for the `postgres` user.

## 2. Create the database

Open pgAdmin, connect to your local server, right-click **Databases**, choose **Create > Database**, and name it:

```text
chinlung_today
```

Select the new database, open **Query Tool**, paste the contents of `sql/schema.sql`, and run it.

## 3. Configure the backend

Copy `.env.example` to a new file named `.env` and replace `YOUR_PASSWORD`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_real_password@localhost:5432/chinlung_today
FRONTEND_URL=http://localhost:5173
JWT_SECRET=replace_this_with_a_long_random_secret
ADMIN_NAME=JMIK Thang
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_this_with_a_strong_password
```

If Vite runs on another port, such as `5177`, use that address for `FRONTEND_URL`.

Production social metadata uses `https://chinlungtoday.com` by default. You can
set `PUBLIC_SITE_URL` to override that canonical public origin and
`FRONTEND_SHELL_URL` if the frontend HTML shell is served from a different
origin. Neither setting changes the API URL used by the frontend.

Never commit `.env` because it contains your database password.

## 4. Create your first admin

After running `sql/schema.sql` again so the `admin_users` table exists, run:

```bash
npm run create-admin
```

## Render

Create a Render PostgreSQL database, then deploy this repository as a Web
Service. Use `npm install` as the build command and `npm run render-start` as
the start command. The Render start command creates any missing tables,
creates or updates the configured admin account, and starts the API.

Set `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL`,
and `ADMIN_PASSWORD` in the Render dashboard. Do not upload the local `.env`.

The script reads the admin name, email, and password from `.env`, hashes the password, and saves the administrator separately from public users.

## 5. Install and run

```bash
npm install
npm run dev
```

Check the connection in a browser:

```text
http://localhost:5000/api/health
```

## 6. Post a news article

Open the frontend at `/#/admin`. You will be redirected to `/#/admin/login`. Sign in using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`, then use the Post News form.

You can also call the API manually using the token returned by the login route.

Use Postman, Insomnia, or the VS Code REST Client:

```http
POST http://localhost:5000/api/news
Content-Type: application/json
```

JSON body:

```json
{
  "title": "Community leaders announce a new education program",
  "summary": "The program will provide learning support for students in several communities.",
  "content": "Community leaders have announced a new education program designed to give students additional access to learning materials and local mentors.",
  "category": "Chin News",
  "author": "Chinlung Today Newsroom",
  "imageUrl": "https://example.com/news-image.jpg",
  "imageAlt": "Students working together in a classroom",
  "status": "published",
  "isTopStory": true
}
```

Valid categories are:

- Chin News
- Myanmar News
- International News
- Sports
- Business

## API routes

```text
GET  /api/health
GET  /api/news
GET  /api/news?category=Chin%20News
GET  /api/news/:slug
POST /api/news
POST /api/auth/login
```

## File guide

```text
src/server.js                 starts Express and connects the routes
src/db.js                     creates the PostgreSQL connection pool
src/routes/newsRoutes.js      defines the API URLs
src/controllers/newsController.js contains the database operations
sql/schema.sql                creates the news_articles table
```
