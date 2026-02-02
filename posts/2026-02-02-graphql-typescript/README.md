# How to Use GraphQL with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, GraphQL, API, Type Safety, Code Generation

Description: Learn how to build type-safe GraphQL applications with TypeScript using code generation, typed resolvers, and GraphQL Code Generator.

---

If you've worked with GraphQL and TypeScript separately, you know they're both great. But when you combine them without proper tooling, you end up maintaining types in two places - your GraphQL schema and your TypeScript code. That's a recipe for bugs and frustration.

The good news? There are excellent tools that generate TypeScript types directly from your GraphQL schema. No more manual type definitions. No more runtime errors because your types drifted from your schema. Let's walk through how to set this up properly.

## Why GraphQL + TypeScript?

GraphQL already has a type system built into its schema. TypeScript also has a type system. The problem is they don't talk to each other by default. You might define a `User` type in your GraphQL schema, then manually create a TypeScript interface that looks similar. When the schema changes, you have to remember to update the TypeScript types too.

Code generation solves this. You write your GraphQL schema once, run a command, and get TypeScript types that match exactly. Your IDE catches errors before you even run the code.

## Setting Up GraphQL Code Generator

GraphQL Code Generator is the standard tool for this job. Let's set it up in a new project.

First, install the dependencies:

```bash
# Core packages
npm install graphql @graphql-codegen/cli

# Plugins for TypeScript generation
npm install -D @graphql-codegen/typescript @graphql-codegen/typescript-resolvers
```

Create a configuration file called `codegen.ts` in your project root:

```typescript
// codegen.ts - Configuration for GraphQL Code Generator
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // Path to your GraphQL schema file
  schema: './src/schema.graphql',

  // Where to output the generated types
  generates: {
    './src/generated/types.ts': {
      plugins: [
        'typescript',           // Generates base TypeScript types
        'typescript-resolvers'  // Generates resolver type signatures
      ],
      config: {
        // Use 'Maybe' type for nullable fields
        maybeValue: 'T | null | undefined',
        // Generate enum as TypeScript const for better tree-shaking
        enumsAsConst: true
      }
    }
  }
};

export default config;
```

Add a script to your `package.json`:

```json
{
  "scripts": {
    "codegen": "graphql-codegen",
    "codegen:watch": "graphql-codegen --watch"
  }
}
```

## Schema-First vs Code-First

There are two approaches to building GraphQL APIs with TypeScript. Here's a quick comparison:

| Approach | How It Works | Best For |
|----------|--------------|----------|
| Schema-First | Write `.graphql` files, generate TS types | Teams with dedicated schema designers, APIs that need clear contracts |
| Code-First | Write TS classes/decorators, generate schema | Rapid prototyping, single-developer projects |

Let's look at both.

### Schema-First Example

Start with a GraphQL schema file:

```graphql
# src/schema.graphql
type User {
  id: ID!
  email: String!
  name: String
  posts: [Post!]!
  createdAt: String!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  user(id: ID!): User
  users: [User!]!
  post(id: ID!): Post
}

type Mutation {
  createUser(email: String!, name: String): User!
  createPost(title: String!, content: String!, authorId: ID!): Post!
}
```

Run `npm run codegen` and you'll get generated types. Now write your resolvers with full type safety:

```typescript
// src/resolvers.ts
import { Resolvers } from './generated/types';

// Fake database for this example
const users = new Map<string, { id: string; email: string; name: string | null; createdAt: string }>();
const posts = new Map<string, { id: string; title: string; content: string; authorId: string }>();

// The Resolvers type ensures every resolver matches the schema
export const resolvers: Resolvers = {
  Query: {
    // TypeScript knows this returns User | null
    user: (_parent, args) => {
      const user = users.get(args.id);
      if (!user) return null;
      return { ...user, posts: [] };
    },

    // TypeScript knows this returns User[]
    users: () => {
      return Array.from(users.values()).map(user => ({
        ...user,
        posts: []
      }));
    },

    post: (_parent, args) => {
      const post = posts.get(args.id);
      if (!post) return null;
      const author = users.get(post.authorId);
      if (!author) return null;
      return { ...post, author: { ...author, posts: [] } };
    }
  },

  Mutation: {
    createUser: (_parent, args) => {
      const id = crypto.randomUUID();
      const user = {
        id,
        email: args.email,
        name: args.name ?? null,
        createdAt: new Date().toISOString(),
        posts: []
      };
      users.set(id, user);
      return user;
    },

    createPost: (_parent, args) => {
      const author = users.get(args.authorId);
      if (!author) {
        throw new Error('Author not found');
      }

      const id = crypto.randomUUID();
      const post = {
        id,
        title: args.title,
        content: args.content,
        authorId: args.authorId,
        author: { ...author, posts: [] }
      };
      posts.set(id, post);
      return post;
    }
  }
};
```

