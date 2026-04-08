# How to Connect MongoDB to a Svelte Application via API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Svelte, API, Node.js, JavaScript

Description: Learn how to connect MongoDB to a Svelte application through a Node.js Express API or SvelteKit server routes, with readable stores for reactive state.

---

## Two Approaches for Svelte + MongoDB

There are two common ways to connect Svelte applications to MongoDB:

1. **Separate API**: Svelte (Vite-bundled) calls an external Express/Node.js API
2. **SvelteKit server routes**: SvelteKit's `+page.server.js` and API routes run server-side, allowing direct MongoDB access

This post covers both approaches.

## Approach 1: Svelte + External Express API

Set up the Node.js API:

```bash
mkdir mongo-api && cd mongo-api
npm init -y
npm install express mongoose cors dotenv
```

```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

const NoteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', NoteSchema);

app.get('/api/notes', async (req, res) => {
  res.json(await Note.find().sort({ createdAt: -1 }));
});

app.post('/api/notes', async (req, res) => {
  try {
    res.status(201).json(await Note.create(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

app.listen(5000);
```

In the Svelte app, use a writable store:

```javascript
// src/lib/stores/notes.js
import { writable } from 'svelte/store';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function createNotesStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    async load() {
      const res = await fetch(`${API}/api/notes`);
      set(await res.json());
    },
    async add(content) {
      const res = await fetch(`${API}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const note = await res.json();
      update(notes => [note, ...notes]);
    },
    async remove(id) {
      await fetch(`${API}/api/notes/${id}`, { method: 'DELETE' });
      update(notes => notes.filter(n => n._id !== id));
    }
  };
}

export const notes = createNotesStore();
```

Use in a Svelte component:

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { notes } from '$lib/stores/notes';

  let content = '';

  onMount(() => notes.load());

  async function handleSubmit() {
    if (!content.trim()) return;
    await notes.add(content.trim());
    content = '';
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <input bind:value={content} placeholder="New note" />
  <button type="submit">Add</button>
</form>

{#each $notes as note (note._id)}
  <div>
    <p>{note.content}</p>
    <button on:click={() => notes.remove(note._id)}>Delete</button>
  </div>
{/each}
```

## Approach 2: SvelteKit Server Routes

SvelteKit runs server-side code in `+page.server.js` and `+server.js` files, enabling direct MongoDB access without a separate API server:

```bash
npm create svelte@latest sveltekit-app
cd sveltekit-app
npm install mongoose
```

```javascript
// src/lib/server/db.js
import mongoose from 'mongoose';
import { MONGODB_URI } from '$env/static/private';

if (!mongoose.connection.readyState) {
  await mongoose.connect(MONGODB_URI);
}

const NoteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
```

```javascript
// src/routes/api/notes/+server.js
import { json } from '@sveltejs/kit';
import { Note } from '$lib/server/db.js';

export async function GET() {
  const notes = await Note.find().sort({ createdAt: -1 });
  return json(notes);
}

export async function POST({ request }) {
  const body = await request.json();
  const note = await Note.create(body);
  return json(note, { status: 201 });
}
```

In `.env`:

```text
MONGODB_URI=mongodb://localhost:27017/svelteapp
```

## Summary

Svelte applications connect to MongoDB either through a separate Node.js Express API (for plain Svelte/Vite apps) or via SvelteKit server routes that run Node.js code directly (for SvelteKit apps). Use Svelte's writable stores for reactive state management when working with an external API, and use SvelteKit's `$env/static/private` for secure server-only environment variables. Never include MongoDB URIs in client-side code or public environment variables.
