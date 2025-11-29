MERN Blogging App (scaffold)
============================

Structure:
- server/  -> Express + MongoDB backend
- client/  -> React frontend (react-quill editor)

Setup (locally)
1. Install MongoDB and run it locally.
2. Server:
   cd server
   cp .env.example .env   # edit MONGO_URI and JWT_SECRET
   npm install
   npm run dev
3. Client:
   cd client
   npm install
   npm start
4. Open http://localhost:3000 for the React app and ensure server is at http://localhost:5000 (default).

Notes:
- This is a starter full-stack project with JWT auth, posts (with rich text), likes, comments, profile, admin dashboard, search & category filtering.
- Each page has a separate CSS file in client/src/styles.
- You'll likely want to harden validations, add file uploads, pagination UI, and production build configs before deploying.
