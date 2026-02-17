# How to Build a Serverless REST API with Azure Functions and Prisma ORM in TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Prisma, TypeScript, Serverless, REST API, ORM, Node.js

Description: Build a serverless REST API with Azure Functions and Prisma ORM in TypeScript for type-safe database access with automatic migrations.

---

Prisma ORM has become the go-to database toolkit for TypeScript developers. It gives you a type-safe query API generated from your schema, automatic migrations, and excellent developer ergonomics. Azure Functions gives you serverless compute that scales automatically and charges only for execution time. Together, they make a compelling stack for building APIs without managing servers or writing raw SQL.

In this post, we will build a complete serverless REST API using Azure Functions v4 with the TypeScript programming model and Prisma ORM connected to an Azure PostgreSQL database.

## Project Setup

```bash
# Create a new Azure Functions project with TypeScript
func init prisma-api --typescript
cd prisma-api

# Install Prisma and other dependencies
npm install @prisma/client
npm install -D prisma
```

## Step 1: Define the Prisma Schema

Initialize Prisma and define your data model.

```bash
# Initialize Prisma
npx prisma init --datasource-provider postgresql
```

```prisma
// prisma/schema.prisma
// Database schema for the blog API
generator client {
  provider = "prisma-client-js"
  // Bundle for Azure Functions deployment
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  bio       String?
  posts     Post[]
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id          String    @id @default(uuid())
  title       String
  content     String
  published   Boolean   @default(false)
  author      User      @relation(fields: [authorId], references: [id])
  authorId    String
  tags        Tag[]
  comments    Comment[]
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([authorId])
  @@index([published])
}

model Comment {
  id        String   @id @default(uuid())
  content   String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String
  createdAt DateTime @default(now())

  @@index([postId])
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  posts Post[]
}
```

Run the initial migration.

```bash
# Create and apply the migration
npx prisma migrate dev --name init

# Generate the Prisma client
npx prisma generate
```

## Step 2: Create a Prisma Client Singleton

In serverless environments, you need to manage the database connection carefully. Creating a new Prisma client on every function invocation wastes time on connection setup. Instead, reuse the client across invocations.

```typescript
// src/lib/prisma.ts
// Singleton Prisma client for Azure Functions
import { PrismaClient } from '@prisma/client';

// Store the client in a global variable so it persists across warm invocations
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      // Log slow queries in development
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],

      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Connection pooling is handled by Prisma's connection pool
    // Default pool size is 5 connections per function instance
  }

  return prisma;
}
```

## Step 3: Implement the API Functions

Build the CRUD functions for posts.

```typescript
// src/functions/posts.ts
// Azure Functions for post CRUD operations
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrismaClient } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const prisma = getPrismaClient();

// GET /api/posts - List posts with pagination and filtering
app.http('listPosts', {
  methods: ['GET'],
  route: 'posts',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const published = url.searchParams.get('published');
    const tag = url.searchParams.get('tag');
    const search = url.searchParams.get('search');

    // Build the where clause dynamically
    const where: Prisma.PostWhereInput = {};

    if (published !== null) {
      where.published = published === 'true';
    }

    if (tag) {
      where.tags = { some: { name: tag } };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute query and count in parallel
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true } },
          tags: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      jsonBody: {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  },
});

// GET /api/posts/:id - Get a single post
app.http('getPost', {
  methods: ['GET'],
  route: 'posts/{id}',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const id = request.params.id;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true } },
        tags: true,
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!post) {
      return { status: 404, jsonBody: { error: 'Post not found' } };
    }

    return { jsonBody: post };
  },
});

// POST /api/posts - Create a new post
app.http('createPost', {
  methods: ['POST'],
  route: 'posts',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await request.json()) as any;

    // Validate required fields
    if (!body.title || !body.content || !body.authorId) {
      return {
        status: 400,
        jsonBody: { error: 'title, content, and authorId are required' },
      };
    }

    try {
      const post = await prisma.post.create({
        data: {
          title: body.title,
          content: body.content,
          published: body.published || false,
          publishedAt: body.published ? new Date() : null,
          author: { connect: { id: body.authorId } },
          // Connect existing tags or create new ones
          tags: body.tags
            ? {
                connectOrCreate: body.tags.map((tag: string) => ({
                  where: { name: tag },
                  create: { name: tag },
                })),
              }
            : undefined,
        },
        include: {
          author: { select: { id: true, name: true } },
          tags: true,
        },
      });

      return { status: 201, jsonBody: post };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return { status: 404, jsonBody: { error: 'Author not found' } };
        }
      }
      throw error;
    }
  },
});

// PUT /api/posts/:id - Update a post
app.http('updatePost', {
  methods: ['PUT'],
  route: 'posts/{id}',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const id = request.params.id;
    const body = (await request.json()) as any;

    try {
      const post = await prisma.post.update({
        where: { id },
        data: {
          title: body.title,
          content: body.content,
          published: body.published,
          publishedAt: body.published ? new Date() : undefined,
          // Update tags by disconnecting all and reconnecting
          tags: body.tags
            ? {
                set: [],  // Disconnect all existing tags
                connectOrCreate: body.tags.map((tag: string) => ({
                  where: { name: tag },
                  create: { name: tag },
                })),
              }
            : undefined,
        },
        include: {
          author: { select: { id: true, name: true } },
          tags: true,
        },
      });

      return { jsonBody: post };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return { status: 404, jsonBody: { error: 'Post not found' } };
        }
      }
      throw error;
    }
  },
});

// DELETE /api/posts/:id - Delete a post
app.http('deletePost', {
  methods: ['DELETE'],
  route: 'posts/{id}',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const id = request.params.id;

    try {
      await prisma.post.delete({ where: { id } });
      return { status: 204 };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return { status: 404, jsonBody: { error: 'Post not found' } };
        }
      }
      throw error;
    }
  },
});
```

