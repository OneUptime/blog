# How to Use MySQL with Prisma ORM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Prisma, Node.js, ORM, TypeScript

Description: Learn how to set up Prisma ORM with MySQL, define a schema, generate migrations, and query data using Prisma Client in a Node.js or TypeScript application.

---

## Introduction

Prisma is a modern ORM for Node.js and TypeScript that uses a declarative schema file to define models, generates a fully type-safe client, and handles database migrations. It supports MySQL natively and provides an intuitive query API that eliminates the need to write raw SQL for most operations.

## Installation

```bash
npm install prisma @prisma/client
npx prisma init
```

## Configuring the MySQL Connection

In `.env`:

```text
DATABASE_URL="mysql://root:password@localhost:3306/mydb"
```

In `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

## Defining the Schema

```prisma
model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique @db.VarChar(100)
  products Product[]
}

model Product {
  id         Int      @id @default(autoincrement())
  categoryId Int
  name       String   @db.VarChar(200)
  price      Decimal  @db.Decimal(10, 2)
  stock      Int      @default(0)
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())
  category   Category @relation(fields: [categoryId], references: [id])

  @@index([categoryId, price])
}
```

## Creating and Applying Migrations

```bash
# Create and apply a migration
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma Client after schema changes
npx prisma generate
```

## CRUD with Prisma Client

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create
  const category = await prisma.category.create({
    data: { name: 'Electronics' }
  });

  const product = await prisma.product.create({
    data: {
      name: 'Laptop',
      price: 999.99,
      stock: 50,
      category: { connect: { id: category.id } }
    }
  });

  // Read with relation
  const products = await prisma.product.findMany({
    where: {
      price: { lte: 1000 },
      stock: { gt: 0 },
      active: true
    },
    include: { category: true },
    orderBy: { price: 'asc' }
  });

  // Update
  await prisma.product.updateMany({
    where: { stock: 0 },
    data: { active: false }
  });

  // Delete
  await prisma.product.deleteMany({
    where: { price: { gt: 50000 } }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Raw SQL with Prisma

```typescript
const results = await prisma.$queryRaw<{ name: string; total: number }[]>`
  SELECT c.name, SUM(p.stock) as total
  FROM Category c
  JOIN Product p ON p.categoryId = c.id
  GROUP BY c.id
  HAVING total > 0
`;
```

## Pagination

```typescript
const page = 1;
const pageSize = 20;

const products = await prisma.product.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  where: { active: true },
  orderBy: { createdAt: 'desc' }
});
```

## Summary

Prisma provides a schema-first, type-safe approach to MySQL access in Node.js. Define models in `schema.prisma`, generate migrations with `prisma migrate dev`, and use the generated `PrismaClient` for fully typed CRUD operations. The `include` option handles relations, `$queryRaw` handles advanced MySQL-specific queries, and Prisma Studio provides a GUI for inspecting your data.
