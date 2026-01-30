# How to Implement Event Versioning Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Event-Driven, Architecture, Messaging, Versioning

Description: Handle event schema evolution with versioning strategies including upcasting, weak schema, and multiple versions for backward compatibility.

---

## Introduction

Event-driven systems face a common challenge: events stored in your event store or message broker will outlive the code that produced them. As your application evolves, event schemas change. Fields get added, removed, or renamed. Data types shift. Without a proper versioning strategy, you will break consumers, corrupt data, or lose the ability to replay historical events.

This guide covers practical approaches to event versioning that keep your system running smoothly during schema evolution.

## Why Event Versioning Matters

Consider a simple order event that started like this:

```json
{
  "eventType": "OrderPlaced",
  "orderId": "12345",
  "amount": 99.99
}
```

Six months later, requirements changed. You now need to track currency and split the amount into subtotal and tax:

```json
{
  "eventType": "OrderPlaced",
  "orderId": "12345",
  "subtotal": 89.99,
  "tax": 10.00,
  "currency": "USD"
}
```

Without versioning, consumers expecting the old format will fail when they encounter new events. Worse, if you replay old events through new code, you will get null pointer exceptions or corrupted calculations.

### The Core Problems

| Problem | Impact |
|---------|--------|
| Breaking changes in production | Consumer crashes, data loss |
| Inability to replay events | Lost audit trail, broken rebuilds |
| Tight coupling between services | Deployment coordination nightmares |
| Schema drift | Silent data corruption |

## Strategy 1: Version in Event Metadata

The most straightforward approach is embedding version information directly in each event.

### Basic Version Header

Every event includes a version field in its metadata. This allows consumers to route events to the appropriate handler.

```typescript
// Define a base event interface with version metadata
interface EventMetadata {
  eventId: string;
  eventType: string;
  version: number;
  timestamp: string;
  correlationId?: string;
}

interface VersionedEvent<T> {
  metadata: EventMetadata;
  payload: T;
}

// Version 1 of OrderPlaced
interface OrderPlacedV1 {
  orderId: string;
  amount: number;
}

// Version 2 adds currency and splits amount
interface OrderPlacedV2 {
  orderId: string;
  subtotal: number;
  tax: number;
  currency: string;
}

// Factory function to create versioned events
function createOrderPlacedV2(
  orderId: string,
  subtotal: number,
  tax: number,
  currency: string
): VersionedEvent<OrderPlacedV2> {
  return {
    metadata: {
      eventId: crypto.randomUUID(),
      eventType: 'OrderPlaced',
      version: 2,
      timestamp: new Date().toISOString()
    },
    payload: {
      orderId,
      subtotal,
      tax,
      currency
    }
  };
}
```

### Version-Aware Consumer

Build consumers that handle multiple versions by checking the version field and routing to the appropriate handler.

```typescript
// Type definitions for version handlers
type EventHandler<T> = (payload: T) => Promise<void>;

interface VersionHandlers {
  [version: number]: EventHandler<unknown>;
}

class OrderEventConsumer {
  private handlers: Map<string, VersionHandlers> = new Map();

  constructor() {
    // Register handlers for OrderPlaced event
    this.handlers.set('OrderPlaced', {
      1: this.handleOrderPlacedV1.bind(this),
      2: this.handleOrderPlacedV2.bind(this)
    });
  }

  async processEvent(event: VersionedEvent<unknown>): Promise<void> {
    const { eventType, version } = event.metadata;
    const versionHandlers = this.handlers.get(eventType);

    if (!versionHandlers) {
      throw new Error(`No handlers registered for event type: ${eventType}`);
    }

    const handler = versionHandlers[version];
    if (!handler) {
      throw new Error(`No handler for ${eventType} version ${version}`);
    }

    await handler(event.payload);
  }

  private async handleOrderPlacedV1(payload: OrderPlacedV1): Promise<void> {
    // V1 only has total amount, assume USD and no tax breakdown
    console.log(`Processing V1 order: ${payload.orderId}`);
    console.log(`Total amount: ${payload.amount}`);

    // Convert to internal representation
    const order = {
      id: payload.orderId,
      subtotal: payload.amount,
      tax: 0,
      currency: 'USD'
    };

    await this.saveOrder(order);
  }

  private async handleOrderPlacedV2(payload: OrderPlacedV2): Promise<void> {
    console.log(`Processing V2 order: ${payload.orderId}`);
    console.log(`Subtotal: ${payload.subtotal}, Tax: ${payload.tax}`);

    const order = {
      id: payload.orderId,
      subtotal: payload.subtotal,
      tax: payload.tax,
      currency: payload.currency
    };

    await this.saveOrder(order);
  }

  private async saveOrder(order: {
    id: string;
    subtotal: number;
    tax: number;
    currency: string;
  }): Promise<void> {
    // Database save logic here
    console.log('Saving order:', order);
  }
}
```

