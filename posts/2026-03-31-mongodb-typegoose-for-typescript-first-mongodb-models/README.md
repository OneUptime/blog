# How to Use Typegoose for TypeScript-First MongoDB Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Typegoose, TypeScript, Decorator, Model

Description: Learn how Typegoose lets you define Mongoose models using TypeScript classes and decorators, eliminating interface and schema duplication.

---

## Introduction

Typegoose is a library that lets you write Mongoose models as TypeScript classes decorated with property metadata. Instead of maintaining a separate TypeScript interface and a Mongoose `Schema`, you write a single class that generates both - reducing boilerplate and keeping types and database schema in sync automatically.

## Installation

```bash
npm install @typegoose/typegoose mongoose
npm install --save-dev typescript
```

Enable decorators in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Defining a Model Class

```typescript
import { prop, getModelForClass, modelOptions, Severity } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
class Product {
  @prop({ required: true })
  public name!: string;

  @prop({ required: true, min: 0 })
  public price!: number;

  @prop({ required: true })
  public category!: string;

  @prop({ default: true })
  public inStock!: boolean;

  @prop({ type: () => [String] })
  public tags?: string[];
}

export const ProductModel = getModelForClass(Product);
```

## CRUD Operations

```typescript
import { mongoose } from '@typegoose/typegoose';

await mongoose.connect('mongodb://localhost:27017/shop');

// Create - TypeScript checks all fields via the class
const p = await ProductModel.create({
  name:     'Mechanical Keyboard',
  price:    79.99,
  category: 'electronics',
  tags:     ['peripheral'],
});
console.log(p.name); // fully typed

// Find
const products = await ProductModel.find({ category: 'electronics' });
const one      = await ProductModel.findById(p._id);

// Update
await ProductModel.findByIdAndUpdate(p._id, { $set: { price: 69.99 } }, { new: true });

// Delete
await ProductModel.findByIdAndDelete(p._id);
```

## Nested Sub-Documents

```typescript
class Address {
  @prop() public street!: string;
  @prop() public city!:   string;
  @prop() public zip!:    string;
}

class Customer {
  @prop({ required: true })
  public name!: string;

  @prop({ _id: false })
  public address?: Address;
}

export const CustomerModel = getModelForClass(Customer);
```

## References Between Models

```typescript
import { Ref } from '@typegoose/typegoose';

class Order {
  @prop({ ref: () => Customer, required: true })
  public customer!: Ref<Customer>;

  @prop({ required: true })
  public total!: number;
}

export const OrderModel = getModelForClass(Order);

// Populate
const order = await OrderModel.findById(id).populate('customer');
```

## Summary

Typegoose replaces the Mongoose schema + interface dual-definition pattern with a single class decorated with `@prop`. `getModelForClass` converts the class into a fully functional Mongoose model. This approach guarantees your TypeScript types and MongoDB schema are always in sync, and reduces the amount of boilerplate code required for typed MongoDB models.
