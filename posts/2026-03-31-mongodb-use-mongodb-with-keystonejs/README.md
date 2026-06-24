# How to Use MongoDB with KeystoneJS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, KeystoneJS, Node.js

Description: Build a content management backend with KeystoneJS and MongoDB, defining lists, fields, and access control with the Keystone GraphQL API.

---

## KeystoneJS and PostgreSQL

KeystoneJS is a Node.js headless CMS and web application framework that auto-generates a GraphQL API from your schema definitions. It supports PostgreSQL, MySQL, and SQLite through its `@keystone-6/core` package, using Prisma as its database layer. PostgreSQL is the recommended database for production use.

## Project Setup

```bash
npm create keystone-app@latest my-cms
cd my-cms
npm install
```

Or set up manually:

```bash
npm install @keystone-6/core @prisma/client
npm install --save-dev prisma
```

## Configuration

Edit `keystone.ts`:

```typescript
import { config } from '@keystone-6/core'
import { Post } from './schema'

export default config({
  db: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/myapp',
  },
  lists: {
    Post,
  },
})
```

## Defining a List (Schema)

Create `schema.ts`:

```typescript
import { list } from '@keystone-6/core'
import {
  text,
  relationship,
  timestamp,
  select,
  integer,
} from '@keystone-6/core/fields'
import { document } from '@keystone-6/fields-document'

export const Post = list({
  fields: {
    title: text({ validation: { isRequired: true } }),
    slug: text({ isIndexed: 'unique' }),
    content: document({
      formatting: true,
      links: true,
      dividers: true,
    }),
    status: select({
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
    }),
    publishedAt: timestamp(),
    viewCount: integer({ defaultValue: 0 }),
    author: relationship({ ref: 'Author.posts', many: false }),
  },
  access: {
    operation: {
      query: () => true,
      create: ({ session }) => Boolean(session),
      update: ({ session }) => Boolean(session),
      delete: ({ session }) => Boolean(session),
    },
  },
})
```

## Running the Application

```bash
# Start Keystone dev server with admin UI
npm run dev
```

The GraphQL playground is available at `http://localhost:3000/api/graphql`.

## Querying with GraphQL

```graphql
query GetPublishedPosts {
  posts(
    where: { status: { equals: "published" } }
    orderBy: { publishedAt: desc }
    take: 10
  ) {
    id
    title
    slug
    publishedAt
    author {
      name
      email
    }
  }
}
```

Mutation to create a post:

```graphql
mutation CreatePost($title: String!, $slug: String!) {
  createPost(data: {
    title: $title
    slug: $slug
    status: "draft"
  }) {
    id
    title
    slug
  }
}
```

## Custom Query with Prisma

For operations outside the Keystone API, you can use the Keystone context to access Prisma directly:

```typescript
import { getContext } from '@keystone-6/core/context'
import config from './keystone'
import * as PrismaModule from '.prisma/client'

const context = getContext(config, PrismaModule)

// Direct Prisma query
const topPosts = await context.prisma.post.findMany({
  where: { status: { equals: 'published' } },
  orderBy: { viewCount: 'desc' },
  take: 5,
})
```

## Summary

KeystoneJS with PostgreSQL provides an auto-generated GraphQL API from your list schema definitions, plus an admin UI for content management. Define your lists in `keystone.ts` with field types, relationships, and access control rules. Keystone handles the database connection, schema migrations via Prisma, and GraphQL resolver generation, letting you focus on your data model rather than boilerplate infrastructure code.
