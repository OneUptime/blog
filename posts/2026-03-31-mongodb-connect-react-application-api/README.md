# How to Connect MongoDB to a React Application via API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, React, API, Node.js, JavaScript

Description: Learn how to connect MongoDB to a React application through a Node.js Express API, covering setup, data fetching, and environment configuration.

---

## Architecture Overview

React is a browser-based framework and cannot connect to MongoDB directly - the MongoDB driver runs in Node.js, not the browser. The correct pattern is a three-tier architecture: React frontend communicates with a Node.js/Express REST API, which connects to MongoDB. This keeps your database credentials server-side and your data access logic centralized.

```text
React (browser)  <-->  Express API (Node.js)  <-->  MongoDB
```

## Setting Up the Express API

Initialize the backend:

```bash
mkdir mongodb-api && cd mongodb-api
npm init -y
npm install express mongoose cors dotenv
```

Create the server:

```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a simple model
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', PostSchema);

// REST endpoints
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(20);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const post = await Post.create(req.body);
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
```

Create the environment file:

```text
MONGODB_URI=mongodb://localhost:27017/myapp
CLIENT_URL=http://localhost:3000
PORT=5000
```

## Connecting from React

Initialize the React app and install axios:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install axios
```

Create an API service module:

```javascript
// src/services/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

export const fetchPosts = () => api.get('/api/posts');
export const createPost = (data) => api.post('/api/posts', data);
export const deletePost = (id) => api.delete(`/api/posts/${id}`);
```

Use the service in a React component:

```javascript
// src/components/PostList.jsx
import React, { useState, useEffect } from 'react';
import { fetchPosts, createPost, deletePost } from '../services/api';

function PostList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts()
      .then(res => {
        setPosts(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id) => {
    await deletePost(id);
    setPosts(posts.filter(p => p._id !== id));
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {posts.map(post => (
        <li key={post._id}>
          <h3>{post.title}</h3>
          <p>{post.body}</p>
          <button onClick={() => handleDelete(post._id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}

export default PostList;
```

## Environment Configuration for Production

In production, never expose your MongoDB URI to the client. Set environment variables in your deployment platform:

```bash
# .env.production (server-side only, never committed)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/prod?retryWrites=true&w=majority

# React .env (public, only for API URL)
VITE_API_URL=https://api.yourdomain.com
```

## Summary

Connecting MongoDB to React requires a Node.js API layer - React cannot connect to MongoDB directly. Set up an Express server with Mongoose, expose REST endpoints, and call those endpoints from React using axios or the Fetch API. Keep MongoDB credentials exclusively server-side, use environment variables for configuration, and structure your API service as a separate module to keep your components clean.
