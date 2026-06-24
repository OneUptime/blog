# How to Use Dapr JavaScript SDK with TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, TypeScript, JavaScript, Node.js, Type Safety

Description: Learn how to use the Dapr JavaScript SDK with TypeScript for type-safe distributed microservices with interfaces, generics, and decorators.

---

## Introduction

The Dapr JavaScript SDK is built with TypeScript and ships its own type definitions, making it an excellent choice for TypeScript projects. This guide shows how to leverage TypeScript's type system with Dapr for safer, more maintainable microservices.

## Project Setup

```bash
mkdir dapr-ts-service && cd dapr-ts-service
npm init -y
npm install @dapr/dapr
npm install --save-dev typescript ts-node @types/node
npx tsc --init
```

Configure `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Type-Safe DaprClient

```typescript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: process.env.DAPR_HOST ?? "localhost",
  daprPort: process.env.DAPR_HTTP_PORT ?? "3500",
});
```

## Typed State Management

Use generics to get typed state values:

```typescript
interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "paid" | "shipped" | "cancelled";
  createdAt: string;
}

interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

async function saveOrder(order: Order): Promise<void> {
  await client.state.save("statestore", [
    { key: order.id, value: order },
  ]);
}

async function getOrder(orderId: string): Promise<Order | null> {
  const value = await client.state.get("statestore", orderId);
  return (value as Order) ?? null;
}
```

## Typed Pub/Sub Events

Define event interfaces for strong typing:

```typescript
interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  total: number;
  timestamp: string;
}

async function publishOrderCreated(order: Order): Promise<void> {
  const event: OrderCreatedEvent = {
    orderId: order.id,
    customerId: order.customerId,
    total: order.total,
    timestamp: new Date().toISOString(),
  };

  await client.pubsub.publish("pubsub", "order-created", event);
}
```

## Typed Actor Interfaces

Define strongly typed actor interfaces:

```typescript
import { AbstractActor, ActorId, ActorProxyBuilder, DaprClient } from "@dapr/dapr";

interface IOrderActor {
  getStatus(): Promise<string>;
  updateStatus(status: string): Promise<void>;
  cancel(): Promise<void>;
}

class OrderActor extends AbstractActor implements IOrderActor {
  async getStatus(): Promise<string> {
    return (await this.getStateManager<string>().getState("status")) ?? "pending";
  }

  async updateStatus(status: string): Promise<void> {
    await this.getStateManager().setState("status", status);
  }

  async cancel(): Promise<void> {
    await this.updateStatus("cancelled");
  }
}

// Create a typed actor proxy
const builder = new ActorProxyBuilder<IOrderActor>(OrderActor, client);
const actor = builder.build(new ActorId("order-123"));
const status = await actor.getStatus(); // type: string
```

## Typed Service Invocation

```typescript
import { HttpMethod } from "@dapr/dapr";

interface InventoryResponse {
  productId: string;
  available: number;
  reserved: number;
}

async function checkInventory(productId: string): Promise<InventoryResponse> {
  const result = await client.invoker.invoke(
    "inventory-service",
    `stock/${productId}`,
    HttpMethod.GET
  );
  return result as InventoryResponse;
}
```

## Summary

The Dapr JavaScript SDK's built-in TypeScript support lets you define typed interfaces for state, events, actors, and service invocations. Using generics and interfaces across your Dapr interactions catches errors at compile time and makes your microservices codebase significantly easier to maintain and refactor.
