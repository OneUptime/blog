# How to Use Dapr Actors with JavaScript SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, JavaScript, Node.js, Stateful

Description: Learn how to implement the Virtual Actor pattern in Node.js using the Dapr JavaScript SDK for managing stateful, concurrent microservice entities.

---

## Introduction

The Dapr Actor model provides a pattern for building stateful, concurrent systems where each "actor" encapsulates state and behavior. Dapr manages actor placement, activation, and deactivation, making it easy to build scalable stateful services in Node.js.

## Installing the SDK

```bash
npm install @dapr/dapr
```

## Defining an Actor Interface

```typescript
// ICartActor.ts
export interface ICartActor {
  addItem(item: CartItem): Promise<void>;
  removeItem(itemId: string): Promise<void>;
  getItems(): Promise<CartItem[]>;
  checkout(): Promise<CheckoutResult>;
}
```

## Implementing the Actor

```typescript
// CartActor.ts
import { AbstractActor } from "@dapr/dapr";
import { ICartActor } from "./ICartActor";

export class CartActor extends AbstractActor implements ICartActor {
  private readonly CART_STATE_KEY = "cart-items";

  async addItem(item: CartItem): Promise<void> {
    const items = (await this.getStateManager().getState<CartItem[]>(
      this.CART_STATE_KEY
    )) ?? [];
    items.push(item);
    await this.getStateManager().setState(this.CART_STATE_KEY, items);
    console.log(`Added item ${item.id} to cart ${this.getActorId().getId()}`);
  }

  async removeItem(itemId: string): Promise<void> {
    const items = (await this.getStateManager().getState<CartItem[]>(
      this.CART_STATE_KEY
    )) ?? [];
    const filtered = items.filter((i) => i.id !== itemId);
    await this.getStateManager().setState(this.CART_STATE_KEY, filtered);
  }

  async getItems(): Promise<CartItem[]> {
    return (
      (await this.getStateManager().getState<CartItem[]>(
        this.CART_STATE_KEY
      )) ?? []
    );
  }

  async checkout(): Promise<CheckoutResult> {
    const items = await this.getItems();
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    await this.getStateManager().setState(this.CART_STATE_KEY, []);
    return { orderId: `order-${Date.now()}`, total, items };
  }
}
```

## Registering the Actor

Register the actor class with `DaprServer`:

```typescript
import { DaprServer, ActorProxyBuilder, ActorId } from "@dapr/dapr";
import { CartActor } from "./CartActor";

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3000",
  clientOptions: { daprHost: "127.0.0.1", daprPort: "3500" },
});

await server.actor.init();
server.actor.registerActor(CartActor);
await server.start();
```

## Calling an Actor

Use `ActorProxyBuilder` to create a proxy and invoke actor methods:

```typescript
import { ActorProxyBuilder, ActorId, DaprClient } from "@dapr/dapr";
import { ICartActor } from "./ICartActor";
import { CartActor } from "./CartActor";

const client = new DaprClient({ daprHost: "127.0.0.1", daprPort: "3500" });

const builder = new ActorProxyBuilder<ICartActor>(CartActor, client);
const cart = builder.build(new ActorId("user-42"));

await cart.addItem({ id: "prod-1", name: "Widget", price: 9.99, qty: 2 });
const items = await cart.getItems();
console.log("Cart items:", items);

const result = await cart.checkout();
console.log("Checkout total:", result.total);
```

## Summary

Dapr Actors in the JavaScript SDK give you a straightforward way to implement the Virtual Actor pattern with built-in state persistence, turn-based concurrency, and automatic actor lifecycle management. Each actor instance is identified by a unique ID, making it natural to model per-user or per-entity state in your microservices.