## Strategy 2: Upcasting Old Events

Upcasting transforms old event versions into newer versions at read time. Instead of maintaining handlers for every version, you convert old events to the latest format.

### Upcaster Chain

Define upcasters that transform events from version N to version N+1. Chain them together to bring any old event up to the current version.

```typescript
// Generic upcaster interface
interface Upcaster<TFrom, TTo> {
  fromVersion: number;
  toVersion: number;
  upcast(payload: TFrom): TTo;
}

// Upcaster from V1 to V2
const orderPlacedV1ToV2: Upcaster<OrderPlacedV1, OrderPlacedV2> = {
  fromVersion: 1,
  toVersion: 2,
  upcast(v1: OrderPlacedV1): OrderPlacedV2 {
    // Convert single amount to subtotal with zero tax
    // Default to USD for legacy events
    return {
      orderId: v1.orderId,
      subtotal: v1.amount,
      tax: 0,
      currency: 'USD'
    };
  }
};

// V3 adds customer information
interface OrderPlacedV3 extends OrderPlacedV2 {
  customerId: string;
  customerEmail: string;
}

const orderPlacedV2ToV3: Upcaster<OrderPlacedV2, OrderPlacedV3> = {
  fromVersion: 2,
  toVersion: 3,
  upcast(v2: OrderPlacedV2): OrderPlacedV3 {
    return {
      ...v2,
      // Legacy events have no customer info, use placeholder
      customerId: 'LEGACY_UNKNOWN',
      customerEmail: 'unknown@legacy.local'
    };
  }
};
```

### Upcaster Registry

The registry manages all upcasters and automatically chains them to bring events to the target version.

```typescript
class UpcasterRegistry {
  private upcasters: Map<string, Upcaster<unknown, unknown>[]> = new Map();

  registerUpcaster(eventType: string, upcaster: Upcaster<unknown, unknown>): void {
    const existing = this.upcasters.get(eventType) || [];
    existing.push(upcaster);
    // Sort by fromVersion to ensure correct chain order
    existing.sort((a, b) => a.fromVersion - b.fromVersion);
    this.upcasters.set(eventType, existing);
  }

  upcast<T>(
    eventType: string,
    payload: unknown,
    fromVersion: number,
    toVersion: number
  ): T {
    if (fromVersion >= toVersion) {
      return payload as T;
    }

    const eventUpcasters = this.upcasters.get(eventType);
    if (!eventUpcasters) {
      throw new Error(`No upcasters registered for ${eventType}`);
    }

    let current = payload;
    let currentVersion = fromVersion;

    // Apply each upcaster in sequence
    for (const upcaster of eventUpcasters) {
      if (upcaster.fromVersion === currentVersion && currentVersion < toVersion) {
        current = upcaster.upcast(current);
        currentVersion = upcaster.toVersion;
      }
    }

    if (currentVersion !== toVersion) {
      throw new Error(
        `Could not upcast ${eventType} from v${fromVersion} to v${toVersion}. ` +
        `Stopped at v${currentVersion}`
      );
    }

    return current as T;
  }
}

// Usage example
const registry = new UpcasterRegistry();
registry.registerUpcaster('OrderPlaced', orderPlacedV1ToV2);
registry.registerUpcaster('OrderPlaced', orderPlacedV2ToV3);

// Old V1 event from storage
const oldEvent: OrderPlacedV1 = {
  orderId: 'legacy-123',
  amount: 150.00
};

// Upcast to latest version
const modernEvent = registry.upcast<OrderPlacedV3>(
  'OrderPlaced',
  oldEvent,
  1,  // from version
  3   // to version
);

console.log(modernEvent);
// Output:
// {
//   orderId: 'legacy-123',
//   subtotal: 150.00,
//   tax: 0,
//   currency: 'USD',
//   customerId: 'LEGACY_UNKNOWN',
//   customerEmail: 'unknown@legacy.local'
// }
```

