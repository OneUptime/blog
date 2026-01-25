# How to Use Prisma ORM with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Prisma, ORM, Database, TypeScript

Description: Get started with Prisma ORM in Node.js applications covering schema design, migrations, CRUD operations, relations, and query optimization techniques.

---

Prisma is a modern ORM that makes database access feel natural in TypeScript and JavaScript. Unlike traditional ORMs, Prisma uses a declarative schema file and generates type-safe client code. This means autocomplete for your database queries and errors caught at compile time.

## Installation and Setup

Initialize Prisma in your Node.js project:

```bash
npm install prisma @prisma/client
npx prisma init
```

This creates a `prisma` folder with a `schema.prisma` file and adds a `.env` file for your database connection.

Configure your database connection in `.env`:

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# MySQL
DATABASE_URL="mysql://user:password@localhost:3306/mydb"

# SQLite (great for development)
DATABASE_URL="file:./dev.db"
```

## Schema Design

Define your data models in `prisma/schema.prisma`:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"  // or mysql, sqlite, mongodb
  url      = env("DATABASE_URL")
}

// User model
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String?
  password  String
  role      Role      @default(USER)
  posts     Post[]    // One-to-many relation
  profile   Profile?  // One-to-one relation
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([email])  // Database index
}

// Profile model (one-to-one with User)
model Profile {
  id     Int     @id @default(autoincrement())
  bio    String?
  avatar String?
  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int     @unique
}

// Post model (many-to-one with User)
model Post {
  id          Int        @id @default(autoincrement())
  title       String
  content     String?
  published   Boolean    @default(false)
  author      User       @relation(fields: [authorId], references: [id])
  authorId    Int
  categories  Category[] // Many-to-many relation
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([authorId])
  @@index([published])
}

// Category model (many-to-many with Post)
model Category {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}

// Enum for user roles
enum Role {
  USER
  ADMIN
  MODERATOR
}
```

## Migrations

Apply your schema to the database:

```bash
# Create and apply migration
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

Generate the Prisma Client after schema changes:

```bash
npx prisma generate
```

## Basic CRUD Operations

```javascript
// src/db.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
```

### Create Records

```javascript
const prisma = require('./db');

// Create a single user
async function createUser() {
    const user = await prisma.user.create({
        data: {
            email: 'john@example.com',
            name: 'John Doe',
            password: 'hashedpassword'
        }
    });
    return user;
}

// Create user with related profile
async function createUserWithProfile() {
    const user = await prisma.user.create({
        data: {
            email: 'jane@example.com',
            name: 'Jane Smith',
            password: 'hashedpassword',
            profile: {
                create: {
                    bio: 'Software developer',
                    avatar: 'https://example.com/avatar.jpg'
                }
            }
        },
        include: {
            profile: true  // Include profile in response
        }
    });
    return user;
}

// Create multiple records
async function createManyUsers() {
    const count = await prisma.user.createMany({
        data: [
            { email: 'user1@example.com', name: 'User 1', password: 'hash1' },
            { email: 'user2@example.com', name: 'User 2', password: 'hash2' },
            { email: 'user3@example.com', name: 'User 3', password: 'hash3' }
        ],
        skipDuplicates: true  // Ignore duplicates
    });
    return count;
}
```

### Read Records

```javascript
// Find unique record
async function getUserById(id) {
    const user = await prisma.user.findUnique({
        where: { id }
    });
    return user;
}

async function getUserByEmail(email) {
    const user = await prisma.user.findUnique({
        where: { email }
    });
    return user;
}

// Find first matching record
async function findFirstAdmin() {
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });
    return admin;
}

// Find many with filtering
async function getPublishedPosts(authorId) {
    const posts = await prisma.post.findMany({
        where: {
            authorId,
            published: true
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10,  // Limit
        skip: 0    // Offset
    });
    return posts;
}

// Complex filtering
async function searchPosts(query) {
    const posts = await prisma.post.findMany({
        where: {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } }
            ],
            AND: {
                published: true
            }
        }
    });
    return posts;
}
```

### Update Records

```javascript
// Update single record
async function updateUser(id, data) {
    const user = await prisma.user.update({
        where: { id },
        data: {
            name: data.name,
            email: data.email
        }
    });
    return user;
}

