# How to Build a GraphQL API with Apollo Server on Azure Functions in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, Apollo Server, Azure Functions, Node.js, Serverless, API, TypeScript

Description: Build and deploy a GraphQL API using Apollo Server running on Azure Functions for a scalable serverless backend.

---

REST APIs are fine until your frontend team starts asking for different combinations of data on every screen. One screen needs the user profile with their last five orders. Another needs just the username and avatar. With REST, you either over-fetch, create a dozen specialized endpoints, or build some kind of field filtering system. GraphQL solves this by letting the client ask for exactly what it needs. Apollo Server is the most popular GraphQL server for Node.js, and running it on Azure Functions gives you a serverless GraphQL API that scales to zero when idle and handles traffic spikes without you lifting a finger.

## Prerequisites

- Node.js 18 or later
- Azure Functions Core Tools v4
- An Azure account
- Azure CLI installed and authenticated
- Basic GraphQL knowledge

## Project Setup

Create a new Azure Functions project with the Apollo Server integration:

```bash
# Create the project directory
mkdir graphql-azure-functions && cd graphql-azure-functions

# Initialize Azure Functions project with TypeScript
func init --typescript

# Create an HTTP trigger function
func new --name graphql --template "HTTP trigger" --authlevel anonymous

# Install Apollo Server and GraphQL dependencies
npm install @apollo/server @as-integrations/azure-functions graphql
```

## Defining the Schema

Create a schema that models a bookstore API. This is a practical example that shows type definitions, queries, mutations, and relationships:

```typescript
// src/schema.ts - GraphQL type definitions
export const typeDefs = `#graphql
  # A book in the catalog
  type Book {
    id: ID!
    title: String!
    author: Author!
    genre: String!
    publishedYear: Int
    rating: Float
    reviews: [Review!]!
  }

  # An author who writes books
  type Author {
    id: ID!
    name: String!
    bio: String
    books: [Book!]!
  }

  # A review left by a reader
  type Review {
    id: ID!
    bookId: ID!
    reviewer: String!
    rating: Int!
    comment: String
    createdAt: String!
  }

  # Input type for creating a book
  input CreateBookInput {
    title: String!
    authorId: ID!
    genre: String!
    publishedYear: Int
  }

  # Input type for adding a review
  input AddReviewInput {
    bookId: ID!
    reviewer: String!
    rating: Int!
    comment: String
  }

  # Available queries
  type Query {
    books(genre: String, limit: Int): [Book!]!
    book(id: ID!): Book
    authors: [Author!]!
    author(id: ID!): Author
  }

  # Available mutations
  type Mutation {
    createBook(input: CreateBookInput!): Book!
    addReview(input: AddReviewInput!): Review!
  }
`;
```

## Building the Resolvers

Resolvers are where you connect the schema to your data. In a real application these would call a database, but here we use in-memory data to keep the focus on the GraphQL and Azure Functions integration:

```typescript
// src/resolvers.ts - GraphQL resolver functions
import { GraphQLError } from 'graphql';

// In-memory data store (replace with database calls in production)
const authors = [
  { id: '1', name: 'Frank Herbert', bio: 'Science fiction author known for the Dune series' },
  { id: '2', name: 'Ursula K. Le Guin', bio: 'Award-winning science fiction and fantasy author' },
  { id: '3', name: 'Isaac Asimov', bio: 'Prolific writer known for Foundation and Robot series' },
];

const books = [
  { id: '1', title: 'Dune', authorId: '1', genre: 'Science Fiction', publishedYear: 1965, rating: 4.8 },
  { id: '2', title: 'The Left Hand of Darkness', authorId: '2', genre: 'Science Fiction', publishedYear: 1969, rating: 4.5 },
  { id: '3', title: 'Foundation', authorId: '3', genre: 'Science Fiction', publishedYear: 1951, rating: 4.6 },
];

const reviews: Array<{
  id: string; bookId: string; reviewer: string;
  rating: number; comment: string; createdAt: string;
}> = [];

let nextBookId = 4;
let nextReviewId = 1;

export const resolvers = {
  Query: {
    // Return books with optional filtering by genre
    books: (_: unknown, args: { genre?: string; limit?: number }) => {
      let result = books;
      if (args.genre) {
        result = result.filter((b) => b.genre === args.genre);
      }
      if (args.limit) {
        result = result.slice(0, args.limit);
      }
      return result;
    },

    // Return a single book by ID
    book: (_: unknown, args: { id: string }) => {
      return books.find((b) => b.id === args.id) || null;
    },

    // Return all authors
    authors: () => authors,

    // Return a single author by ID
    author: (_: unknown, args: { id: string }) => {
      return authors.find((a) => a.id === args.id) || null;
    },
  },

  Mutation: {
    // Create a new book
    createBook: (_: unknown, args: { input: { title: string; authorId: string; genre: string; publishedYear?: number } }) => {
      const author = authors.find((a) => a.id === args.input.authorId);
      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const newBook = {
        id: String(nextBookId++),
        ...args.input,
        rating: 0,
      };
      books.push(newBook);
      return newBook;
    },

    // Add a review to a book
    addReview: (_: unknown, args: { input: { bookId: string; reviewer: string; rating: number; comment?: string } }) => {
      const book = books.find((b) => b.id === args.input.bookId);
      if (!book) {
        throw new GraphQLError('Book not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (args.input.rating < 1 || args.input.rating > 5) {
        throw new GraphQLError('Rating must be between 1 and 5', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const newReview = {
        id: String(nextReviewId++),
        ...args.input,
        comment: args.input.comment || '',
        createdAt: new Date().toISOString(),
      };
      reviews.push(newReview);

      // Update the book's average rating
      const bookReviews = reviews.filter((r) => r.bookId === args.input.bookId);
      book.rating = bookReviews.reduce((sum, r) => sum + r.rating, 0) / bookReviews.length;

      return newReview;
    },
  },

  // Field resolvers for related data
  Book: {
    // Resolve the author for a book
    author: (parent: { authorId: string }) => {
      return authors.find((a) => a.id === parent.authorId);
    },
    // Resolve reviews for a book
    reviews: (parent: { id: string }) => {
      return reviews.filter((r) => r.bookId === parent.id);
    },
  },

  Author: {
    // Resolve books for an author
    books: (parent: { id: string }) => {
      return books.filter((b) => b.authorId === parent.id);
    },
  },
};
```

