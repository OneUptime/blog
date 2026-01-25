# How to Build Event-Sourced Apps with EventStoreDB in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Event Sourcing, EventStoreDB, Node.js, TypeScript, CQRS, Event-Driven Architecture, Backend

Description: Learn how to build event-sourced applications in Node.js using EventStoreDB. This guide covers event modeling, stream management, projections, and practical patterns for building reliable event-driven systems.

---

> Event sourcing stores every state change as an immutable event, giving you a complete audit trail and the ability to reconstruct state at any point in time. EventStoreDB is purpose-built for this pattern, providing high-performance event storage with built-in projections and subscriptions.

Traditional databases store current state, losing the history of how that state was reached. Event sourcing preserves every change, making it invaluable for systems that need audit trails, temporal queries, or the ability to replay events to rebuild state. EventStoreDB makes implementing this pattern straightforward in Node.js applications.

---

## Prerequisites

Before getting started, you need:
- Node.js 18 or higher
- Docker for running EventStoreDB
- Basic understanding of TypeScript
- Familiarity with async/await patterns

---

## Setting Up EventStoreDB

Start EventStoreDB using Docker. The insecure flag disables SSL for local development.

```bash
# Run EventStoreDB in Docker
docker run -d --name eventstoredb \
  -p 2113:2113 \
  -p 1113:1113 \
  eventstore/eventstore:latest \
  --insecure \
  --run-projections=All \
  --enable-atom-pub-over-http

# Verify it is running
curl http://localhost:2113/health/live
```

Access the EventStoreDB admin UI at `http://localhost:2113` to browse streams and events.

---

## Project Setup

Initialize a TypeScript project and install the EventStoreDB client.

```bash
mkdir event-sourcing-app
cd event-sourcing-app
npm init -y
npm install @eventstore/db-client uuid
npm install -D typescript @types/node @types/uuid ts-node
npx tsc --init
```

Configure TypeScript for modern Node.js development.

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## Connecting to EventStoreDB

Create a client connection that handles reconnection and configuration.

```typescript
// src/infrastructure/eventstore-client.ts
import { EventStoreDBClient, jsonEvent } from '@eventstore/db-client';

// Connection string for local development
// Use esdb+discover:// for clustered deployments
const connectionString = 'esdb://localhost:2113?tls=false';

// Create a singleton client instance
export const eventStoreClient = EventStoreDBClient.connectionString(connectionString);

// Helper to verify connection on startup
export async function verifyConnection(): Promise<void> {
  try {
    // Reading from $all stream verifies the connection works
    const events = eventStoreClient.readAll({
      maxCount: 1,
      direction: 'forwards',
      fromPosition: 'start',
    });

    // Consume the iterator to complete the request
    for await (const _ of events) {
      break;
    }

    console.log('Connected to EventStoreDB successfully');
  } catch (error) {
    console.error('Failed to connect to EventStoreDB:', error);
    throw error;
  }
}
```

---

## Defining Events

Events are the core of event sourcing. Define them as immutable objects with clear types.