// Update or create (upsert)
async function upsertUser(email, data) {
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name: data.name
        },
        create: {
            email,
            name: data.name,
            password: data.password
        }
    });
    return user;
}

// Update many records
async function publishAllDrafts(authorId) {
    const result = await prisma.post.updateMany({
        where: {
            authorId,
            published: false
        },
        data: {
            published: true
        }
    });
    return result.count;  // Number of updated records
}
```

### Delete Records

```javascript
// Delete single record
async function deleteUser(id) {
    const user = await prisma.user.delete({
        where: { id }
    });
    return user;
}

// Delete many records
async function deleteOldPosts(date) {
    const result = await prisma.post.deleteMany({
        where: {
            createdAt: { lt: date },
            published: false
        }
    });
    return result.count;
}
```

## Working with Relations

### Include Related Data

```javascript
// Get user with posts
async function getUserWithPosts(id) {
    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            posts: true,
            profile: true
        }
    });
    return user;
}

// Nested includes
async function getPostWithDetails(id) {
    const post = await prisma.post.findUnique({
        where: { id },
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            categories: true
        }
    });
    return post;
}
```

### Select Specific Fields

```javascript
// Only return specific fields
async function getUserEmails() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true
        }
    });
    return users;
}
```

### Connect and Disconnect Relations

```javascript
// Add categories to a post
async function addCategoriesToPost(postId, categoryIds) {
    const post = await prisma.post.update({
        where: { id: postId },
        data: {
            categories: {
                connect: categoryIds.map(id => ({ id }))
            }
        },
        include: { categories: true }
    });
    return post;
}

// Remove category from post
async function removeCategoryFromPost(postId, categoryId) {
    const post = await prisma.post.update({
        where: { id: postId },
        data: {
            categories: {
                disconnect: { id: categoryId }
            }
        }
    });
    return post;
}
```

## Transactions

```javascript
// Interactive transaction
async function transferCredits(fromUserId, toUserId, amount) {
    const result = await prisma.$transaction(async (tx) => {
        // Deduct from sender
        const sender = await tx.user.update({
            where: { id: fromUserId },
            data: { credits: { decrement: amount } }
        });

        if (sender.credits < 0) {
            throw new Error('Insufficient credits');
        }

        // Add to receiver
        const receiver = await tx.user.update({
            where: { id: toUserId },
            data: { credits: { increment: amount } }
        });

        return { sender, receiver };
    });

    return result;
}

// Batch transaction
async function batchOperations() {
    const [user, post] = await prisma.$transaction([
        prisma.user.create({ data: { email: 'new@example.com', password: 'hash' } }),
        prisma.post.create({ data: { title: 'New Post', authorId: 1 } })
    ]);
    return { user, post };
}
```

## Pagination

```javascript
async function getPaginatedUsers(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count()
    ]);

    return {
        data: users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
}

// Cursor-based pagination (better for large datasets)
async function getCursorPaginatedPosts(cursor, limit = 10) {
    const posts = await prisma.post.findMany({
        take: limit,
        ...(cursor && {
            skip: 1,  // Skip the cursor
            cursor: { id: cursor }
        }),
        orderBy: { id: 'asc' }
    });

    return {
        data: posts,
        nextCursor: posts.length === limit ? posts[posts.length - 1].id : null
    };
}
```

## Raw Queries

When you need direct SQL access:

```javascript
// Raw query
async function complexQuery() {
    const result = await prisma.$queryRaw`
        SELECT u.*, COUNT(p.id) as post_count
        FROM "User" u
        LEFT JOIN "Post" p ON u.id = p."authorId"
        GROUP BY u.id
        HAVING COUNT(p.id) > 5
    `;
    return result;
}

// Raw execute (for INSERT, UPDATE, DELETE)
async function rawUpdate() {
    const result = await prisma.$executeRaw`
        UPDATE "User" SET "updatedAt" = NOW() WHERE id = ${userId}
    `;
    return result;  // Number of affected rows
}
```

## Cleanup

Always disconnect Prisma when your app shuts down:

```javascript
const prisma = require('./db');

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
```

## Summary

Prisma brings type safety and excellent developer experience to database access in Node.js. Define your schema declaratively, let Prisma generate migrations and a type-safe client, then use intuitive methods for CRUD operations. The generated types work perfectly with TypeScript, catching errors before runtime. For complex queries, you always have raw SQL as a fallback.
