# How to Use Dapr with Repository Pattern

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Repository Pattern, Design Pattern, State Management, Architecture

Description: Implement the Repository pattern on top of Dapr state management to abstract data access, support multiple backends, and enable unit testing without a running sidecar.

---

## Repository Pattern with Dapr State

The Repository pattern encapsulates data access logic behind a collection-like interface. Using Dapr state management as the backing store, you get a portable implementation that works with Redis, Cosmos DB, DynamoDB, or any other Dapr state component without changing your repository interface.

## Define the Repository Interface

```typescript
// src/repositories/IOrderRepository.ts
export interface IOrderRepository {
    findById(orderId: string): Promise<Order | null>;
    findByCustomer(customerId: string): Promise<Order[]>;
    save(order: Order): Promise<void>;
    delete(orderId: string): Promise<void>;
    exists(orderId: string): Promise<boolean>;
}
```

## Implement Dapr State Repository

```typescript
// src/repositories/DaprOrderRepository.ts
import { DaprClient } from '@dapr/dapr';
import { IOrderRepository } from './IOrderRepository';
import { Order } from '../models/Order';

export class DaprOrderRepository implements IOrderRepository {
    private readonly dapr: DaprClient;
    private readonly storeName = 'statestore';
    private readonly indexPrefix = 'idx:customer:';

    constructor(dapr: DaprClient) {
        this.dapr = dapr;
    }

    async findById(orderId: string): Promise<Order | null> {
        const state = await this.dapr.state.get(this.storeName, orderId);
        return state ? (state as Order) : null;
    }

    async findByCustomer(customerId: string): Promise<Order[]> {
        // Store customer index as a separate state entry
        const index = await this.dapr.state.get(
            this.storeName,
            `${this.indexPrefix}${customerId}`
        );
        if (!index) return [];

        const orderIds = index as string[];
        const orders = await Promise.all(orderIds.map(id => this.findById(id)));
        return orders.filter((o): o is Order => o !== null);
    }

    async save(order: Order): Promise<void> {
        // Use bulk state save to persist order and index in a single call
        const states = [
            { key: order.id, value: order },
        ];

        // Update customer index
        const existingIndex = (await this.dapr.state.get(
            this.storeName,
            `${this.indexPrefix}${order.customerId}`
        ) as string[]) || [];

        if (!existingIndex.includes(order.id)) {
            existingIndex.push(order.id);
        }
        states.push({
            key: `${this.indexPrefix}${order.customerId}`,
            value: existingIndex,
        });

        await this.dapr.state.save(this.storeName, states);
    }

    async delete(orderId: string): Promise<void> {
        await this.dapr.state.delete(this.storeName, orderId);
    }

    async exists(orderId: string): Promise<boolean> {
        const order = await this.findById(orderId);
        return order !== null;
    }
}
```

## In-Memory Repository for Testing

```typescript
// src/repositories/InMemoryOrderRepository.ts
export class InMemoryOrderRepository implements IOrderRepository {
    private store = new Map<string, Order>();

    async findById(orderId: string): Promise<Order | null> {
        return this.store.get(orderId) ?? null;
    }

    async findByCustomer(customerId: string): Promise<Order[]> {
        return Array.from(this.store.values())
            .filter(o => o.customerId === customerId);
    }

    async save(order: Order): Promise<void> {
        this.store.set(order.id, { ...order });
    }

    async delete(orderId: string): Promise<void> {
        this.store.delete(orderId);
    }

    async exists(orderId: string): Promise<boolean> {
        return this.store.has(orderId);
    }
}
```

## Service Using Repository Interface

```typescript
// src/services/OrderService.ts
export class OrderService {
    constructor(private readonly orders: IOrderRepository) {}

    async createOrder(customerId: string, items: string[]): Promise<Order> {
        const order: Order = {
            id: crypto.randomUUID(),
            customerId,
            items,
            status: 'created',
            createdAt: new Date().toISOString(),
        };
        await this.orders.save(order);
        return order;
    }
}
```

## Unit Test with In-Memory Repository

```typescript
// tests/OrderService.test.ts
import { OrderService } from '../src/services/OrderService';
import { InMemoryOrderRepository } from '../src/repositories/InMemoryOrderRepository';

describe('OrderService', () => {
    it('creates and persists an order', async () => {
        const repo = new InMemoryOrderRepository();
        const service = new OrderService(repo);

        const order = await service.createOrder('cust-1', ['item-a']);

        expect(await repo.exists(order.id)).toBe(true);
        const stored = await repo.findById(order.id);
        expect(stored?.customerId).toBe('cust-1');
    });
});
```

## Summary

The Repository pattern combined with Dapr state management provides a portable, testable data access layer for microservices. Defining an interface and implementing it with both a Dapr backend (for production) and an in-memory backend (for tests) enables full unit test coverage without a running Dapr sidecar and easy backend switching through Dapr's component configuration.