```typescript
// src/domain/events/order-events.ts
import { v4 as uuidv4 } from 'uuid';

// Base interface for all events
export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId: string;
  causationId?: string;
  userId?: string;
}

// Order-specific events
export interface OrderCreated extends DomainEvent {
  eventType: 'OrderCreated';
  data: {
    orderId: string;
    customerId: string;
    items: OrderItem[];
  };
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ItemAddedToOrder extends DomainEvent {
  eventType: 'ItemAddedToOrder';
  data: {
    orderId: string;
    item: OrderItem;
  };
}

export interface ItemRemovedFromOrder extends DomainEvent {
  eventType: 'ItemRemovedFromOrder';
  data: {
    orderId: string;
    productId: string;
  };
}

export interface OrderShipped extends DomainEvent {
  eventType: 'OrderShipped';
  data: {
    orderId: string;
    shippingAddress: string;
    trackingNumber: string;
    shippedAt: Date;
  };
}

export interface OrderCancelled extends DomainEvent {
  eventType: 'OrderCancelled';
  data: {
    orderId: string;
    reason: string;
    cancelledAt: Date;
  };
}

// Union type of all order events
export type OrderEvent =
  | OrderCreated
  | ItemAddedToOrder
  | ItemRemovedFromOrder
  | OrderShipped
  | OrderCancelled;

// Factory functions for creating events
export function createOrderCreatedEvent(
  orderId: string,
  customerId: string,
  items: OrderItem[],
  metadata: EventMetadata
): OrderCreated {
  return {
    eventId: uuidv4(),
    eventType: 'OrderCreated',
    timestamp: new Date(),
    metadata,
    data: { orderId, customerId, items },
  };
}

export function createItemAddedEvent(
  orderId: string,
  item: OrderItem,
  metadata: EventMetadata
): ItemAddedToOrder {
  return {
    eventId: uuidv4(),
    eventType: 'ItemAddedToOrder',
    timestamp: new Date(),
    metadata,
    data: { orderId, item },
  };
}

export function createOrderShippedEvent(
  orderId: string,
  shippingAddress: string,
  trackingNumber: string,
  metadata: EventMetadata
): OrderShipped {
  return {
    eventId: uuidv4(),
    eventType: 'OrderShipped',
    timestamp: new Date(),
    metadata,
    data: {
      orderId,
      shippingAddress,
      trackingNumber,
      shippedAt: new Date(),
    },
  };
}
```

---

## Building the Event Store Repository

Create a repository that handles appending events to streams and reading event history.

```typescript
// src/infrastructure/order-repository.ts
import {
  EventStoreDBClient,
  jsonEvent,
  JSONEventType,
  StreamNotFoundError,
  WrongExpectedVersionError,
  AppendExpectedRevision
} from '@eventstore/db-client';
import { OrderEvent } from '../domain/events/order-events';
import { eventStoreClient } from './eventstore-client';

// Stream naming convention: aggregate type followed by ID
function getStreamName(orderId: string): string {
  return `order-${orderId}`;
}

export class OrderRepository {
  private client: EventStoreDBClient;

  constructor() {
    this.client = eventStoreClient;
  }

  // Append events to an order stream
  async appendEvents(
    orderId: string,
    events: OrderEvent[],
    expectedRevision: AppendExpectedRevision = 'any'
  ): Promise<void> {
    const streamName = getStreamName(orderId);

    // Convert domain events to EventStoreDB format
    const esdbEvents = events.map(event =>
      jsonEvent({
        type: event.eventType,
        data: event.data,
        metadata: {
          ...event.metadata,
          eventId: event.eventId,
          timestamp: event.timestamp.toISOString(),
        },
      })
    );

    try {
      // Append events with optimistic concurrency
      const result = await this.client.appendToStream(
        streamName,
        esdbEvents,
        { expectedRevision }
      );

      console.log(`Appended ${events.length} events to ${streamName}, revision: ${result.nextExpectedRevision}`);
    } catch (error) {
      if (error instanceof WrongExpectedVersionError) {
        // Concurrency conflict - another process modified the stream
        throw new Error(`Concurrency conflict on order ${orderId}. Please retry.`);
      }
      throw error;
    }
  }

  // Read all events for an order
  async getEvents(orderId: string): Promise<OrderEvent[]> {
    const streamName = getStreamName(orderId);
    const events: OrderEvent[] = [];

    try {
      const readResult = this.client.readStream(streamName, {
        direction: 'forwards',
        fromRevision: 'start',
      });

      for await (const resolvedEvent of readResult) {
        if (!resolvedEvent.event) continue;

        const { type, data, metadata } = resolvedEvent.event;

        // Reconstruct domain event from stored data
        const domainEvent: OrderEvent = {
          eventId: (metadata as any)?.eventId || resolvedEvent.event.id,
          eventType: type as OrderEvent['eventType'],
          timestamp: new Date((metadata as any)?.timestamp || Date.now()),
          metadata: {
            correlationId: (metadata as any)?.correlationId || '',
            causationId: (metadata as any)?.causationId,
            userId: (metadata as any)?.userId,
          },
          data: data as any,
        } as OrderEvent;

        events.push(domainEvent);
      }
    } catch (error) {
      if (error instanceof StreamNotFoundError) {
        // Stream does not exist yet - return empty array
        return [];
      }
      throw error;
    }

    return events;
  }

  // Get current stream revision for optimistic concurrency
  async getStreamRevision(orderId: string): Promise<bigint | 'no_stream'> {
    const streamName = getStreamName(orderId);

    try {
      const readResult = this.client.readStream(streamName, {
        direction: 'backwards',
        fromRevision: 'end',
        maxCount: 1,
      });

      for await (const resolvedEvent of readResult) {
        if (resolvedEvent.event) {
          return resolvedEvent.event.revision;
        }
      }
    } catch (error) {
      if (error instanceof StreamNotFoundError) {
        return 'no_stream';
      }
      throw error;
    }

    return 'no_stream';
  }
}
```

