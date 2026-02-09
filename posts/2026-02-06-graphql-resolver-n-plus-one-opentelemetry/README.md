# How to Monitor GraphQL Resolver Performance and N+1 Query Detection with OpenTelemetry Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GraphQL, N+1 Queries, Performance

Description: Detect N+1 query problems in GraphQL resolvers using OpenTelemetry tracing to visualize resolver execution patterns.

The N+1 query problem is the silent performance killer of GraphQL APIs. A single query that looks simple on the surface can trigger hundreds of database calls under the hood. OpenTelemetry tracing makes these hidden patterns visible by showing you exactly which resolvers fire and how many downstream queries they produce.

## Why N+1 Is Hard to Catch in GraphQL

Consider this schema:

```graphql
type Query {
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  author: Author!
}

type Author {
  id: ID!
  name: String!
}
```

When a client queries `posts { title author { name } }`, the `posts` resolver runs once, but the `author` resolver runs once per post. If you have 100 posts, that is 1 query for posts + 100 queries for authors = 101 database calls. Without tracing, this looks like a single slow request in your logs.

## Instrumenting Resolvers with OpenTelemetry

Let us set up per-resolver tracing in a Node.js Apollo Server setup:

```typescript
// resolver-tracing-plugin.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('graphql-resolvers');

// Apollo Server plugin that wraps each resolver in a span
export const resolverTracingPlugin = {
  requestDidStart() {
    return {
      executionDidStart() {
        return {
          willResolveField({ info }: any) {
            // Create a span for every field resolution
            const span = tracer.startSpan(`resolve: ${info.parentType.name}.${info.fieldName}`);

            span.setAttribute('graphql.field.name', info.fieldName);
            span.setAttribute('graphql.parent.type', info.parentType.name);
            span.setAttribute('graphql.return.type', info.returnType.toString());

            // Return an end handler that closes the span
            return (error: any) => {
              if (error) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                span.recordException(error);
              }
              span.end();
            };
          },
        };
      },
    };
  },
};
```

Register it with your Apollo Server:

```typescript
import { ApolloServer } from '@apollo/server';
import { resolverTracingPlugin } from './resolver-tracing-plugin';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [resolverTracingPlugin],
});
```

## Spotting the N+1 Pattern in Traces

Once you deploy this, look at the trace waterfall for a query that fetches a list with nested fields. A healthy trace looks like this:

```
resolve: Query.posts          [=============================]
  resolve: Post.author        [====]  (batch - single call)
```

An N+1 trace looks like this:

```
resolve: Query.posts          [=============================]
  resolve: Post.author        [==]
  resolve: Post.author          [==]
  resolve: Post.author            [==]
  resolve: Post.author              [==]
  ... (repeated 100 times)
```

You will see dozens of child spans for the same field, each making its own database call.

## Adding Database Call Counting

To make N+1 detection more explicit, track the number of database queries per resolver type:

```typescript
// db-query-counter.ts
import { trace, context } from '@opentelemetry/api';

// Simple counter that tracks DB calls within a request scope
export function countDatabaseCalls(queryFn: Function) {
  return async (...args: any[]) => {
    const span = trace.getActiveSpan();

    // Increment a counter attribute on the parent span
    const currentCount = (span as any)?._dbQueryCount || 0;
    (span as any)._dbQueryCount = currentCount + 1;

    span?.setAttribute('db.query.count', currentCount + 1);

    return queryFn(...args);
  };
}
```

## The Fix: DataLoader with Tracing

DataLoader batches individual lookups into a single query. Here is how to instrument it:

```typescript
import DataLoader from 'dataloader';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('dataloader');

function createAuthorLoader() {
  return new DataLoader(async (authorIds: readonly string[]) => {
    // This span shows the batched query
    return tracer.startActiveSpan('dataloader: batch-load-authors', async (span) => {
      span.setAttribute('dataloader.keys.count', authorIds.length);
      span.setAttribute('dataloader.entity', 'Author');

      const authors = await db.query(
        'SELECT * FROM authors WHERE id = ANY($1)',
        [authorIds]
      );

      span.end();

      // DataLoader expects results in the same order as keys
      const authorMap = new Map(authors.map((a: any) => [a.id, a]));
      return authorIds.map((id) => authorMap.get(id) || null);
    });
  });
}
```

After applying DataLoader, your trace waterfall changes dramatically. Instead of 100 individual `Post.author` spans each hitting the database, you see 100 resolver spans that all feed into a single batched database query.

## Setting Up Alerts for N+1 Detection

You can create automated alerts by counting child spans per resolver type:

```typescript
// In your resolver tracing plugin, track child span counts
span.setAttribute('graphql.resolver.child_count', childCount);

// Then alert when any single request has more than N resolver spans
// for the same field type. A threshold of 20+ identical resolver
// spans in one trace is almost always an N+1 problem.
```

## Key Takeaways

The combination of per-resolver spans and database call tracking makes N+1 problems impossible to miss. You can see them directly in trace waterfalls as repeating patterns of identical spans. Before and after adding DataLoader, the difference is stark in the trace visualization.

Set a span attribute for the batch size when using DataLoader so you can verify it is actually batching. If the batch size is always 1, your DataLoader is not working as expected, possibly because the event loop is draining too aggressively.

OpenTelemetry does not fix N+1 problems for you, but it makes them visible. And visibility is the first step toward fixing them.
