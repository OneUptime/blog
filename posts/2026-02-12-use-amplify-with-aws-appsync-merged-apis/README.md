# How to Use Amplify with AWS AppSync Merged APIs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, AppSync, GraphQL, Merged APIs, API Gateway, Backend

Description: Learn how to connect AWS Amplify frontend applications to AppSync Merged APIs for unified GraphQL endpoints across multiple teams

---

AWS AppSync Merged APIs let you combine multiple GraphQL APIs into a single endpoint. This is a game-changer for large organizations where different teams own different parts of the backend. Instead of your frontend application calling five different GraphQL endpoints, it calls one merged endpoint that uses the imported schema, resolvers, data sources, and functions from the source APIs.

When you pair AppSync Merged APIs with AWS Amplify on the frontend, you get a streamlined development experience with code generation, type safety, and automatic authentication handling. This guide walks through the full setup.

## What Are Merged APIs?

In a typical microservices architecture, each team builds their own API. The orders team has an Orders API, the users team has a Users API, and so on. Without Merged APIs, the frontend needs to know about each API endpoint individually.

```mermaid
graph TD
    subgraph Without Merged APIs
        A[Frontend] --> B[Users API]
        A --> C[Orders API]
        A --> D[Products API]
        A --> E[Inventory API]
    end

    subgraph With Merged APIs
        F[Frontend] --> G[Merged API Endpoint]
        G --> H[Users Source API]
        G --> I[Orders Source API]
        G --> J[Products Source API]
        G --> K[Inventory Source API]
    end
```

The Merged API combines the schemas, resolvers, and data sources from multiple source APIs into one unified GraphQL schema.

## Prerequisites

Before starting, you need:

- An AWS account with AppSync and Amplify permissions
- At least two existing AppSync APIs to merge (or you will create them)
- An Amplify frontend project
- The AWS CLI and Amplify CLI installed

## Step 1: Create Source APIs

If you do not already have source APIs, create a couple for testing. Each source API has its own schema and resolvers.

**Users Source API schema**:

```graphql
# schema for the Users source API

type User {
  id: ID!
  name: String!
  email: String!
  createdAt: AWSDateTime!
}

type Query {
  getUser(id: ID!): User
  listUsers(limit: Int, nextToken: String): UserConnection
}

type UserConnection {
  items: [User]
  nextToken: String
}

type Mutation {
  createUser(input: CreateUserInput!): User
}

input CreateUserInput {
  name: String!
  email: String!
}
```

**Orders Source API schema**:

```graphql
# schema for the Orders source API
type Order {
  id: ID!
  userId: String!
  total: Float!
  status: OrderStatus!
  createdAt: AWSDateTime!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
}

type Query {
  getOrder(id: ID!): Order
  listOrdersByUser(userId: String!): [Order]
}

type Mutation {
  createOrder(input: CreateOrderInput!): Order
  updateOrderStatus(id: ID!, status: OrderStatus!): Order
}

input CreateOrderInput {
  userId: String!
  total: Float!
}
```

## Step 2: Create the Merged API

Create the Merged API in the AppSync console or via the CLI:

```bash
# Create the Merged API
aws appsync create-graphql-api \
  --name "MyMergedAPI" \
  --api-type MERGED \
  --merged-api-execution-role-arn "arn:aws:iam::123456789012:role/AppSyncMergedApiExecutionRole" \
  --authentication-type AMAZON_COGNITO_USER_POOLS \
  --user-pool-config '{
    "userPoolId": "us-east-1_abc123",
    "awsRegion": "us-east-1",
    "defaultAction": "ALLOW"
  }'
```

The merged API execution role must allow AppSync to call the source APIs with the `appsync:SourceGraphQL` permission. Note the API ID from the response. You will need it to associate source APIs.

## Step 3: Associate Source APIs

Link your source APIs to the Merged API:

```bash
# Associate the Users source API
aws appsync associate-source-graphql-api \
  --merged-api-identifier "merged-api-id" \
  --source-api-identifier "users-api-id" \
  --source-api-association-config '{
    "mergeType": "AUTO_MERGE"
  }'

# Associate the Orders source API
aws appsync associate-source-graphql-api \
  --merged-api-identifier "merged-api-id" \
  --source-api-identifier "orders-api-id" \
  --source-api-association-config '{
    "mergeType": "AUTO_MERGE"
  }'
```

If you use the default `MANUAL_MERGE` mode instead, note the `associationId` from each association response and start the merge yourself:

```bash
aws appsync start-schema-merge \
  --association-id "users-association-id-from-response" \
  --merged-api-identifier "merged-api-id"
```

After a successful merge, the Merged API schema includes types and operations from both source APIs. You can query users and orders through a single endpoint.

## Step 4: Configure Amplify to Use the Merged API

In your Amplify project, you need to point the frontend at the Merged API endpoint instead of individual source APIs.

For Amplify Gen 2, configure the Amplify client in your frontend entry point:

```typescript
// src/main.ts - Configure the Merged API
import { Amplify } from 'aws-amplify';
import { parseAmplifyConfig } from 'aws-amplify/utils';
import outputs from '../amplify_outputs.json';

const amplifyConfig = parseAmplifyConfig(outputs);

Amplify.configure({
  ...amplifyConfig,
  API: {
    ...amplifyConfig.API,
    GraphQL: {
      endpoint: 'https://merged-api-id.appsync-api.us-east-1.amazonaws.com/graphql',
      region: 'us-east-1',
      defaultAuthMode: 'userPool',
    },
  },
});
```