---

## Building Aggregates from Events

Aggregates reconstruct their state by replaying events. This is the core of event sourcing.

```typescript
// src/domain/aggregates/order.ts
import {
  OrderEvent,
  OrderItem,
  createOrderCreatedEvent,
  createItemAddedEvent,
  createOrderShippedEvent,
  EventMetadata
} from '../events/order-events';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'cancelled';

export interface OrderState {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  shippingAddress?: string;
  trackingNumber?: string;
  createdAt?: Date;
  shippedAt?: Date;
  cancelledAt?: Date;
}

export class Order {
  private state: OrderState;
  private uncommittedEvents: OrderEvent[] = [];

  private constructor(state: OrderState) {
    this.state = state;
  }

  // Factory method to create a new order
  static create(
    orderId: string,
    customerId: string,
    items: OrderItem[],
    metadata: EventMetadata
  ): Order {
    const initialState: OrderState = {
      orderId,
      customerId,
      items: [],
      status: 'pending',
      totalAmount: 0,
    };

    const order = new Order(initialState);

    // Raise the creation event
    const event = createOrderCreatedEvent(orderId, customerId, items, metadata);
    order.apply(event);
    order.uncommittedEvents.push(event);

    return order;
  }

  // Reconstruct an order from event history
  static fromEvents(events: OrderEvent[]): Order {
    const initialState: OrderState = {
      orderId: '',
      customerId: '',
      items: [],
      status: 'pending',
      totalAmount: 0,
    };

    const order = new Order(initialState);

    // Replay each event to rebuild state
    for (const event of events) {
      order.apply(event);
    }

    return order;
  }

  // Apply an event to update state
  private apply(event: OrderEvent): void {
    switch (event.eventType) {
      case 'OrderCreated':
        this.state.orderId = event.data.orderId;
        this.state.customerId = event.data.customerId;
        this.state.items = [...event.data.items];
        this.state.status = 'pending';
        this.state.totalAmount = this.calculateTotal(event.data.items);
        this.state.createdAt = event.timestamp;
        break;

      case 'ItemAddedToOrder':
        this.state.items.push(event.data.item);
        this.state.totalAmount = this.calculateTotal(this.state.items);
        break;

      case 'ItemRemovedFromOrder':
        this.state.items = this.state.items.filter(
          item => item.productId !== event.data.productId
        );
        this.state.totalAmount = this.calculateTotal(this.state.items);
        break;

      case 'OrderShipped':
        this.state.status = 'shipped';
        this.state.shippingAddress = event.data.shippingAddress;
        this.state.trackingNumber = event.data.trackingNumber;
        this.state.shippedAt = event.data.shippedAt;
        break;

      case 'OrderCancelled':
        this.state.status = 'cancelled';
        this.state.cancelledAt = event.data.cancelledAt;
        break;
    }
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  }

  // Command: Add an item to the order
  addItem(item: OrderItem, metadata: EventMetadata): void {
    if (this.state.status !== 'pending') {
      throw new Error(`Cannot add items to an order with status: ${this.state.status}`);
    }

    const event = createItemAddedEvent(this.state.orderId, item, metadata);
    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  // Command: Ship the order
  ship(shippingAddress: string, trackingNumber: string, metadata: EventMetadata): void {
    if (this.state.status !== 'pending') {
      throw new Error(`Cannot ship an order with status: ${this.state.status}`);
    }

    if (this.state.items.length === 0) {
      throw new Error('Cannot ship an empty order');
    }

    const event = createOrderShippedEvent(
      this.state.orderId,
      shippingAddress,
      trackingNumber,
      metadata
    );
    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  // Get events that have not been persisted yet
  getUncommittedEvents(): OrderEvent[] {
    return [...this.uncommittedEvents];
  }

  // Clear uncommitted events after persisting
  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }

  // Getters for aggregate state
  get id(): string { return this.state.orderId; }
  get customerId(): string { return this.state.customerId; }
  get items(): OrderItem[] { return [...this.state.items]; }
  get status(): OrderStatus { return this.state.status; }
  get totalAmount(): number { return this.state.totalAmount; }
}
```

