# How to Use MySQL with TypeORM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, TypeORM, TypeScript, ORM, Node.js

Description: Learn how to configure TypeORM with MySQL in a TypeScript project, define entities with decorators, write migrations, and perform queries using the repository pattern.

---

## Introduction

TypeORM is a full-featured ORM for TypeScript and JavaScript that supports active record and data mapper patterns. It integrates natively with MySQL and provides decorators for entity definition, relationship mapping, and query building through a repository API.

## Installation

```bash
npm install typeorm mysql2 reflect-metadata
npm install -D typescript @types/node
```

Enable decorators in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "ES2020",
    "module": "commonjs"
  }
}
```

## Data Source Configuration

```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Product } from './entity/Product';
import { Category } from './entity/Category';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'password',
  database: 'mydb',
  entities: [Product, Category],
  migrations: ['src/migration/*.ts'],
  synchronize: false,  // use migrations in production
  logging: true,
  charset: 'utf8mb4',
});
```

## Defining Entities

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
  Index
} from 'typeorm';
import { Category } from './Category';

@Entity('products')
@Index(['categoryId', 'price'])
export class Product {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ length: 200 })
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Category, (c) => c.products, { lazy: true })
  @JoinColumn({ name: 'category_id' })
  category: Promise<Category>;
}
```

## Initializing and Using Repositories

```typescript
import { AppDataSource } from './data-source';
import { Product } from './entity/Product';
import { MoreThan } from 'typeorm';

await AppDataSource.initialize();

const productRepo = AppDataSource.getRepository(Product);

// Create
const product = productRepo.create({
  name: 'Laptop',
  price: 999.99,
  stock: 50,
  categoryId: 1,
});
await productRepo.save(product);

// Find with conditions
const affordable = await productRepo.find({
  where: { active: true },
  order: { price: 'ASC' },
  take: 20,
  skip: 0,
});

// Update
await productRepo.update({ stock: 0 }, { active: false });

// Delete
await productRepo.delete({ price: MoreThan(50000) });
```

## Using the Query Builder

```typescript
import { AppDataSource } from './data-source';
import { Product } from './entity/Product';

const results = await AppDataSource
  .getRepository(Product)
  .createQueryBuilder('p')
  .innerJoinAndSelect('p.category', 'c')
  .where('p.price < :max', { max: 1000 })
  .andWhere('p.stock > 0')
  .orderBy('p.price', 'ASC')
  .getMany();
```

## Running Migrations

```bash
# Generate a migration from entity changes
npx typeorm migration:generate src/migration/InitialSchema -d src/data-source.ts

# Run migrations
npx typeorm migration:run -d src/data-source.ts
```

## Summary

TypeORM with MySQL uses a `DataSource` configuration and entity classes decorated with `@Entity`, `@Column`, and relationship decorators. The repository API handles CRUD operations, while `createQueryBuilder` provides full SQL control when needed. Always use migrations (`synchronize: false`) in production to avoid unintended schema changes.
