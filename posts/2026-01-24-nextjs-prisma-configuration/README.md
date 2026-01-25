# How to Configure Next.js with Prisma

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NextJS, Prisma, Database, ORM, TypeScript

Description: A complete guide to setting up Prisma ORM with Next.js including schema design, client configuration, migrations, and production best practices.

---

Prisma is a modern database ORM that pairs exceptionally well with Next.js. It provides type-safe database queries, automatic migrations, and an intuitive schema language. This guide walks through the complete setup process from installation to production deployment.

## Architecture Overview

```mermaid
flowchart LR
    A[Next.js App] --> B[Prisma Client]
    B --> C[Connection Pool]
    C --> D[(PostgreSQL)]

    E[prisma/schema.prisma] --> F[prisma generate]
    F --> B

    E --> G[prisma migrate]
    G --> D

    style A fill:#0070f3
    style B fill:#2d3748
    style D fill:#336791
```

## Installation

```bash
# Install Prisma as a dev dependency and the client as a regular dependency
npm install prisma --save-dev
npm install @prisma/client

# Initialize Prisma with PostgreSQL (or mysql, sqlite, mongodb, etc.)
npx prisma init --datasource-provider postgresql
```

This creates the following structure:

```plaintext
project/
  prisma/
    schema.prisma    # Database schema definition
  .env               # Environment variables (DATABASE_URL)
```

## Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model with relations
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  posts     Post[]
  profile   Profile?

  @@index([email])
}

model Profile {
  id     String  @id @default(cuid())
  bio    String?
  avatar String?

  // One-to-one relation
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String @unique
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Many-to-one relation
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String

  // Many-to-many relation
  categories Category[]

  @@index([authorId])
  @@index([published])
}

model Category {
  id    String @id @default(cuid())
  name  String @unique
  slug  String @unique
  posts Post[]
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

## Environment Configuration

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# For connection pooling in production (e.g., with PgBouncer)
# DATABASE_URL="postgresql://user:password@pooler.example.com:6543/mydb?pgbouncer=true"
```

```bash
# .env.local (for local development overrides)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextjs_dev"
```

## Prisma Client Singleton

Create a singleton instance to prevent multiple Prisma Client instances in development.

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

## Running Migrations

```bash
# Create and apply a migration
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma Client after schema changes
npx prisma generate
```

## Using Prisma in Server Components

```tsx
// app/users/page.tsx
import prisma from '@/lib/prisma';

export default async function UsersPage() {
  // Direct database query in Server Component
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: { posts: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email}) - {user._count.posts} posts
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Using Prisma in Route Handlers

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: body.password, // Hash this in production!
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    throw error;
  }
}
```

## Using Prisma in Server Actions

```typescript
// app/actions/posts.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const authorId = formData.get('authorId') as string;

  const post = await prisma.post.create({
    data: {
      title,
      content,
      authorId,
    },
  });

  revalidatePath('/posts');
  return post;
}

export async function publishPost(postId: string) {
  const post = await prisma.post.update({
    where: { id: postId },
    data: { published: true },
  });

  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  return post;
}

export async function deletePost(postId: string) {
  await prisma.post.delete({
    where: { id: postId },
  });

  revalidatePath('/posts');
}
```

## Complex Queries

```typescript
// lib/queries/posts.ts
import prisma from '@/lib/prisma';

export async function getPostsWithFilters({
  published,
  authorId,
  categorySlug,
  search,
  page = 1,
  limit = 10,
}: {
  published?: boolean;
  authorId?: string;
  categorySlug?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const where = {
    // Conditionally add filters
    ...(published !== undefined && { published }),
    ...(authorId && { authorId }),
    ...(categorySlug && {
      categories: {
        some: { slug: categorySlug },
      },
    }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        categories: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { categories: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total, pages: Math.ceil(total / limit) };
}
```

## Transaction Handling

```typescript
// lib/queries/users.ts
import prisma from '@/lib/prisma';

export async function createUserWithProfile(data: {
  email: string;
  name: string;
  password: string;
  bio?: string;
}) {
  // Interactive transaction for complex operations
  return prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
      },
    });

    // Create profile
    const profile = await tx.profile.create({
      data: {
        userId: user.id,
        bio: data.bio,
      },
    });

    // Create initial welcome post
    await tx.post.create({
      data: {
        title: 'Welcome to my blog!',
        content: 'This is my first post.',
        authorId: user.id,
        published: true,
      },
    });

    return { user, profile };
  });
}