---

## Building Read Models with Subscriptions

Subscriptions allow you to build read models that update in real-time as events are appended.

```typescript
// src/projections/order-read-model.ts
import { eventStoreClient } from '../infrastructure/eventstore-client';
import { OrderEvent } from '../domain/events/order-events';

// In-memory read model for demonstration
// Use a database like PostgreSQL or MongoDB in production
interface OrderSummary {
  orderId: string;
  customerId: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  lastUpdated: Date;
}

const orderSummaries = new Map<string, OrderSummary>();

// Process an event to update the read model
function handleEvent(event: OrderEvent): void {
  switch (event.eventType) {
    case 'OrderCreated': {
      const summary: OrderSummary = {
        orderId: event.data.orderId,
        customerId: event.data.customerId,
        itemCount: event.data.items.length,
        totalAmount: event.data.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        ),
        status: 'pending',
        lastUpdated: event.timestamp,
      };
      orderSummaries.set(event.data.orderId, summary);
      console.log(`Read model: Created order ${event.data.orderId}`);
      break;
    }

    case 'ItemAddedToOrder': {
      const existing = orderSummaries.get(event.data.orderId);
      if (existing) {
        existing.itemCount += 1;
        existing.totalAmount += event.data.item.quantity * event.data.item.unitPrice;
        existing.lastUpdated = event.timestamp;
      }
      break;
    }

    case 'OrderShipped': {
      const existing = orderSummaries.get(event.data.orderId);
      if (existing) {
        existing.status = 'shipped';
        existing.lastUpdated = event.timestamp;
      }
      break;
    }

    case 'OrderCancelled': {
      const existing = orderSummaries.get(event.data.orderId);
      if (existing) {
        existing.status = 'cancelled';
        existing.lastUpdated = event.timestamp;
      }
      break;
    }
  }
}

// Start a subscription to process events
export async function startOrderProjection(): Promise<void> {
  console.log('Starting order projection subscription...');

  // Subscribe to all streams matching the order pattern
  const subscription = eventStoreClient.subscribeToAll({
    filter: {
      filterOn: 'streamName',
      prefixes: ['order-'],
    },
    fromPosition: 'start', // Start from beginning to rebuild read model
  });

  for await (const resolvedEvent of subscription) {
    if (!resolvedEvent.event) continue;

    const { type, data, metadata } = resolvedEvent.event;

    // Convert to domain event and process
    const domainEvent: OrderEvent = {
      eventId: resolvedEvent.event.id,
      eventType: type as OrderEvent['eventType'],
      timestamp: new Date((metadata as any)?.timestamp || Date.now()),
      metadata: {
        correlationId: (metadata as any)?.correlationId || '',
      },
      data: data as any,
    } as OrderEvent;

    handleEvent(domainEvent);
  }
}

// Query functions for the read model
export function getOrderSummary(orderId: string): OrderSummary | undefined {
  return orderSummaries.get(orderId);
}

export function getOrdersByCustomer(customerId: string): OrderSummary[] {
  return Array.from(orderSummaries.values())
    .filter(order => order.customerId === customerId);
}

export function getOrdersByStatus(status: string): OrderSummary[] {
  return Array.from(orderSummaries.values())
    .filter(order => order.status === status);
}
```

