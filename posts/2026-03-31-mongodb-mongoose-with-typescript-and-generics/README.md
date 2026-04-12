# How to Use Mongoose with TypeScript and Generics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, TypeScript, Schema, Generics

Description: Learn the modern approach to using Mongoose with TypeScript, defining schemas with generics to get type-safe documents and model methods.

---

## Introduction

Mongoose 6+ has greatly improved TypeScript support. The recommended pattern is to define a plain TypeScript interface for your document, then pass it as a generic to `Schema` and `model`. This gives you autocomplete and type checking on all Mongoose operations without duplicating field definitions.

## Installation

```bash
npm install mongoose
```

TypeScript types are included in Mongoose since v6, no separate `@types` package needed.

## Defining a Typed Schema

```typescript
import mongoose, { Schema, model, Document } from 'mongoose';

// 1. Document interface
interface IProduct {
  name:      string;
  price:     number;
  category:  string;
  inStock:   boolean;
  tags:      string[];
  createdAt: Date;
}

// 2. Schema (pass interface as generic)
const ProductSchema = new Schema<IProduct>({
  name:      { type: String,  required: true },
  price:     { type: Number,  required: true, min: 0 },
  category:  { type: String,  required: true },
  inStock:   { type: Boolean, default: true },
  tags:      [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

// 3. Model
export const Product = model<IProduct>('Product', ProductSchema);
```

## CRUD Operations

```typescript
// Create - TypeScript checks all fields
const product = await Product.create({
  name:     'Wireless Keyboard',
  price:    49.99,
  category: 'electronics',
  tags:     ['peripheral', 'wireless'],
});

// Read - returns IProduct & Document
const found = await Product.findById(product._id);
console.log(found?.price.toFixed(2)); // typed as number

// Query with type-checked filters
const cheap = await Product.find({ category: 'electronics' })
  .where('price').lt(100)
  .sort({ price: 1 })
  .limit(10)
  .exec();

// Update
await Product.findByIdAndUpdate(
  product._id,
  { $set: { price: 44.99 } },
  { new: true }
);

// Delete
await Product.findByIdAndDelete(product._id);
```

## Adding Instance Methods

```typescript
interface IProductMethods {
  applyDiscount(pct: number): number;
}

const ProductSchema = new Schema<IProduct, mongoose.Model<IProduct>, IProductMethods>({
  // ...fields
});

ProductSchema.methods.applyDiscount = function (pct: number): number {
  return this.price * (1 - pct / 100);
};
```

## Adding Static Methods

```typescript
interface ProductModel extends mongoose.Model<IProduct> {
  findByCategory(category: string): Promise<(IProduct & Document)[]>;
}

ProductSchema.statics.findByCategory = function (category: string) {
  return this.find({ category });
};

export const Product = model<IProduct, ProductModel>('Product', ProductSchema);

// Usage
const electronics = await Product.findByCategory('electronics');
```

## Summary

Modern Mongoose TypeScript usage centers on defining an `interface` for your document, passing it as a generic to `Schema<T>` and `model<T>()`, and optionally adding typed instance and static methods. This pattern provides full type safety for queries, document fields, and custom methods while keeping your schema definition as the single source of truth.