### Integrating Upcasting with Event Store

Wrap your event store to automatically upcast events when reading.

```typescript
interface StoredEvent {
  streamId: string;
  position: number;
  eventType: string;
  version: number;
  payload: unknown;
  timestamp: string;
}

class UpcastingEventStore {
  private readonly CURRENT_VERSIONS: Map<string, number> = new Map([
    ['OrderPlaced', 3],
    ['OrderShipped', 2],
    ['OrderCancelled', 1]
  ]);

  constructor(
    private innerStore: EventStore,
    private upcasterRegistry: UpcasterRegistry
  ) {}

  async readStream<T>(
    streamId: string,
    eventType: string
  ): Promise<T[]> {
    const events = await this.innerStore.readStream(streamId);
    const targetVersion = this.CURRENT_VERSIONS.get(eventType);

    if (!targetVersion) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    return events
      .filter(e => e.eventType === eventType)
      .map(event => {
        if (event.version === targetVersion) {
          return event.payload as T;
        }
        return this.upcasterRegistry.upcast<T>(
          event.eventType,
          event.payload,
          event.version,
          targetVersion
        );
      });
  }
}

// Simple event store interface for reference
interface EventStore {
  readStream(streamId: string): Promise<StoredEvent[]>;
  appendToStream(streamId: string, events: StoredEvent[]): Promise<void>;
}
```

## Strategy 3: Weak Schema Approach

The weak schema approach makes consumers tolerant of schema changes by using flexible parsing and sensible defaults.

### Defensive Deserialization

Parse events in a way that handles missing fields, extra fields, and type mismatches gracefully.

```typescript
// Define a loose input type for parsing
interface OrderPlacedInput {
  orderId?: string;
  order_id?: string;  // Handle snake_case variants
  amount?: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  customerId?: string;
  customer_id?: string;
}

// Target canonical format
interface OrderPlacedCanonical {
  orderId: string;
  subtotal: number;
  tax: number;
  currency: string;
  customerId: string | null;
}

function parseOrderPlaced(raw: unknown): OrderPlacedCanonical {
  // Handle null or undefined input
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid event payload: expected object');
  }

  const input = raw as OrderPlacedInput;

  // Extract orderId, checking multiple field names
  const orderId = input.orderId || input.order_id;
  if (!orderId) {
    throw new Error('Missing required field: orderId');
  }

  // Handle amount vs subtotal/tax split
  let subtotal: number;
  let tax: number;

  if (typeof input.subtotal === 'number') {
    subtotal = input.subtotal;
    tax = typeof input.tax === 'number' ? input.tax : 0;
  } else if (typeof input.amount === 'number') {
    // Legacy format with single amount
    subtotal = input.amount;
    tax = 0;
  } else {
    throw new Error('Missing required field: subtotal or amount');
  }

  // Default currency if not specified
  const currency = input.currency || 'USD';

  // Optional customer ID
  const customerId = input.customerId || input.customer_id || null;

  return {
    orderId,
    subtotal,
    tax,
    currency,
    customerId
  };
}
```

### Schema Validation with Defaults

Use a validation library to define schemas with default values and transformations.

