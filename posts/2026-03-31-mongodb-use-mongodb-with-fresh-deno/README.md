# How to Use MongoDB with Fresh (Deno)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Deno, Fresh

Description: Connect a Fresh (Deno) web application to MongoDB using the official Deno MongoDB driver, with route handlers and island components for full-stack data access.

---

## Fresh and MongoDB

Fresh is a Deno web framework built on Preact with islands architecture. It runs server-side rendering by default and uses Deno's native module system. The official MongoDB driver for Deno (`npm:mongodb` or the Deno-native driver) integrates cleanly with Fresh's server routes and API handlers.

## Project Setup

```bash
deno run -A https://deno.land/x/fresh@1.6.0/init.ts my-app
cd my-app
```

## MongoDB Client Setup

Create `utils/db.ts`:

```typescript
import { MongoClient, ObjectId } from "npm:mongodb@6.3.0"

const uri = Deno.env.get("MONGO_URI") ?? "mongodb://localhost:27017"
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
})

let db: ReturnType<typeof client.db>

export async function getDb() {
  if (!db) {
    await client.connect()
    db = client.db(Deno.env.get("MONGO_DB") ?? "freshapp")
  }
  return db
}

export { ObjectId }
```

Add to `.env`:

```text
MONGO_URI=mongodb://localhost:27017
MONGO_DB=freshapp
```

Add to `deno.json`:

```json
{
  "tasks": {
    "start": "deno run -A --watch=static/,routes/ dev.ts"
  },
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@1.6.0/",
    "preact": "https://esm.sh/preact@10.19.0",
    "preact/": "https://esm.sh/preact@10.19.0/"
  }
}
```

## API Route Handler

Create `routes/api/posts.ts`:

```typescript
import { Handlers } from "$fresh/server.ts"
import { getDb, ObjectId } from "../../utils/db.ts"

interface Post {
  title: string
  body: string
  createdAt: Date
}

export const handler: Handlers = {
  async GET(req) {
    const db = await getDb()
    const posts = await db.collection<Post>("posts")
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()
    return new Response(JSON.stringify(posts), {
      headers: { "Content-Type": "application/json" },
    })
  },

  async POST(req) {
    const body = await req.json()
    if (!body.title || !body.body) {
      return new Response(JSON.stringify({ error: "Title and body required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }
    const db = await getDb()
    const result = await db.collection<Post>("posts").insertOne({
      title: body.title,
      body: body.body,
      createdAt: new Date(),
    })
    return new Response(JSON.stringify({ id: result.insertedId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  },
}
```

## Server-Side Rendered Route

Create `routes/posts/index.tsx`:

```typescript
import { Handlers, PageProps } from "$fresh/server.ts"
import { getDb } from "../../utils/db.ts"

interface Post { _id: string; title: string; createdAt: string }

export const handler: Handlers<Post[]> = {
  async GET(_, ctx) {
    const db = await getDb()
    const posts = await db.collection("posts")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()
    return ctx.render(JSON.parse(JSON.stringify(posts)))
  },
}

export default function PostsPage({ data }: PageProps<Post[]>) {
  return (
    <main>
      <h1>Posts</h1>
      <ul>
        {data.map(p => <li key={p._id}>{p.title}</li>)}
      </ul>
    </main>
  )
}
```

## Running the Application

```bash
deno task start
```

## Summary

Fresh integrates with MongoDB through the official MongoDB npm driver imported via Deno's npm compatibility layer. Create a shared database client module that lazily connects on first use, use Handlers in route files for both API endpoints and server-rendered pages, and pass MongoDB data through Fresh's page props system. Deno's built-in TypeScript support and Fresh's zero-client-JS default make for a lightweight MongoDB-backed web application.
