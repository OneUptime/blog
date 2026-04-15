# How to Build Dapr Actors with JavaScript SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, JavaScript, Node.js, Microservice

Description: Learn how to build Dapr virtual actors in JavaScript using the Node.js SDK, including actor state management, method registration, and client invocation patterns.

---

## What Are Dapr Actors?

Dapr virtual actors give you a single-threaded, stateful programming model for building distributed applications. Each actor instance processes one request at a time and maintains its own state, stored reliably via Dapr state stores. The JavaScript SDK provides a clean class-based API for defining and hosting actors in Node.js.

## Installing the SDK

```bash
npm install @dapr/dapr
```

## Defining an Actor

Extend `AbstractActor` to create your actor implementation:

```javascript
const { AbstractActor } = require('@dapr/dapr');

class ShoppingCartActor extends AbstractActor {

  async onActivate() {
    console.log(`Actor ${this.getActorId().getId()} activated`);
  }

  async addItem(item) {
    const { productId, name, price, quantity } = item;

    // Get existing cart items
    const items = await this.getStateManager().getOrAddState('items', []);

    const existing = items.find(i => i.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ productId, name, price, quantity });
    }

    await this.getStateManager().setState('items', items);
    return { itemCount: items.length };
  }

  async removeItem(productId) {
    const items = await this.getStateManager().getOrAddState('items', []);
    const filtered = items.filter(i => i.productId !== productId);
    await this.getStateManager().setState('items', filtered);
    return { itemCount: filtered.length };
  }

  async getCart() {
    const items = await this.getStateManager().getOrAddState('items', []);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { items, total };
  }

  async checkout() {
    const cart = await this.getCart();
    if (cart.items.length === 0) {
      return { success: false, reason: 'Cart is empty' };
    }
    // Process checkout logic here
    await this.getStateManager().setState('items', []);
    return { success: true, total: cart.total };
  }
}

module.exports = ShoppingCartActor;
```

## Hosting the Actor in an Express Service

```javascript
const { DaprServer, CommunicationProtocolEnum } = require('@dapr/dapr');
const ShoppingCartActor = require('./ShoppingCartActor');

const server = new DaprServer({
  serverHost: '127.0.0.1',
  serverPort: '3000',
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  clientOptions: {
    daprHost: '127.0.0.1',
    daprPort: '3500',
  },
});

async function start() {
  await server.actor.init();
  await server.actor.registerActor(ShoppingCartActor);
  await server.start();
  console.log('Actor service running on port 3000');
}

start().catch(console.error);
```

Run with the Dapr sidecar:

```bash
dapr run --app-id cart-service --app-port 3000 -- node index.js
```

## Calling Actors from a Client

```javascript
const { DaprClient, ActorProxyBuilder, ActorId } = require('@dapr/dapr');

async function main() {
  const client = new DaprClient({
    daprHost: '127.0.0.1',
    daprPort: '3500',
  });

  const builder = new ActorProxyBuilder(ShoppingCartActor, client);
  const cart = builder.build(new ActorId('user-42'));

  // Add items to cart
  await cart.addItem({ productId: 'prod-1', name: 'Widget', price: 9.99, quantity: 2 });
  await cart.addItem({ productId: 'prod-2', name: 'Gadget', price: 24.99, quantity: 1 });

  // Get cart state
  const cartState = await cart.getCart();
  console.log('Cart:', JSON.stringify(cartState, null, 2));

  // Checkout
  const result = await cart.checkout();
  console.log('Checkout result:', result);
}

main().catch(console.error);
```

## Actor Configuration

Configure idle timeout and scan interval via the `DaprServer` client options:

```javascript
const server = new DaprServer({
  serverHost: '127.0.0.1',
  serverPort: '3000',
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  clientOptions: {
    daprHost: '127.0.0.1',
    daprPort: '3500',
    actor: {
      actorIdleTimeout: '60m',
      actorScanInterval: '30s',
      drainOngoingCallTimeout: '30s',
    },
  },
});
```

To enable the Actor State TTL feature, add a Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: actor-config
spec:
  features:
    - name: ActorStateTTL
      enabled: true
```

## Summary

Building Dapr actors in JavaScript means extending `AbstractActor`, using `this.getStateManager()` for persistence, and hosting in a `DaprServer`. The proxy builder on the client side provides a type-aware interface for invoking actor methods. Dapr handles all the complexity of placement, activation, and state storage.