```typescript
import { z } from 'zod';

// Zod schema with transformations and defaults
const OrderPlacedSchema = z.object({
  orderId: z.string().or(z.object({ order_id: z.string() }).transform(o => o.order_id)),

  // Handle both old and new amount formats
  amount: z.number().optional(),
  subtotal: z.number().optional(),
  tax: z.number().default(0),

  currency: z.string().default('USD'),

  customerId: z.string().nullable().default(null),

  // Ignore unknown fields
}).passthrough().transform(data => {
  // Normalize the amount fields
  const subtotal = data.subtotal ?? data.amount ?? 0;

  return {
    orderId: data.orderId,
    subtotal,
    tax: data.tax,
    currency: data.currency,
    customerId: data.customerId
  };
});

// Type inferred from schema
type OrderPlaced = z.infer<typeof OrderPlacedSchema>;

// Usage
function processOrderEvent(rawPayload: unknown): OrderPlaced {
  const result = OrderPlacedSchema.safeParse(rawPayload);

  if (!result.success) {
    console.error('Validation errors:', result.error.issues);
    throw new Error('Failed to parse OrderPlaced event');
  }

  return result.data;
}

// Test with various formats
const v1Event = { orderId: '123', amount: 99.99 };
const v2Event = { orderId: '456', subtotal: 89.99, tax: 10.00, currency: 'EUR' };
const v3Event = { orderId: '789', subtotal: 50.00, tax: 5.00, currency: 'GBP', customerId: 'cust-123' };

console.log(processOrderEvent(v1Event));
// { orderId: '123', subtotal: 99.99, tax: 0, currency: 'USD', customerId: null }

console.log(processOrderEvent(v2Event));
// { orderId: '456', subtotal: 89.99, tax: 10.00, currency: 'EUR', customerId: null }

console.log(processOrderEvent(v3Event));
// { orderId: '789', subtotal: 50.00, tax: 5.00, currency: 'GBP', customerId: 'cust-123' }
```

## Strategy 4: Running Multiple Versions

Sometimes you need to support multiple event versions in production simultaneously. This happens during gradual rollouts or when different consumers need different versions.

### Version Router

Route events to version-specific handlers or transform them based on consumer capabilities.

```typescript
interface ConsumerConfig {
  consumerId: string;
  supportedVersions: Map<string, number[]>;
}

class VersionRouter {
  private consumers: Map<string, ConsumerConfig> = new Map();

  registerConsumer(config: ConsumerConfig): void {
    this.consumers.set(config.consumerId, config);
  }

  // Determine which version to send to a specific consumer
  getTargetVersion(consumerId: string, eventType: string, availableVersion: number): number {
    const config = this.consumers.get(consumerId);
    if (!config) {
      throw new Error(`Unknown consumer: ${consumerId}`);
    }

    const supported = config.supportedVersions.get(eventType);
    if (!supported || supported.length === 0) {
      throw new Error(`Consumer ${consumerId} does not support ${eventType}`);
    }

    // Find the highest supported version that is <= available version
    const compatible = supported
      .filter(v => v <= availableVersion)
      .sort((a, b) => b - a);

    if (compatible.length === 0) {
      throw new Error(
        `Consumer ${consumerId} requires ${eventType} v${supported[0]} ` +
        `but only v${availableVersion} is available`
      );
    }

    return compatible[0];
  }
}

// Example setup
const router = new VersionRouter();

// Legacy billing service only handles V1 events
router.registerConsumer({
  consumerId: 'billing-service',
  supportedVersions: new Map([
    ['OrderPlaced', [1]],
    ['OrderShipped', [1, 2]]
  ])
});

// Modern analytics service handles latest versions
router.registerConsumer({
  consumerId: 'analytics-service',
  supportedVersions: new Map([
    ['OrderPlaced', [1, 2, 3]],
    ['OrderShipped', [1, 2, 3]]
  ])
});
```

### Downcast Transformers

When consumers need older versions, you may need to downcast events. This loses information but maintains compatibility.

