# How to Build Microservices with Dapr and Fastify

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Fastify, Microservice, Node.js, Performance

Description: Learn how to build high-performance Node.js microservices using Dapr and Fastify with state management, pub/sub, and service invocation support.

---

## Introduction

Fastify is a high-performance Node.js web framework that is significantly faster than Express. Pairing Fastify with Dapr gives you a powerful combination for building efficient, distributed microservices.

## Project Setup

```bash
mkdir product-service && cd product-service
npm init -y
npm install @dapr/dapr fastify
```

## Creating the Fastify App with Dapr

```javascript
// src/app.js
const Fastify = require("fastify");
const { DaprClient } = require("@dapr/dapr");

const fastify = Fastify({ logger: true });

const daprClient = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: process.env.DAPR_HTTP_PORT || "3500",
});

module.exports = { fastify, daprClient };
```

## Registering Product Routes

```javascript
// src/routes/products.js
async function productRoutes(fastify, options) {
  const { daprClient } = options;

  fastify.post("/products", async (request, reply) => {
    const product = {
      id: `prod-${Date.now()}`,
      ...request.body,
      createdAt: new Date().toISOString(),
    };

    await daprClient.state.save("statestore", [
      { key: product.id, value: product },
    ]);

    await daprClient.pubsub.publish("pubsub", "product-created", product);

    reply.code(201).send(product);
  });

  fastify.get("/products/:id", async (request, reply) => {
    const product = await daprClient.state.get(
      "statestore",
      request.params.id
    );
    if (!product) {
      reply.code(404).send({ error: "Product not found" });
      return;
    }
    return product;
  });

  fastify.delete("/products/:id", async (request, reply) => {
    await daprClient.state.delete("statestore", request.params.id);
    await daprClient.pubsub.publish("pubsub", "product-deleted", {
      id: request.params.id,
    });
    reply.code(204).send();
  });
}

module.exports = productRoutes;
```

## Schema Validation with Fastify

Add JSON Schema validation for type safety:

```javascript
const createProductSchema = {
  body: {
    type: "object",
    required: ["name", "price"],
    properties: {
      name: { type: "string", minLength: 1 },
      price: { type: "number", minimum: 0 },
      category: { type: "string" },
    },
  },
};

fastify.post("/products", { schema: createProductSchema }, async (req, reply) => {
  // handler
});
```

## Setting Up Subscriptions

```javascript
// src/subscriber.js
const { DaprServer } = require("@dapr/dapr");

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3001",
  clientOptions: { daprHost: "127.0.0.1", daprPort: "3501" },
});

async function main() {
  await server.pubsub.subscribe("pubsub", "order-created", async (data) => {
    console.log("Order created, checking inventory for:", data.productId);
    await updateInventory(data.productId, data.quantity);
  });

  await server.start();
}

main().catch(console.error);
```

## Starting the Server

```javascript
// src/index.js
const { fastify, daprClient } = require("./app");
const productRoutes = require("./routes/products");

fastify.register(productRoutes, { daprClient, prefix: "/api" });

fastify.get("/health", async () => ({ status: "ok" }));

const PORT = process.env.APP_PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Product service running on port ${PORT}`);
});
```

## Running with Dapr

```bash
dapr run \
  --app-id product-service \
  --app-port 3000 \
  --components-path ./dapr/components \
  -- node src/index.js
```

## Summary

Combining Dapr with Fastify produces highly performant Node.js microservices with built-in schema validation, structured logging, and distributed systems primitives. Fastify's plugin architecture integrates naturally with Dapr, and the separation of routing concerns from infrastructure concerns keeps the codebase maintainable as services grow.