## Wiring Up the Azure Function

Now connect Apollo Server to the Azure Functions HTTP trigger:

```typescript
// src/functions/graphql.ts - Azure Function entry point
import { app } from '@azure/functions';
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateHandler } from '@as-integrations/azure-functions';
import { typeDefs } from '../schema';
import { resolvers } from '../resolvers';

// Create the Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Include stack traces in development only
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
});

// Create the Azure Functions handler
const graphqlHandler = startServerAndCreateHandler(server);

// Register the function with both GET and POST methods
app.http('graphql', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: graphqlHandler,
});
```

## Local Development

Run the function locally to test it:

```bash
# Build the TypeScript and start the function
npm run build
func start
```

Your GraphQL endpoint is now available at `http://localhost:7071/api/graphql`. You can open this URL in a browser to access Apollo Sandbox, a built-in GraphQL IDE.

Try a query:

```graphql
# Fetch books with their authors and reviews
query {
  books(limit: 5) {
    title
    genre
    rating
    author {
      name
    }
    reviews {
      reviewer
      rating
      comment
    }
  }
}
```

Or a mutation:

```graphql
# Add a new review
mutation {
  addReview(input: {
    bookId: "1"
    reviewer: "Jane"
    rating: 5
    comment: "A masterpiece of science fiction"
  }) {
    id
    rating
    comment
    createdAt
  }
}
```

## Adding Authentication Context

In a real application you want to pass authentication information to your resolvers. Here is how to extract it from the Azure Functions request:

```typescript
// src/functions/graphql.ts - With authentication context
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateHandler } from '@as-integrations/azure-functions';
import { HttpRequest } from '@azure/functions';

// Define the context type
interface Context {
  userId?: string;
  roles: string[];
}

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

const graphqlHandler = startServerAndCreateHandler(server, {
  // Extract user information from the request headers
  context: async ({ req }: { req: HttpRequest }): Promise<Context> => {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return { roles: [] };
    }

    // Validate the token and extract user info
    // In production, verify against Azure AD or your auth provider
    const user = await validateToken(token);
    return {
      userId: user?.id,
      roles: user?.roles || [],
    };
  },
});
```

## Deploying to Azure

Deploy the function to Azure:

```bash
# Create a Function App in Azure
az functionapp create \
  --resource-group graphql-demo-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name my-graphql-api \
  --storage-account mystorageaccount

# Deploy the function
func azure functionapp publish my-graphql-api
```

After deployment, your GraphQL API is available at `https://my-graphql-api.azurewebsites.net/api/graphql`.

## Performance Considerations

Cold starts are the main concern with serverless GraphQL. Apollo Server has some initialization overhead, and the first request after a period of inactivity will be slower. A few ways to mitigate this:

1. Use the Azure Functions Premium plan if cold starts are unacceptable
2. Keep your dependencies minimal to reduce the deployment package size
3. Consider using a warm-up ping on a timer trigger

For response caching, Apollo Server supports cache control directives that you can add to your schema:

```graphql
# Add caching hints to your type definitions
type Book @cacheControl(maxAge: 300) {
  id: ID!
  title: String!
  reviews: [Review!]! @cacheControl(maxAge: 60)
}
```

## Wrapping Up

GraphQL on Azure Functions gives you a serverless API that responds to exactly what clients ask for, without the overhead of managing servers or paying for idle compute. Apollo Server handles the GraphQL execution and provides developer tools like the sandbox IDE. Azure Functions handles scaling and infrastructure. The combination works well for APIs with variable traffic patterns where you do not want to maintain always-on servers. The setup takes about twenty minutes, and from there you can iterate on your schema as your API evolves.
