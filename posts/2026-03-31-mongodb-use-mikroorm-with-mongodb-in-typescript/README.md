# How to Use MikroORM with MongoDB in TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MikroORM, TypeScript, Entity, ORM

Description: Learn how to configure MikroORM with the MongoDB driver and define document entities using TypeScript decorators for type-safe database access.

---

## Introduction

MikroORM is a TypeScript ORM inspired by Doctrine that supports multiple databases including MongoDB. It uses an identity map and unit-of-work pattern to track changes, and exposes a repository API for querying. MongoDB entities use decorators from `@mikro-orm/core` with the `@mikro-orm/mongodb` driver.

## Installation

```bash
npm install @mikro-orm/core @mikro-orm/mongodb
```

## Configuration

```typescript
// mikro-orm.config.ts
import { defineConfig } from '@mikro-orm/mongodb';

export default defineConfig({
  clientUrl:    process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
  dbName:       'shop',
  entities:     ['./src/entities/**/*.ts'],
  entitiesTs:   ['./src/entities/**/*.ts'],
});
```

## Defining Entities

```typescript
import { Entity, Property, PrimaryKey, SerializedPrimaryKey } from '@mikro-orm/core';
import { ObjectId } from 'bson';

@Entity()
export class Product {
  @PrimaryKey()
  _id!: ObjectId;

  @SerializedPrimaryKey()
  id!: string;

  @Property()
  name!: string;

  @Property()
  price!: number;

  @Property()
  category!: string;

  @Property()
  inStock: boolean = true;

  @Property()
  createdAt: Date = new Date();

  constructor(name: string, price: number, category: string) {
    this.name     = name;
    this.price    = price;
    this.category = category;
  }
}
```

## Initializing ORM

```typescript
import { MikroORM } from '@mikro-orm/mongodb';
import config from './mikro-orm.config';

const orm = await MikroORM.init(config);
const em  = orm.em.fork();
```

## CRUD Operations

```typescript
// Create
const product = em.create(Product, { name: 'Laptop', price: 999.99, category: 'electronics' });
await em.persistAndFlush(product);

// Read
const found = await em.findOne(Product, { name: 'Laptop' });
const list  = await em.find(Product, { category: 'electronics' }, { orderBy: { price: 'asc' } });

// Update - unit-of-work tracks changes automatically
const p = await em.findOneOrFail(Product, { name: 'Laptop' });
p.price = 899.99;
await em.flush(); // only sends an update for changed fields

// Delete
await em.removeAndFlush(p);
```

## Using the Repository

```typescript
const productRepo = orm.em.getRepository(Product);

const page = await productRepo.find(
  { category: 'electronics' },
  { limit: 10, offset: 0, orderBy: { price: 'asc' } }
);

const count = await productRepo.count({ category: 'electronics' });
```

## Summary

MikroORM with MongoDB uses TypeScript decorators to define document entities. The unit-of-work pattern tracks field-level changes and flushes only modified data. The repository API provides `find`, `findOne`, `findOneOrFail`, and `count` methods with fully typed filters. `persistAndFlush` and `removeAndFlush` handle create and delete operations atomically.
