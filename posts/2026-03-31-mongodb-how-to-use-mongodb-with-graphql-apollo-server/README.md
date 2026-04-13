# How to Use MongoDB with GraphQL (Apollo Server)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GraphQL, Apollo Server, Node.js, Database

Description: Learn how to build a GraphQL API backed by MongoDB using Apollo Server and the native Node.js driver, with resolvers, queries, and mutations.

---

## Why MongoDB with Apollo Server

MongoDB's document model maps naturally to GraphQL types - both represent hierarchical, nested data. Apollo Server provides a production-ready GraphQL runtime for Node.js, and using the native MongoDB driver (or Mongoose) gives you fine-grained control over your queries.

## Project Setup

```bash
mkdir graphql-mongo && cd graphql-mongo
npm init -y
npm install @apollo/server graphql mongodb
npm install -D typescript ts-node @types/node
```

## Connecting to MongoDB

Create a shared client module:

```typescript
// src/db.ts
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

let db: Db;

export async function connectDb(): Promise<Db> {
  if (!db) {
    await client.connect();
    db = client.db('graphql_demo');
  }
  return db;
}
```

## Defining the Schema

```typescript
// src/schema.ts
export const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    price: Float!
    inStock: Boolean!
    tags: [String!]
  }

  type Query {
    products(inStock: Boolean): [Product!]!
    product(id: ID!): Product
  }

  input ProductInput {
    name: String!
    price: Float!
    inStock: Boolean
    tags: [String!]
  }

  type Mutation {
    createProduct(input: ProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
  }
`;
```

## Writing Resolvers

```typescript
// src/resolvers.ts
import { ObjectId } from 'mongodb';
import { connectDb } from './db';

export const resolvers = {
  Query: {
    products: async (_: unknown, { inStock }: { inStock?: boolean }) => {
      const db = await connectDb();
      const filter = inStock !== undefined ? { inStock } : {};
      const docs = await db.collection('products').find(filter).toArray();
      return docs.map(d => ({ ...d, id: d._id.toString() }));
    },
    product: async (_: unknown, { id }: { id: string }) => {
      const db = await connectDb();
      const doc = await db.collection('products').findOne({ _id: new ObjectId(id) });
      return doc ? { ...doc, id: doc._id.toString() } : null;
    }
  },
  Mutation: {
    createProduct: async (_: unknown, { input }: { input: Record<string, unknown> }) => {
      const db = await connectDb();
      const result = await db.collection('products').insertOne({
        ...input,
        inStock: input.inStock ?? true
      });
      return { id: result.insertedId.toString(), ...input, inStock: input.inStock ?? true };
    },
    deleteProduct: async (_: unknown, { id }: { id: string }) => {
      const db = await connectDb();
      const result = await db.collection('products').deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount === 1;
    }
  }
};
```

## Starting Apollo Server

```typescript
// src/index.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

async function main() {
  const server = new ApolloServer({ typeDefs, resolvers });
  const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });
  console.log(`Server running at ${url}`);
}

main();
```

```bash
ts-node src/index.ts
```

## Testing a Query

Open Apollo Sandbox at `http://localhost:4000` and run:

```graphql
mutation {
  createProduct(input: { name: "Widget", price: 9.99, tags: ["gadget"] }) {
    id
    name
    price
  }
}
```

## Summary

Apollo Server and MongoDB complement each other well - GraphQL's hierarchical type system mirrors MongoDB's document structure. Using the native driver in resolvers keeps queries explicit and performant. For production, add DataLoader to batch MongoDB calls and avoid N+1 query patterns across nested types.