## Step 4: Add User Functions

```typescript
// src/functions/users.ts
// Azure Functions for user operations
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getPrismaClient } from '../lib/prisma';

const prisma = getPrismaClient();

// POST /api/users - Create a user
app.http('createUser', {
  methods: ['POST'],
  route: 'users',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await request.json()) as any;

    if (!body.email || !body.name) {
      return { status: 400, jsonBody: { error: 'email and name are required' } };
    }

    try {
      const user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          bio: body.bio,
        },
      });

      return { status: 201, jsonBody: user };
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { status: 409, jsonBody: { error: 'Email already exists' } };
      }
      throw error;
    }
  },
});

// GET /api/users/:id - Get a user with their posts
app.http('getUser', {
  methods: ['GET'],
  route: 'users/{id}',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const id = request.params.id;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          where: { published: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, title: true, publishedAt: true },
        },
        _count: { select: { posts: true, comments: true } },
      },
    });

    if (!user) {
      return { status: 404, jsonBody: { error: 'User not found' } };
    }

    return { jsonBody: user };
  },
});
```

## Step 5: Deploy

Configure the Azure PostgreSQL database and deploy.

```bash
# Create an Azure PostgreSQL Flexible Server
az postgres flexible-server create \
  --name prisma-blog-db \
  --resource-group prisma-rg \
  --location eastus \
  --sku-name Standard_B1ms \
  --version 15 \
  --admin-user adminuser \
  --admin-password YourPassword123!

# Create the database
az postgres flexible-server db create \
  --server-name prisma-blog-db \
  --resource-group prisma-rg \
  --database-name blogdb

# Run Prisma migrations against the production database
DATABASE_URL="postgresql://adminuser:YourPassword123!@prisma-blog-db.postgres.database.azure.com:5432/blogdb?sslmode=require" \
  npx prisma migrate deploy

# Deploy the function app
func azure functionapp publish prisma-blog-api
```

## Cold Start Optimization

Serverless functions have cold starts. The Prisma client adds to this because it needs to establish a database connection on the first invocation. Here are some strategies to minimize the impact:

- Keep the function warm with a timer trigger that pings it every few minutes
- Use Premium plan or dedicated plan for critical APIs to avoid cold starts entirely
- Minimize the Prisma client bundle by only generating the client for the platforms you need

```typescript
// Warm-up function that keeps the Prisma connection alive
app.timer('warmup', {
  schedule: '0 */5 * * * *', // Every 5 minutes
  handler: async () => {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
  },
});
```

## Summary

Azure Functions and Prisma ORM make a productive combination for building serverless APIs. Prisma handles the database layer with type-safe queries and schema migrations, while Azure Functions handles the compute with automatic scaling. The main things to watch out for are connection management (use a singleton client), cold starts (consider a warm-up function or Premium plan), and deployment (include the right Prisma binary targets). This stack works particularly well for CRUD-heavy APIs where type safety and developer productivity are priorities.
