# How to Use MySQL with Drizzle ORM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Drizzle ORM, TypeScript, Node.js, Query Builder

Description: Learn how to set up Drizzle ORM with MySQL in a TypeScript project, define schemas, run migrations with drizzle-kit, and write type-safe queries.

---

## Introduction

Drizzle ORM is a lightweight, type-safe SQL ORM for TypeScript. Unlike traditional ORMs, Drizzle stays close to SQL - schemas are defined in TypeScript, and the query API is SQL-like. It supports MySQL natively and provides `drizzle-kit` for schema migration management.

## Installation

```bash
npm install drizzle-orm mysql2
npm install -D drizzle-kit
```

## Connection Setup

```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'mydb',
});

const db = drizzle(connection);
```

For a connection pool (recommended for production):

```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
});

export const db = drizzle(pool);
```

## Defining the Schema

```typescript
import { mysqlTable, int, varchar, decimal, boolean, timestamp, index } from 'drizzle-orm/mysql-core';

export const categories = mysqlTable('categories', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull().unique(),
});

export const products = mysqlTable('products', {
  id: int('id').primaryKey().autoincrement(),
  categoryId: int('category_id').notNull().references(() => categories.id),
  name: varchar('name', { length: 200 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  stock: int('stock').default(0),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_category_price').on(table.categoryId, table.price),
]);
```

## Running Migrations with drizzle-kit

In `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'mydb',
  },
});
```

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

## Querying with Drizzle

```typescript
import { db } from './db';
import { products, categories } from './schema';
import { eq, lte, gt, and } from 'drizzle-orm';

// Select with join
const result = await db
  .select({
    id: products.id,
    name: products.name,
    price: products.price,
    category: categories.name,
  })
  .from(products)
  .innerJoin(categories, eq(products.categoryId, categories.id))
  .where(and(lte(products.price, '1000'), gt(products.stock, 0)))
  .orderBy(products.price)
  .limit(20);

// Insert
await db.insert(products).values({
  name: 'Laptop',
  price: '999.99',
  stock: 50,
  categoryId: 1,
});

// Update
await db.update(products)
  .set({ active: false })
  .where(eq(products.stock, 0));

// Delete
await db.delete(products)
  .where(gt(products.price, 50000));
```

## Transactions

```typescript
import { sql } from 'drizzle-orm';

await db.transaction(async (tx) => {
  await tx.insert(products).values({
    name: 'Keyboard',
    price: '79.99',
    stock: 200,
    categoryId: 1,
  });
  await tx.update(products)
    .set({ stock: sql`stock - 1` })
    .where(eq(products.id, 1));
});
```

## Summary

Drizzle ORM offers a SQL-first approach to MySQL in TypeScript projects, keeping schema definitions close to actual SQL while providing full type inference. Define tables with `mysqlTable`, generate migrations with `drizzle-kit`, and query using composable `eq`, `and`, `gt` operators. Drizzle's close alignment with SQL makes it easier to reason about query performance compared to more abstracted ORMs.