```typescript
interface Downcaster<TFrom, TTo> {
  fromVersion: number;
  toVersion: number;
  downcast(payload: TFrom): TTo;
}

const orderPlacedV3ToV2: Downcaster<OrderPlacedV3, OrderPlacedV2> = {
  fromVersion: 3,
  toVersion: 2,
  downcast(v3: OrderPlacedV3): OrderPlacedV2 {
    // Drop customer information
    return {
      orderId: v3.orderId,
      subtotal: v3.subtotal,
      tax: v3.tax,
      currency: v3.currency
    };
  }
};

const orderPlacedV2ToV1: Downcaster<OrderPlacedV2, OrderPlacedV1> = {
  fromVersion: 2,
  toVersion: 1,
  downcast(v2: OrderPlacedV2): OrderPlacedV1 {
    // Combine subtotal and tax back into single amount
    // Currency information is lost
    return {
      orderId: v2.orderId,
      amount: v2.subtotal + v2.tax
    };
  }
};

class BidirectionalConverter {
  private upcasters: Map<string, Upcaster<unknown, unknown>[]> = new Map();
  private downcasters: Map<string, Downcaster<unknown, unknown>[]> = new Map();

  registerUpcaster(eventType: string, upcaster: Upcaster<unknown, unknown>): void {
    const existing = this.upcasters.get(eventType) || [];
    existing.push(upcaster);
    existing.sort((a, b) => a.fromVersion - b.fromVersion);
    this.upcasters.set(eventType, existing);
  }

  registerDowncaster(eventType: string, downcaster: Downcaster<unknown, unknown>): void {
    const existing = this.downcasters.get(eventType) || [];
    existing.push(downcaster);
    existing.sort((a, b) => b.fromVersion - a.fromVersion);  // Descending order
    this.downcasters.set(eventType, existing);
  }

  convert<T>(
    eventType: string,
    payload: unknown,
    fromVersion: number,
    toVersion: number
  ): T {
    if (fromVersion === toVersion) {
      return payload as T;
    }

    if (fromVersion < toVersion) {
      return this.upcast(eventType, payload, fromVersion, toVersion);
    }

    return this.downcast(eventType, payload, fromVersion, toVersion);
  }

  private upcast<T>(
    eventType: string,
    payload: unknown,
    fromVersion: number,
    toVersion: number
  ): T {
    const upcasters = this.upcasters.get(eventType) || [];
    let current = payload;
    let currentVersion = fromVersion;

    for (const upcaster of upcasters) {
      if (upcaster.fromVersion === currentVersion && currentVersion < toVersion) {
        current = upcaster.upcast(current);
        currentVersion = upcaster.toVersion;
      }
    }

    return current as T;
  }

  private downcast<T>(
    eventType: string,
    payload: unknown,
    fromVersion: number,
    toVersion: number
  ): T {
    const downcasters = this.downcasters.get(eventType) || [];
    let current = payload;
    let currentVersion = fromVersion;

    for (const downcaster of downcasters) {
      if (downcaster.fromVersion === currentVersion && currentVersion > toVersion) {
        current = downcaster.downcast(current);
        currentVersion = downcaster.toVersion;
      }
    }

    return current as T;
  }
}
```

## Strategy 5: Schema Registry Integration

A schema registry provides centralized schema management, compatibility checking, and versioning for your entire organization.

### Confluent Schema Registry Integration

This example shows integration with Confluent Schema Registry using Avro schemas.

```typescript
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';

// Initialize the registry client
const registry = new SchemaRegistry({
  host: 'http://schema-registry:8081',
  auth: {
    username: process.env.SCHEMA_REGISTRY_USER,
    password: process.env.SCHEMA_REGISTRY_PASSWORD
  }
});

// Define Avro schema for OrderPlaced V3
const orderPlacedV3Schema = {
  type: 'record',
  name: 'OrderPlaced',
  namespace: 'com.example.orders',
  fields: [
    { name: 'orderId', type: 'string' },
    { name: 'subtotal', type: 'double' },
    { name: 'tax', type: 'double', default: 0 },
    { name: 'currency', type: 'string', default: 'USD' },
    {
      name: 'customerId',
      type: ['null', 'string'],
      default: null
    }
  ]
};

async function registerSchema(): Promise<number> {
  const { id } = await registry.register({
    type: SchemaType.AVRO,
    schema: JSON.stringify(orderPlacedV3Schema)
  }, {
    subject: 'OrderPlaced-value'
  });

  console.log(`Registered schema with ID: ${id}`);
  return id;
}

// Encode event using schema registry
async function encodeEvent(schemaId: number, event: OrderPlacedV3): Promise<Buffer> {
  return registry.encode(schemaId, event);
}

// Decode event - registry handles version lookup automatically
async function decodeEvent(buffer: Buffer): Promise<unknown> {
  return registry.decode(buffer);
}
```

### Schema Compatibility Checking

Before registering a new schema version, verify it is compatible with previous versions.