For Amplify Gen 1, update `aws-exports.js` or your Amplify configuration:

```javascript
// Configure Amplify to use the Merged API endpoint
import { Amplify } from 'aws-amplify';

Amplify.configure({
  API: {
    GraphQL: {
      endpoint: 'https://merged-api-id.appsync-api.us-east-1.amazonaws.com/graphql',
      region: 'us-east-1',
      defaultAuthMode: 'userPool',
    },
  },
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_abc123',
      userPoolClientId: 'client-id-here',
    },
  },
});
```

## Step 5: Generate TypeScript Types

One of the benefits of using Amplify with GraphQL is automatic type generation. Generate types from the Merged API schema:

```bash
# Download the merged schema
aws appsync get-introspection-schema \
  --api-id merged-api-id \
  --format SDL \
  --include-directives \
  schema.graphql

# Use Amplify codegen to generate TypeScript types
npx @aws-amplify/cli codegen add --apiId merged-api-id --region us-east-1
npx @aws-amplify/cli codegen
```

This creates type-safe query and mutation functions you can import directly.

## Step 6: Query the Merged API from Your Frontend

Now you can query both users and orders through the single Merged API:

```typescript
// Querying users and orders through the Merged API
import { generateClient } from 'aws-amplify/api';
import { getUser, listOrdersByUser } from './graphql/queries';
import { createOrder } from './graphql/mutations';

const client = generateClient();

// Query from the Users source API
async function fetchUser(userId: string) {
  const result = await client.graphql({
    query: getUser,
    variables: { id: userId },
  });
  return result.data.getUser;
}

// Query from the Orders source API
async function fetchUserOrders(userId: string) {
  const result = await client.graphql({
    query: listOrdersByUser,
    variables: { userId },
  });
  return result.data.listOrdersByUser;
}

// Mutation on the Orders source API
async function placeOrder(userId: string, total: number) {
  const result = await client.graphql({
    query: createOrder,
    variables: {
      input: { userId, total },
    },
  });
  return result.data.createOrder;
}
```

The frontend code does not need to know which source API originally owned each operation. The Merged API exposes the merged schema and invokes the imported resources behind that endpoint.

## Step 7: Handle Authentication Across Source APIs

Merged APIs support multiple authentication modes. If those modes are configured on the Merged API, you can choose different auth modes for different operations:

```typescript
// Use IAM auth for public queries, Cognito for mutations
const publicResult = await client.graphql({
  query: listProducts,
  authMode: 'iam',
});

const privateResult = await client.graphql({
  query: createOrder,
  variables: { input: orderData },
  authMode: 'userPool',
});
```

Each source API can have its own authorization configuration. At merge time, the Merged API must include the primary authorization mode used by each source API as either its primary authorization mode or an additional authorization mode.

## Step 8: Handle Schema Conflicts

When merging schemas, type name conflicts can occur. If both source APIs define a `Status` enum, AppSync needs to know how to resolve the conflict.

Source API associations have two merge modes:

1. **Manual merge**: AppSync uses this by default. You manually start a merge when you want source API changes propagated to the Merged API.
2. **Auto merge**: AppSync automatically attempts to merge source API changes into the Merged API.

```bash
# Configure the association with auto merge
aws appsync associate-source-graphql-api \
  --merged-api-identifier "merged-api-id" \
  --source-api-identifier "users-api-id" \
  --source-api-association-config '{
    "mergeType": "AUTO_MERGE"
}'
```

For schema conflicts, AppSync supports directives such as `@canonical`, `@hidden`, and `@renamed` to choose a preferred definition, exclude a type or field from the Merged API, or rename a conflicting type or field. Compatible object type definitions can be merged by taking the union of their fields, but incompatible definitions cause the merge to fail until you resolve them.

## Monitoring the Merged API

Track the health of your Merged API with CloudWatch metrics:

```bash
# Key metrics to monitor
# - Latency for the Merged API
# - Error rates for the Merged API
# - Total request count

aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "latency",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/AppSync",
          "MetricName": "Latency",
          "Dimensions": [{"Name": "GraphQLAPIId", "Value": "merged-api-id"}]
        },
        "Period": 300,
        "Stat": "Average"
      }
    }
  ]' \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T23:59:59Z
```

For a deeper dive into monitoring, see our guide on [monitoring Amplify hosting with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-amplify-hosting-with-cloudwatch/view).

## Common Issues

**Schema merge fails**: Usually caused by conflicting type definitions. Check that shared types (like scalars and enums) have compatible definitions across source APIs.

**Authorization errors**: Make sure the Merged API's auth configuration includes all auth modes used by the source APIs. If a source API uses API key auth but the Merged API only allows Cognito, those operations will fail.

**High latency**: Check resolver, function, and data source performance for the imported source API resources, and use AppSync and CloudWatch metrics to identify slow operations.

## Wrapping Up

AppSync Merged APIs solve the problem of API sprawl in microservices architectures. Combined with Amplify, you get a clean frontend development experience with a single GraphQL endpoint, automatic type generation, and unified authentication. The setup takes some upfront configuration, but once it is running, your frontend team never needs to worry about which backend team owns which API.