---

## Putting It All Together

Create a simple application that demonstrates the complete event sourcing flow.

```typescript
// src/app.ts
import { v4 as uuidv4 } from 'uuid';
import { verifyConnection } from './infrastructure/eventstore-client';
import { OrderRepository } from './infrastructure/order-repository';
import { Order, OrderItem } from './domain/aggregates/order';
import { EventMetadata } from './domain/events/order-events';
import { startOrderProjection, getOrderSummary } from './projections/order-read-model';

async function main() {
  // Verify connection to EventStoreDB
  await verifyConnection();

  // Start the projection in the background
  startOrderProjection().catch(console.error);

  // Give the projection a moment to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  const repository = new OrderRepository();
  const orderId = uuidv4();
  const customerId = 'customer-123';

  // Create correlation ID for tracing this operation
  const metadata: EventMetadata = {
    correlationId: uuidv4(),
    userId: 'user-456',
  };

  console.log('\n--- Creating a new order ---');

  const items: OrderItem[] = [
    { productId: 'prod-1', productName: 'Widget', quantity: 2, unitPrice: 29.99 },
    { productId: 'prod-2', productName: 'Gadget', quantity: 1, unitPrice: 49.99 },
  ];

  // Create a new order aggregate
  const order = Order.create(orderId, customerId, items, metadata);

  // Persist the events
  await repository.appendEvents(
    orderId,
    order.getUncommittedEvents(),
    'no_stream' // Expect the stream does not exist yet
  );
  order.clearUncommittedEvents();

  console.log(`Created order ${orderId} with ${items.length} items`);
  console.log(`Total amount: $${order.totalAmount.toFixed(2)}`);

  // Add another item
  console.log('\n--- Adding an item to the order ---');

  const newItem: OrderItem = {
    productId: 'prod-3',
    productName: 'Accessory',
    quantity: 3,
    unitPrice: 9.99,
  };

  order.addItem(newItem, { ...metadata, causationId: metadata.correlationId });

  // Get current revision for optimistic concurrency
  const currentRevision = await repository.getStreamRevision(orderId);
  await repository.appendEvents(
    orderId,
    order.getUncommittedEvents(),
    currentRevision as bigint
  );
  order.clearUncommittedEvents();

  console.log(`Added ${newItem.productName} to order`);
  console.log(`New total: $${order.totalAmount.toFixed(2)}`);

  // Demonstrate replaying events to rebuild state
  console.log('\n--- Rebuilding order from events ---');

  const events = await repository.getEvents(orderId);
  const rebuiltOrder = Order.fromEvents(events);

  console.log(`Rebuilt order has ${rebuiltOrder.items.length} items`);
  console.log(`Rebuilt total: $${rebuiltOrder.totalAmount.toFixed(2)}`);
  console.log(`Status: ${rebuiltOrder.status}`);

  // Check the read model
  console.log('\n--- Read model state ---');
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for projection

  const summary = getOrderSummary(orderId);
  if (summary) {
    console.log('Order summary from read model:', summary);
  }

  console.log('\n--- Event history ---');
  events.forEach((event, index) => {
    console.log(`${index + 1}. ${event.eventType} at ${event.timestamp.toISOString()}`);
  });
}

main().catch(console.error);
```

---

## Conclusion

Event sourcing with EventStoreDB provides a powerful foundation for building systems that need complete audit trails, temporal queries, and reliable event-driven architectures. The key concepts to remember are:

1. **Events are immutable** and represent facts that have happened
2. **Aggregates** reconstruct their state by replaying events
3. **Optimistic concurrency** prevents conflicting updates
4. **Subscriptions** enable building multiple read models from the same event stream
5. **Projections** transform events into query-optimized views

EventStoreDB handles the complexities of event storage, ordering, and subscriptions, letting you focus on your domain logic. Start simple with a single aggregate and expand as you understand the patterns better.

---

*Building event-sourced applications? [OneUptime](https://oneuptime.com) helps you monitor your event streams and catch issues before they affect users. Track event processing latency, subscription health, and projection lag in real-time.*
