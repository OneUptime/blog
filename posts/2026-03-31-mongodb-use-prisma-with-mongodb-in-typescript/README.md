# How to Use Prisma with MongoDB in TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Prisma, TypeScript, ORM, Schema

Description: Learn how to configure Prisma ORM with a MongoDB data source and write type-safe queries against MongoDB documents in TypeScript.

---

## Introduction

Prisma is a modern TypeScript ORM with a declarative schema language and auto-generated client. While originally SQL-focused, it supports MongoDB as a data source. Prisma generates a fully typed `PrismaClient` from your schema, making MongoDB queries as type-safe as working with a relational database.

## Installation

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider mongodb
```

## Prisma Schema for MongoDB

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model Product {
  id       String  @id @default(auto()) @map("_id") @db.ObjectId
  name     String
  price    Float
  category String
  inStock  Boolean @default(true)
  tags     String[]
  createdAt DateTime @default(now())

  @@index([category])
}

model Order {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  customerId String   @db.ObjectId
  items      OrderItem[]
  total      Float
  status     OrderStatus @default(PENDING)
  createdAt  DateTime    @default(now())
}

type OrderItem {
  productId String @db.ObjectId
  qty       Int
  price     Float
}

enum OrderStatus {
  PENDING
  FULFILLED
  CANCELLED
}
```

## Generating the Client

```bash
npx prisma generate
```

## CRUD with PrismaClient

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create
const product = await prisma.product.create({
  data: {
    name:     'Laptop',
    price:    999.99,
    category: 'electronics',
    tags:     ['portable', 'work'],
  },
});

// Read
const electronics = await prisma.product.findMany({
  where:   { category: 'electronics', inStock: true },
  orderBy: { price: 'asc' },
  take:    10,
});

// Update
await prisma.product.update({
  where: { id: product.id },
  data:  { price: 899.99 },
});

// Upsert
await prisma.product.upsert({
  where:  { id: product.id },
  update: { price: 799.99 },
  create: { name: 'Laptop', price: 999.99, category: 'electronics' },
});

// Delete
await prisma.product.delete({ where: { id: product.id } });

await prisma.$disconnect();
```

## Embedded Types

MongoDB embedded documents are modelled as Prisma `type` blocks and stored inside the parent document:

```typescript
await prisma.order.create({
  data: {
    customerId: '507f1f77bcf86cd799439011',
    total:      149.99,
    items: [
      { productId: product.id, qty: 1, price: 999.99 }
    ],
  },
});
```

## Summary

Prisma with MongoDB uses a `schema.prisma` file with `provider = "mongodb"` to define models and embedded types. Running `prisma generate` creates a fully typed `PrismaClient`. CRUD operations feel like working with a typed SQL ORM, with auto-completion on every field name and value. Use the `type` block for MongoDB embedded documents.
