# How to Use Dapr Service Invocation with GraphQL Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GraphQL, Service Invocation, HTTP, API

Description: Learn how to invoke GraphQL endpoints through Dapr service invocation, passing queries, mutations, and variables while retaining observability and resiliency.

---

## GraphQL with Dapr Service Invocation

Dapr service invocation is protocol-agnostic at the HTTP level. Since GraphQL typically operates over HTTP POST to a single endpoint, it works seamlessly with Dapr's service invocation API.

## Exposing a GraphQL Endpoint

```javascript
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const gql = require('graphql-tag');

const typeDefs = gql`
  type Order {
    id: ID!
    item: String!
    qty: Int!
  }
  type Query {
    order(id: ID!): Order
    orders: [Order!]!
  }
  type Mutation {
    createOrder(item: String!, qty: Int!): Order!
  }
`;

const server = new ApolloServer({ typeDefs });

async function start() {
  await server.start();
  const app = express();
  app.use(express.json());
  app.use('/graphql', expressMiddleware(server));
  app.listen(3000);
}

start();
```

## Invoking a GraphQL Query Through Dapr

```bash
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ orders { id item qty } }"
  }'
```

## Invoking a GraphQL Query with Variables

```bash
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetOrder($id: ID!) { order(id: $id) { id item qty } }",
    "variables": { "id": "order-123" }
  }'
```

## Running a GraphQL Mutation

```bash
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateOrder($item: String!, $qty: Int!) { createOrder(item: $item, qty: $qty) { id } }",
    "variables": { "item": "widget", "qty": 5 }
  }'
```

## Using the Node.js Dapr SDK

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');
const client = new DaprClient();

const query = `
  mutation CreateOrder($item: String!, $qty: Int!) {
    createOrder(item: $item, qty: $qty) {
      id
      item
    }
  }
`;

const result = await client.invoker.invoke(
  'order-service',
  'graphql',
  HttpMethod.POST,
  JSON.stringify({ query, variables: { item: 'widget', qty: 5 } }),
  { headers: { 'Content-Type': 'application/json' } }
);
```

## Adding Authentication Headers

```bash
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "{ orders { id } }"}'
```

## Summary

GraphQL endpoints work naturally with Dapr service invocation because GraphQL uses standard HTTP POST. Call the `/graphql` method path with your query, mutation, and variables in the JSON body. Dapr provides service discovery, retries, and distributed tracing for all GraphQL calls without any special configuration.
