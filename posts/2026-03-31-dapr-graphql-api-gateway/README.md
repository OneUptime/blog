# How to Build a GraphQL API Gateway with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GraphQL, API Gateway, Microservice, Architecture

Description: Learn how to build a GraphQL API gateway that aggregates data from multiple Dapr microservices using service invocation, providing a unified GraphQL schema for clients.

---

## GraphQL Gateway with Dapr

A GraphQL API gateway aggregates multiple microservices behind a single schema. In a Dapr architecture, the gateway uses Dapr service invocation to call downstream services, benefiting from built-in retry, mTLS, and distributed tracing without additional infrastructure.

## Setting Up the Gateway Service

Create a Node.js GraphQL gateway using Apollo Server and the Dapr JavaScript SDK:

```javascript
// gateway.js
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const express = require("express");
const cors = require("cors");
const { DaprClient, HttpMethod } = require("@dapr/dapr");

const dapr = new DaprClient({
    daprHost: "localhost",
    daprPort: process.env.DAPR_HTTP_PORT || "3500"
});

const typeDefs = `#graphql
    type User {
        id: ID!
        name: String!
        email: String!
        orders: [Order]
    }

    type Order {
        id: ID!
        userId: ID!
        total: Float!
        status: String!
        items: [OrderItem]
    }

    type OrderItem {
        productId: String!
        quantity: Int!
        price: Float!
    }

    type Query {
        user(id: ID!): User
        order(id: ID!): Order
        userOrders(userId: ID!): [Order]
    }
`;

const resolvers = {
    Query: {
        user: async (_, { id }) => {
            const response = await dapr.invoker.invoke(
                "user-service",
                `users/${id}`,
                HttpMethod.GET
            );
            return response;
        },

        order: async (_, { id }) => {
            const response = await dapr.invoker.invoke(
                "order-service",
                `orders/${id}`,
                HttpMethod.GET
            );
            return response;
        },

        userOrders: async (_, { userId }) => {
            const response = await dapr.invoker.invoke(
                "order-service",
                `orders?userId=${userId}`,
                HttpMethod.GET
            );
            return response;
        }
    },

    User: {
        orders: async (user) => {
            const response = await dapr.invoker.invoke(
                "order-service",
                `orders?userId=${user.id}`,
                HttpMethod.GET
            );
            return response;
        }
    }
};
```

## Configuring the Gateway Dapr Sidecar

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphql-gateway
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: graphql-gateway
  template:
    metadata:
      labels:
        app: graphql-gateway
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "graphql-gateway"
        dapr.io/app-port: "4000"
        dapr.io/config: "tracing-config"
    spec:
      containers:
      - name: graphql-gateway
        image: myregistry/graphql-gateway:latest
        ports:
        - containerPort: 4000
        env:
        - name: PORT
          value: "4000"
```

## Adding Authentication Middleware

Protect the GraphQL endpoint with Dapr OAuth2 middleware:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-middleware
  namespace: production
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientId
    secretKeyRef:
      name: oauth-secret
      key: clientId
  - name: clientSecret
    secretKeyRef:
      name: oauth-secret
      key: clientSecret
  - name: scopes
    value: "api.read api.write"
  - name: tokenURL
    value: "https://auth.example.com/oauth2/token"
  - name: headerName
    value: "Authorization"
```

## DataLoader for Efficient Batching

Prevent N+1 query problems with DataLoader:

```javascript
const DataLoader = require("dataloader");

const userLoader = new DataLoader(async (userIds) => {
    // Batch multiple user IDs into a single Dapr call
    const response = await dapr.invoker.invoke(
        "user-service",
        "users/batch",
        HttpMethod.POST,
        { ids: userIds }
    );
    return userIds.map(id => response.find(u => u.id === id));
});

const resolvers = {
    Order: {
        user: async (order) => {
            return userLoader.load(order.userId);
        }
    }
};
```

## Starting the Apollo Server

```javascript
async function startServer() {
    const app = express();
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: process.env.NODE_ENV !== "production"
    });

    await server.start();

    app.use(
        "/graphql",
        cors(),
        express.json(),
        expressMiddleware(server, {
            context: async ({ req }) => ({
                authToken: req.headers.authorization,
                userLoader
            })
        })
    );

    app.listen(4000, () => {
        console.log("GraphQL Gateway on :4000/graphql");
    });
}

startServer();
```

## Summary

Building a GraphQL API gateway with Dapr leverages service invocation to call downstream microservices with built-in resilience, mTLS, and distributed tracing. Define a unified GraphQL schema in the gateway, use Dapr invoker resolvers to fetch data from individual microservices, and add DataLoader for request batching to prevent N+1 query problems. Apply Dapr's OAuth2 middleware component to protect the GraphQL endpoint without writing authentication logic in the gateway itself.