export async function transferPosts(fromUserId: string, toUserId: string) {
  // Batch transaction
  return prisma.$transaction([
    prisma.post.updateMany({
      where: { authorId: fromUserId },
      data: { authorId: toUserId },
    }),
    prisma.user.delete({
      where: { id: fromUserId },
    }),
  ]);
}
```

## Middleware and Extensions

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    // Add computed fields
    result: {
      user: {
        fullName: {
          needs: { name: true },
          compute(user) {
            return user.name || 'Anonymous';
          },
        },
      },
      post: {
        excerpt: {
          needs: { content: true },
          compute(post) {
            return post.content?.slice(0, 200) + '...' || '';
          },
        },
      },
    },
    // Add custom methods
    model: {
      user: {
        async findByEmail(email: string) {
          return prisma.user.findUnique({ where: { email } });
        },
      },
    },
    // Add query hooks
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const end = performance.now();

          console.log(`${model}.${operation} took ${end - start}ms`);

          return result;
        },
      },
    },
  });
};

declare global {
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
```

## Connection Pooling for Serverless

```mermaid
flowchart TD
    A[Serverless Function 1] --> B[Connection Pool]
    C[Serverless Function 2] --> B
    D[Serverless Function 3] --> B
    B --> E[(Database)]

    subgraph "Without Pooling"
        F[Function] --> G[Connection 1]
        H[Function] --> I[Connection 2]
        J[Function] --> K[Connection 3]
        G --> L[(Database)]
        I --> L
        K --> L
    end

    style B fill:#4caf50
    style E fill:#336791
    style L fill:#336791
```

```typescript
// lib/prisma.ts - Optimized for serverless
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Use connection pooling in production
const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;
```

## Seeding the Database

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.post.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: 'Technology', slug: 'technology' },
    }),
    prisma.category.create({
      data: { name: 'Lifestyle', slug: 'lifestyle' },
    }),
    prisma.category.create({
      data: { name: 'Travel', slug: 'travel' },
    }),
  ]);

  // Create users with posts
  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'hashed_password_here',
      role: 'ADMIN',
      profile: {
        create: {
          bio: 'Platform administrator',
        },
      },
      posts: {
        create: [
          {
            title: 'Getting Started with Next.js',
            content: 'Next.js is a React framework...',
            published: true,
            categories: {
              connect: [{ id: categories[0].id }],
            },
          },
          {
            title: 'Understanding Prisma',
            content: 'Prisma is a modern ORM...',
            published: true,
            categories: {
              connect: [{ id: categories[0].id }],
            },
          },
        ],
      },
    },
  });

  console.log('Database seeded successfully');
  console.log({ user, categories });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```json
// package.json - Add seed script
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

## Production Checklist

| Task | Command/Action |
|------|----------------|
| Run migrations | `npx prisma migrate deploy` |
| Generate client | `npx prisma generate` |
| Set DATABASE_URL | Use connection pooler URL |
| Enable query logging | Set to `['error']` only |
| Connection pool size | Match serverless concurrency |
| Health check | Add `/api/health` endpoint |

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Simple query to verify database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
      },
      { status: 503 }
    );
  }
}
```

## Summary

Prisma provides a powerful, type-safe way to interact with databases in Next.js. Key points to remember:

1. Use a singleton pattern to prevent multiple client instances
2. Place database queries in Server Components or Route Handlers
3. Use transactions for complex multi-step operations
4. Configure connection pooling for serverless environments
5. Run migrations in CI/CD before deployment
6. Keep the Prisma Client generated and in sync with your schema
