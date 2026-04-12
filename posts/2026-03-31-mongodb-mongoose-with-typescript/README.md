# How to Use Mongoose with TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, TypeScript, Schema, Type

Description: Learn how to define strongly-typed Mongoose models with TypeScript interfaces and generics to get full type safety and IDE autocompletion.

---

## Overview

Mongoose 6+ ships with built-in TypeScript support. By defining document interfaces and passing them as type parameters to `Schema` and `model`, you get full type safety on document fields, methods, and queries without any extra packages.

## Installation

```bash
npm install mongoose
npm install --save-dev typescript @types/node
```

## Defining a Document Interface

```typescript
import { Schema, model, Model, Document, Types } from 'mongoose';

interface IUser {
  name:      string;
  email:     string;
  age?:      number;
  role:      'admin' | 'user' | 'guest';
  createdAt: Date;
}

interface IUserDocument extends IUser, Document {
  getGreeting(): string;
}
```

## Creating the Schema with Types

```typescript
const userSchema = new Schema<IUserDocument>({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  age:       Number,
  role:      { type: String, enum: ['admin', 'user', 'guest'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.getGreeting = function(this: IUserDocument): string {
  return `Hello, ${this.name}`;
};

const User = model<IUserDocument>('User', userSchema);
```

## Typed Queries

```typescript
// TypeScript knows the return type is IUserDocument | null
const user = await User.findOne({ email: 'alice@example.com' });
if (user) {
  console.log(user.name);         // autocompleted
  console.log(user.getGreeting()); // method autocompleted
}

// Array of typed documents
const admins: IUserDocument[] = await User.find({ role: 'admin' });
```

## Adding Statics with Interface

```typescript
interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
}

userSchema.statics.findByEmail = async function(
  this: IUserModel,
  email: string
): Promise<IUserDocument | null> {
  return this.findOne({ email });
};

const UserModel = model<IUserDocument, IUserModel>('User', userSchema);
const found = await UserModel.findByEmail('alice@example.com');
```

## Using ObjectId References

```typescript
interface IPost {
  title:    string;
  author:   Types.ObjectId;
  publishedAt?: Date;
}

const postSchema = new Schema<IPost>({
  title:       { type: String, required: true },
  author:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: Date
});

const Post = model<IPost>('Post', postSchema);

// TypeScript enforces Types.ObjectId for author
const post = new Post({ title: 'Hello', author: new Types.ObjectId() });
```

## Summary

Mongoose's built-in TypeScript support requires defining a document interface and passing it as a generic to `Schema` and `model`. Extend `Document` for instance methods and create a separate model interface for statics. TypeScript then enforces field types on creates, updates, and query results - giving you compile-time safety and IDE autocompletion throughout your data layer.
