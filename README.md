
# 📝 MERN Blogging Platform

A complete full-stack **Blogging Web Application** built using the **MERN stack** supporting authentication, blog posting with rich text editor, image uploads, likes, comments, categories, search and an admin panel for post/user management.

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [User Features](#user-features)
  - [Author Features](#author-features)
  - [Admin Features](#admin-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [API Overview](#api-overview)
  - [Auth](#auth)
  - [Posts](#posts)
  - [Comments & Likes](#comments--likes)
  - [Users & Profile](#users--profile)
  - [Uploads](#uploads)
  - [Admin](#admin)
- [Available Scripts](#available-scripts)
- [Future Improvements](#future-improvements)
- [License](#license)

## 🔥 Overview

This project is a **MERN based blogging platform** where users can register/login, create blogs with images, like posts, comment, view profile statistics and use an admin panel to manage users/posts.

| Folder | Description |
|--------|-------------|
| `/client` | React Frontend |
| `/server` | API Backend + Database |

## ✨ Features

### 👥 User Features

- Register / Login / Logout (JWT Protected)
- View, search, filter posts
- Like & comment on blogs
- Responsive layout + UI theme

### ✍ Author Features

- Create/Edit posts using ReactQuill
- Auto-draft save
- Upload images
- Categorize posts with tags
- Profile dashboard (stats, bio, avatar updates)

### 🔐 Admin Features

- View/delete users & blogs
- Admin role protected
- Admin routes secured using middleware

## 🛠 Tech Stack

### Frontend
- React 18, React Router, Axios, ReactQuill, CSS

### Backend
- Node.js, Express.js, MongoDB, Mongoose, JWT, Multer, bcryptjs

## 📂 Project Structure

```
Blogging Website/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── App.js
│   ├── .env
│   └── package.json
└── server/
    ├── models/
    ├── routes/
    ├── uploads/
    ├── middleware_auth.js
    ├── index.js
    ├── .env
    └── package.json
```

## 🚀 Getting Started

### 1️⃣ Prerequisites

| Requirement | Version |
|-------------|----------|
| Node.js     | 16+      |
| MongoDB     | Local/Atlas |
| NPM/Yarn    | Latest   |

### 2️⃣ Installation

```bash
git clone <your-repo-url>
cd "Blogging Website"

cd server && npm install
cd ../client && npm install
```

### 3️⃣ Environment Variables

`server/.env`:

```
MONGO_URI=
JWT_SECRET=
ADMIN_KEY=
PORT=5000
```

`client/.env`:

```
REACT_APP_API=http://localhost:5000/api
```

### 4️⃣ Run App

```bash
cd server && npm run dev
cd ../client && npm start
```

| Service | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |

## 📡 API Overview

| Method | Route | Use |
|---|---|---|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login user |
| GET | `/posts` | Fetch blogs |
| POST | `/posts` | Create blog |
| POST | `/uploads` | Image upload |
| GET | `/admin/users` | Admin: Users |
| GET | `/admin/posts` | Admin: Posts |

## 🔧 Scripts

| Area | Script |
|---|---|
| Client | `npm start`, `npm build` |
| Server | `npm start`, `npm run dev` |

## 🚀 Future Improvements

- Reset password system
- Notifications
- Follow users
- SEO metadata
- Draft scheduling

## 📄 License

Open for modification.

### ⭐ Consider giving a star if this helped!