```typescript
type CompatibilityLevel =
  | 'BACKWARD'       // New schema can read old data
  | 'FORWARD'        // Old schema can read new data
  | 'FULL'           // Both directions
  | 'BACKWARD_TRANSITIVE'  // All previous versions
  | 'FORWARD_TRANSITIVE'
  | 'FULL_TRANSITIVE'
  | 'NONE';

interface CompatibilityResult {
  isCompatible: boolean;
  messages?: string[];
}

class SchemaVersionManager {
  constructor(private registry: SchemaRegistry) {}

  async setCompatibilityLevel(
    subject: string,
    level: CompatibilityLevel
  ): Promise<void> {
    await fetch(`${this.registry}/config/${subject}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compatibility: level })
    });
  }

  async checkCompatibility(
    subject: string,
    newSchema: object
  ): Promise<CompatibilityResult> {
    const response = await fetch(
      `${this.registry}/compatibility/subjects/${subject}/versions/latest`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: JSON.stringify(newSchema) })
      }
    );

    const result = await response.json();
    return {
      isCompatible: result.is_compatible,
      messages: result.messages
    };
  }

  async registerIfCompatible(
    subject: string,
    schema: object
  ): Promise<{ success: boolean; schemaId?: number; error?: string }> {
    const compatibility = await this.checkCompatibility(subject, schema);

    if (!compatibility.isCompatible) {
      return {
        success: false,
        error: `Schema is not compatible: ${compatibility.messages?.join(', ')}`
      };
    }

    const { id } = await this.registry.register({
      type: SchemaType.AVRO,
      schema: JSON.stringify(schema)
    }, { subject });

    return { success: true, schemaId: id };
  }
}
```

### Schema Evolution Rules

Follow these rules to maintain compatibility.

| Change Type | BACKWARD Compatible | FORWARD Compatible |
|------------|---------------------|-------------------|
| Add optional field with default | Yes | Yes |
| Add required field | No | Yes |
| Remove optional field | Yes | No |
| Remove required field | No | No |
| Rename field | No | No |
| Change field type | Depends on types | Depends on types |

### Producer with Schema Registry

```typescript
import { Kafka, Producer } from 'kafkajs';

class OrderEventProducer {
  private producer: Producer;
  private schemaId: number | null = null;

  constructor(
    private kafka: Kafka,
    private registry: SchemaRegistry,
    private subject: string
  ) {
    this.producer = kafka.producer();
  }

  async initialize(): Promise<void> {
    await this.producer.connect();

    // Get the latest schema ID for this subject
    const { id } = await this.registry.getLatestSchemaId(this.subject);
    this.schemaId = id;
  }

