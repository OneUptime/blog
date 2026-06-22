# How to Configure React Server Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: React, Server Component, Next.js, RSC, Performance, SSR, Full Stack, TypeScript

Description: Learn how to configure and use React Server Components to build faster applications with reduced client-side JavaScript.

---

React Server Components (RSC) execute on the server and stream an RSC payload and HTML to the client. They reduce client-side JavaScript by keeping Server Component code out of the browser bundle, support direct backend access, and enable automatic code splitting.

## What Are React Server Components?

```mermaid
flowchart LR
    subgraph Server
        SC[Server Component]
        DB[(Database)]
        SC --> DB
    end

    subgraph Client
        CC[Client Component]
        DOM[DOM]
        CC --> DOM
    end

    SC -->|RSC payload + HTML| CC
```

## Setting Up Next.js with Server Components

```bash
npx create-next-app@latest my-app --typescript --app
cd my-app
npm run dev
```

## Server vs Client Components

In Next.js App Router, components are Server Components by default. Add 'use client' for Client Components.

```typescript
// Server Component (default)
async function UserList(): Promise<React.ReactElement> {
  const users = await fetchUsersFromDatabase();
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

```typescript
// Client Component
'use client';

import { useState } from 'react';

function Counter(): React.ReactElement {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

## Data Fetching Pattern

```typescript
// app/products/page.tsx
import { Suspense } from 'react';
import ProductList from './ProductList';

export default function ProductsPage(): React.ReactElement {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductList category="electronics" />
    </Suspense>
  );
}
```

## Server Actions for Mutations

```typescript
// app/actions/user.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createUser(data: { name: string; email: string }) {
  await db.insert(users).values(data);
  revalidatePath('/users');
  return { success: true };
}
```

## Streaming with Suspense

```mermaid
sequenceDiagram
    Browser->>Server: Request /dashboard
    Server->>Browser: HTML shell + loading states
    Server->>Browser: Stream: Header
    Server->>Browser: Stream: Sidebar
    Server->>Browser: Stream: Main content
```

## Summary

| Feature | Server Components | Client Components |
|---------|------------------|-------------------|
| JavaScript to client | Component code is not bundled | Yes |
| Can use client hooks | No | Yes |
| Can access backend | Directly | Via APIs or Server Actions |
| Default in App Router | Yes | No |

Start with Server Components by default and add 'use client' only when you need interactivity.