### Code-First with TypeGraphQL

If you prefer defining your schema in TypeScript, TypeGraphQL is a solid choice:

```typescript
// src/entities/User.ts
import { ObjectType, Field, ID } from 'type-graphql';
import { Post } from './Post';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => [Post])
  posts: Post[];

  @Field()
  createdAt: Date;
}
```

```typescript
// src/resolvers/UserResolver.ts
import { Resolver, Query, Mutation, Arg, ID } from 'type-graphql';
import { User } from '../entities/User';

@Resolver(User)
export class UserResolver {
  // In-memory store for demo purposes
  private users: User[] = [];

  @Query(() => User, { nullable: true })
  async user(@Arg('id', () => ID) id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) ?? null;
  }

  @Query(() => [User])
  async users(): Promise<User[]> {
    return this.users;
  }

  @Mutation(() => User)
  async createUser(
    @Arg('email') email: string,
    @Arg('name', { nullable: true }) name?: string
  ): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      name,
      posts: [],
      createdAt: new Date()
    };
    this.users.push(user);
    return user;
  }
}
```

## Typed GraphQL Clients

For frontend applications, you want typed queries too. Add the client plugin:

```bash
npm install -D @graphql-codegen/typescript-operations @graphql-codegen/typed-document-node
```

Update your codegen config:

```typescript
// codegen.ts
const config: CodegenConfig = {
  schema: './src/schema.graphql',
  documents: './src/**/*.graphql',  // Your query files
  generates: {
    './src/generated/types.ts': {
      plugins: ['typescript']
    },
    './src/generated/operations.ts': {
      preset: 'client',
      plugins: []
    }
  }
};
```

Write your queries in `.graphql` files:

```graphql
# src/queries/users.graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    name
    posts {
      id
      title
    }
  }
}

mutation CreateUser($email: String!, $name: String) {
  createUser(email: $email, name: $name) {
    id
    email
  }
}
```

Now use the generated types in your client code:

```typescript
// src/client.ts
import { GraphQLClient } from 'graphql-request';
import { GetUserDocument, CreateUserDocument } from './generated/operations';

const client = new GraphQLClient('http://localhost:4000/graphql');

// TypeScript knows exactly what getUserResult contains
async function fetchUser(id: string) {
  const result = await client.request(GetUserDocument, { id });

  // result.user is typed as User | null
  if (result.user) {
    console.log(result.user.email);  // TypeScript knows this exists
    console.log(result.user.posts);  // Array of Post objects
  }
}

// TypeScript enforces the correct argument types
async function addUser(email: string, name?: string) {
  const result = await client.request(CreateUserDocument, { email, name });
  return result.createUser;  // Typed as User
}
```

## Type Guards for Runtime Safety

Generated types help at compile time, but you might need runtime checks too. Here's a pattern for type guards:

```typescript
// src/guards.ts
import { User, Post } from './generated/types';

// Type guard to check if an object is a valid User
function isUser(obj: unknown): obj is User {
  if (typeof obj !== 'object' || obj === null) return false;

  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    Array.isArray(candidate.posts)
  );
}

// Use it when handling API responses or external data
function processResponse(data: unknown) {
  if (isUser(data)) {
    // TypeScript now knows data is User
    console.log(data.email);
  }
}
```

## Common Codegen Configuration Options

Here are the most useful configuration options for the TypeScript plugin:

| Option | Description | Default |
|--------|-------------|---------|
| `strictScalars` | Require explicit scalar type mappings | `false` |
| `enumsAsTypes` | Generate enums as TypeScript union types | `false` |
| `avoidOptionals` | Use explicit `null` instead of `?` | `false` |
| `immutableTypes` | Add `readonly` to all properties | `false` |
| `useTypeImports` | Use `import type` syntax | `false` |

Example with custom scalars:

```typescript
// codegen.ts
const config: CodegenConfig = {
  schema: './src/schema.graphql',
  generates: {
    './src/generated/types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        strictScalars: true,
        scalars: {
          DateTime: 'Date',
          JSON: 'Record<string, unknown>'
        }
      }
    }
  }
};
```

## Wrapping Up

The key takeaway is simple: don't maintain types in two places. Use code generation to create TypeScript types from your GraphQL schema automatically. This approach catches errors at compile time, gives you better IDE support, and eliminates a whole category of bugs.

Start with `@graphql-codegen/cli` and the TypeScript plugins. Run codegen in watch mode during development. Add it to your CI pipeline to catch schema drift early.

Your future self will thank you when the types just work.