  async publishOrderPlaced(order: OrderPlacedV3): Promise<void> {
    if (!this.schemaId) {
      throw new Error('Producer not initialized');
    }

    // Encode with schema registry (includes schema ID in payload)
    const value = await this.registry.encode(this.schemaId, order);

    await this.producer.send({
      topic: 'orders',
      messages: [{
        key: order.orderId,
        value,
        headers: {
          'event-type': 'OrderPlaced',
          'schema-version': '3'
        }
      }]
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
```

### Consumer with Automatic Schema Resolution

```typescript
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

class OrderEventConsumer {
  private consumer: Consumer;

  constructor(
    private kafka: Kafka,
    private registry: SchemaRegistry,
    private groupId: string
  ) {
    this.consumer = kafka.consumer({ groupId });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'orders', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      }
    });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    if (!message.value) {
      console.warn('Received message with no value');
      return;
    }

    try {
      // Schema registry decodes and handles version automatically
      // The schema ID is embedded in the first 5 bytes of the payload
      const event = await this.registry.decode(message.value);

      const eventType = message.headers?.['event-type']?.toString();

      switch (eventType) {
        case 'OrderPlaced':
          await this.handleOrderPlaced(event as OrderPlacedV3);
          break;
        default:
          console.warn(`Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.error('Failed to process message:', error);
      // Handle deserialization failures
      // Consider dead letter queue for unprocessable messages
    }
  }

  private async handleOrderPlaced(order: OrderPlacedV3): Promise<void> {
    console.log(`Processing order: ${order.orderId}`);
    console.log(`Total: ${order.subtotal + order.tax} ${order.currency}`);

    if (order.customerId) {
      console.log(`Customer: ${order.customerId}`);
    }
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
```

## Versioning Strategy Comparison

| Strategy | Complexity | Best For | Trade-offs |
|----------|------------|----------|------------|
| Version in Metadata | Low | Simple systems, few versions | Manual handler management |
| Upcasting | Medium | Event sourcing, event replay | One-way transformation only |
| Weak Schema | Low | Tolerant consumers | May hide data issues |
| Multiple Versions | High | Gradual migrations | Increased maintenance |
| Schema Registry | High | Large organizations | Infrastructure overhead |

## Best Practices

### 1. Make Additive Changes When Possible

Adding optional fields with defaults is the safest change. It maintains both forward and backward compatibility.

```typescript
// Safe change: adding optional field
interface OrderPlacedV4 extends OrderPlacedV3 {
  promotionCode?: string;  // Optional, no default needed
  loyaltyPointsEarned?: number;  // Optional
}
```

### 2. Never Remove Required Fields

Instead of removing fields, deprecate them and stop populating them with meaningful data.

```typescript
interface OrderPlacedV5 {
  orderId: string;
  subtotal: number;
  tax: number;
  currency: string;
  customerId: string | null;

  // Deprecated: use lineItems instead
  // Will always be empty string in V5+
  /** @deprecated */
  legacyProductId: string;

  // New structure
  lineItems: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}
```

### 3. Use Semantic Versioning for Event Types

```typescript
// Event type naming with major version
const EVENT_TYPES = {
  ORDER_PLACED_V1: 'com.example.orders.OrderPlaced.v1',
  ORDER_PLACED_V2: 'com.example.orders.OrderPlaced.v2',
  ORDER_PLACED_V3: 'com.example.orders.OrderPlaced.v3'
} as const;
```

### 4. Document Breaking Changes

Maintain a changelog for your event schemas.

```markdown
## OrderPlaced Event Changelog

### Version 3 (2024-01-15)
- Added: customerId (nullable string)
- Added: customerEmail (nullable string)
- Migration: Legacy events get null customer fields

### Version 2 (2023-08-01)
- Changed: amount split into subtotal and tax
- Added: currency field
- Migration: V1 amount becomes subtotal, tax defaults to 0, currency defaults to USD

### Version 1 (2023-01-01)
- Initial version
- Fields: orderId, amount
```

### 5. Test Version Compatibility

Write tests that verify old events can be processed by new code.

```typescript
describe('OrderPlaced Version Compatibility', () => {
  const processor = new OrderEventProcessor();

  it('should handle V1 events', async () => {
    const v1Event = {
      metadata: { eventType: 'OrderPlaced', version: 1 },
      payload: { orderId: 'test-1', amount: 100 }
    };

    const result = await processor.process(v1Event);

    expect(result.orderId).toBe('test-1');
    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(0);
    expect(result.currency).toBe('USD');
  });

  it('should handle V2 events', async () => {
    const v2Event = {
      metadata: { eventType: 'OrderPlaced', version: 2 },
      payload: {
        orderId: 'test-2',
        subtotal: 90,
        tax: 10,
        currency: 'EUR'
      }
    };

    const result = await processor.process(v2Event);

    expect(result.orderId).toBe('test-2');
    expect(result.subtotal).toBe(90);
    expect(result.tax).toBe(10);
    expect(result.currency).toBe('EUR');
  });

  it('should handle V3 events', async () => {
    const v3Event = {
      metadata: { eventType: 'OrderPlaced', version: 3 },
      payload: {
        orderId: 'test-3',
        subtotal: 80,
        tax: 8,
        currency: 'GBP',
        customerId: 'cust-123',
        customerEmail: 'test@example.com'
      }
    };

    const result = await processor.process(v3Event);

    expect(result.customerId).toBe('cust-123');
    expect(result.customerEmail).toBe('test@example.com');
  });
});
```

## Conclusion

Event versioning is not optional in production systems. Choose a strategy based on your system's complexity and requirements:

- Start with **version in metadata** for simple systems
- Add **upcasting** when you need event replay
- Use **weak schema** for maximum consumer tolerance
- Deploy **multiple versions** during migrations
- Invest in a **schema registry** for organization-wide governance

The key is planning for change from day one. Every event you publish today will need to be readable by code written months or years from now. Build your versioning strategy early, and you will save yourself significant pain when requirements inevitably evolve.
