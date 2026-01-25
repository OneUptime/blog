# How to Implement GraphQL API Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: GraphQL, API Testing, Testing, Apollo, DevOps

Description: Learn comprehensive GraphQL API testing strategies including query validation, mutation testing, subscription testing, schema coverage, and performance testing.

---

GraphQL APIs require different testing approaches than REST APIs. Clients can request any combination of fields, nested relationships create N+1 query risks, and subscriptions add real-time complexity. This guide covers testing strategies specific to GraphQL APIs.

## GraphQL Testing Challenges

| Challenge | Impact |
|-----------|--------|
| **Flexible queries** | Infinite query combinations possible |
| **Nested resolvers** | N+1 database queries |
| **Type safety** | Schema changes break clients |
| **Subscriptions** | Real-time testing complexity |

## Test Setup with Apollo Server

Set up a test environment for Apollo Server:

```typescript
// test-server.ts
import { ApolloServer } from '@apollo/server';
import { typeDefs, resolvers } from '../schema';
import { createTestContext } from './test-context';

export async function createTestServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });

    await server.start();

    return {
        server,
        async executeOperation(options: {
            query: string;
            variables?: Record<string, any>;
            contextValue?: any;
        }) {
            return server.executeOperation(
                {
                    query: options.query,
                    variables: options.variables,
                },
                {
                    contextValue: options.contextValue || createTestContext(),
                }
            );
        },
        async stop() {
            await server.stop();
        },
    };
}

// test-context.ts
export function createTestContext(overrides = {}) {
    return {
        user: null,
        dataSources: {
            userAPI: new MockUserAPI(),
            productAPI: new MockProductAPI(),
        },
        ...overrides,
    };
}
```

## Query Testing

Test GraphQL queries for correctness and performance:

```typescript
// queries.test.ts
import { createTestServer } from './test-server';

describe('GraphQL Queries', () => {
    let testServer: Awaited<ReturnType<typeof createTestServer>>;

    beforeAll(async () => {
        testServer = await createTestServer();
    });

    afterAll(async () => {
        await testServer.stop();
    });

    describe('User Query', () => {
        test('returns user by ID', async () => {
            const query = `
                query GetUser($id: ID!) {
                    user(id: $id) {
                        id
                        email
                        name
                        createdAt
                    }
                }
            `;

            const response = await testServer.executeOperation({
                query,
                variables: { id: 'user-123' },
            });

            expect(response.body.kind).toBe('single');
            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                expect(response.body.singleResult.data?.user).toEqual({
                    id: 'user-123',
                    email: 'test@example.com',
                    name: 'Test User',
                    createdAt: expect.any(String),
                });
            }
        });

        test('returns null for non-existent user', async () => {
            const query = `
                query GetUser($id: ID!) {
                    user(id: $id) {
                        id
                        email
                    }
                }
            `;

            const response = await testServer.executeOperation({
                query,
                variables: { id: 'non-existent' },
            });

            if (response.body.kind === 'single') {
                expect(response.body.singleResult.data?.user).toBeNull();
            }
        });

        test('handles nested relationships', async () => {
            const query = `
                query GetUserWithOrders($id: ID!) {
                    user(id: $id) {
                        id
                        orders {
                            id
                            total
                            items {
                                productId
                                quantity
                            }
                        }
                    }
                }
            `;

            const response = await testServer.executeOperation({
                query,
                variables: { id: 'user-123' },
            });

            if (response.body.kind === 'single') {
                const user = response.body.singleResult.data?.user;
                expect(user.orders).toBeInstanceOf(Array);
                expect(user.orders[0]).toHaveProperty('items');
            }
        });
    });

    describe('Products Query', () => {
        test('supports pagination', async () => {
            const query = `
                query GetProducts($first: Int!, $after: String) {
                    products(first: $first, after: $after) {
                        edges {
                            node {
                                id
                                name
                                price
                            }
                            cursor
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `;

            const response = await testServer.executeOperation({
                query,
                variables: { first: 10 },
            });

            if (response.body.kind === 'single') {
                const products = response.body.singleResult.data?.products;
                expect(products.edges).toHaveLength(10);
                expect(products.pageInfo.hasNextPage).toBe(true);
                expect(products.pageInfo.endCursor).toBeDefined();
            }
        });

        test('supports filtering', async () => {
            const query = `
                query GetProducts($filter: ProductFilter!) {
                    products(filter: $filter) {
                        edges {
                            node {
                                id
                                category
                            }
                        }
                    }
                }
            `;

            const response = await testServer.executeOperation({
                query,
                variables: {
                    filter: { category: 'electronics', minPrice: 100 },
                },
            });

            if (response.body.kind === 'single') {
                const products = response.body.singleResult.data?.products;
                products.edges.forEach((edge: any) => {
                    expect(edge.node.category).toBe('electronics');
                });
            }
        });
    });
});
```

## Mutation Testing

Test mutations including validation and side effects:

```typescript
// mutations.test.ts
import { createTestServer, createTestContext } from './test-server';

describe('GraphQL Mutations', () => {
    let testServer: Awaited<ReturnType<typeof createTestServer>>;

    beforeAll(async () => {
        testServer = await createTestServer();
    });

    afterAll(async () => {
        await testServer.stop();
    });

    describe('CreateOrder Mutation', () => {
        test('creates order successfully', async () => {
            const mutation = `
                mutation CreateOrder($input: CreateOrderInput!) {
                    createOrder(input: $input) {
                        order {
                            id
                            userId
                            total
                            status
                            items {
                                productId
                                quantity
                                price
                            }
                        }
                        errors {
                            field
                            message
                        }
                    }
                }
            `;

            const input = {
                items: [
                    { productId: 'prod-1', quantity: 2 },
                    { productId: 'prod-2', quantity: 1 },
                ],
                shippingAddress: {
                    street: '123 Test St',
                    city: 'Test City',
                    country: 'US',
                },
            };

            const response = await testServer.executeOperation({
                query: mutation,
                variables: { input },
                contextValue: createTestContext({
                    user: { id: 'user-123', role: 'customer' },
                }),
            });

            if (response.body.kind === 'single') {
                const result = response.body.singleResult.data?.createOrder;
                expect(result.errors).toBeNull();
                expect(result.order.id).toBeDefined();
                expect(result.order.status).toBe('PENDING');
            }
        });

        test('returns validation errors for invalid input', async () => {
            const mutation = `
                mutation CreateOrder($input: CreateOrderInput!) {
                    createOrder(input: $input) {
                        order {
                            id
                        }
                        errors {
                            field
                            message
                        }
                    }
                }
            `;

            const input = {
                items: [], // Empty items should fail
                shippingAddress: null,
            };

            const response = await testServer.executeOperation({
                query: mutation,
                variables: { input },
                contextValue: createTestContext({
                    user: { id: 'user-123', role: 'customer' },
                }),
            });

            if (response.body.kind === 'single') {
                const result = response.body.singleResult.data?.createOrder;
                expect(result.order).toBeNull();
                expect(result.errors).toContainEqual(
                    expect.objectContaining({ field: 'items' })
                );
            }
        });

        test('requires authentication', async () => {
            const mutation = `
                mutation CreateOrder($input: CreateOrderInput!) {
                    createOrder(input: $input) {
                        order { id }
                    }
                }
            `;

            const response = await testServer.executeOperation({
                query: mutation,
                variables: {
                    input: { items: [{ productId: 'prod-1', quantity: 1 }] },
                },
                contextValue: createTestContext({ user: null }),
            });

            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeDefined();
                expect(response.body.singleResult.errors?.[0].message)
                    .toContain('Authentication required');
            }
        });
    });

    describe('UpdateProduct Mutation', () => {
        test('admin can update product', async () => {
            const mutation = `
                mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
                    updateProduct(id: $id, input: $input) {
                        product {
                            id
                            name
                            price
                        }
                    }
                }
            `;

            const response = await testServer.executeOperation({
                query: mutation,
                variables: {
                    id: 'prod-1',
                    input: { price: 99.99 },
                },
                contextValue: createTestContext({
                    user: { id: 'admin-1', role: 'admin' },
                }),
            });

            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors).toBeUndefined();
                expect(response.body.singleResult.data?.updateProduct.product.price)
                    .toBe(99.99);
            }
        });

        test('non-admin cannot update product', async () => {
            const mutation = `
                mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
                    updateProduct(id: $id, input: $input) {
                        product { id }
                    }
                }
            `;

            const response = await testServer.executeOperation({
                query: mutation,
                variables: {
                    id: 'prod-1',
                    input: { price: 99.99 },
                },
                contextValue: createTestContext({
                    user: { id: 'user-123', role: 'customer' },
                }),
            });

            if (response.body.kind === 'single') {
                expect(response.body.singleResult.errors?.[0].message)
                    .toContain('Unauthorized');
            }
        });
    });
});
```

## Subscription Testing

Test GraphQL subscriptions for real-time updates:

```typescript
// subscriptions.test.ts
import { createServer } from 'http';
import { WebSocket } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs, resolvers } from '../schema';
import { createClient } from 'graphql-ws';

describe('GraphQL Subscriptions', () => {
    let httpServer: any;
    let wsServer: any;
    let client: any;

    beforeAll(async () => {
        const schema = makeExecutableSchema({ typeDefs, resolvers });

        httpServer = createServer();
        wsServer = new WebSocket.Server({
            server: httpServer,
            path: '/graphql',
        });

        useServer({ schema }, wsServer);

        await new Promise<void>((resolve) => {
            httpServer.listen(4000, resolve);
        });

        client = createClient({
            url: 'ws://localhost:4000/graphql',
            webSocketImpl: WebSocket,
        });
    });

    afterAll(async () => {
        client.dispose();
        wsServer.close();
        httpServer.close();
    });

    test('receives order status updates', async () => {
        const orderId = 'order-123';
        const receivedUpdates: any[] = [];

        const subscription = `
            subscription OnOrderStatusChange($orderId: ID!) {
                orderStatusChanged(orderId: $orderId) {
                    orderId
                    status
                    timestamp
                }
            }
        `;

        // Subscribe
        const unsubscribe = client.subscribe(
            {
                query: subscription,
                variables: { orderId },
            },
            {
                next: (data: any) => {
                    receivedUpdates.push(data.data.orderStatusChanged);
                },
                error: (err: any) => {
                    console.error(err);
                },
                complete: () => {},
            }
        );

        // Trigger status changes via mutation
        await triggerOrderStatusChange(orderId, 'PROCESSING');
        await triggerOrderStatusChange(orderId, 'SHIPPED');

        // Wait for updates
        await new Promise(r => setTimeout(r, 500));

        expect(receivedUpdates).toHaveLength(2);
        expect(receivedUpdates[0].status).toBe('PROCESSING');
        expect(receivedUpdates[1].status).toBe('SHIPPED');

        unsubscribe();
    });

    test('filters subscription by user', async () => {
        const userId = 'user-456';
        const receivedNotifications: any[] = [];

        const subscription = `
            subscription OnNotification($userId: ID!) {
                notification(userId: $userId) {
                    id
                    message
                    type
                }
            }
        `;

        const unsubscribe = client.subscribe(
            {
                query: subscription,
                variables: { userId },
            },
            {
                next: (data: any) => {
                    receivedNotifications.push(data.data.notification);
                },
            }
        );

        // Send notifications to different users
        await sendNotification('user-456', 'Your order shipped');
        await sendNotification('user-789', 'Different user notification');
        await sendNotification('user-456', 'Second notification');

        await new Promise(r => setTimeout(r, 500));

        // Should only receive notifications for user-456
        expect(receivedNotifications).toHaveLength(2);
        receivedNotifications.forEach(n => {
            expect(n.message).not.toContain('Different user');
        });

        unsubscribe();
    });
});
```

## Schema Testing

Test schema integrity and breaking changes:

```typescript
// schema.test.ts
import { buildSchema, validateSchema, printSchema } from 'graphql';
import { typeDefs } from '../schema';
import {
    findBreakingChanges,
    findDangerousChanges,
} from 'graphql/utilities';

describe('GraphQL Schema', () => {
    let schema: any;

    beforeAll(() => {
        schema = buildSchema(typeDefs);
    });

    test('schema is valid', () => {
        const errors = validateSchema(schema);
        expect(errors).toHaveLength(0);
    });

    test('required types exist', () => {
        const typeMap = schema.getTypeMap();

        // Check essential types
        expect(typeMap.User).toBeDefined();
        expect(typeMap.Product).toBeDefined();
        expect(typeMap.Order).toBeDefined();

        // Check enums
        expect(typeMap.OrderStatus).toBeDefined();
    });

    test('no breaking changes from previous version', () => {
        // Load previous schema version
        const previousSchema = buildSchema(loadPreviousSchema());

        const breakingChanges = findBreakingChanges(previousSchema, schema);

        expect(breakingChanges).toHaveLength(0);
    });

    test('dangerous changes are documented', () => {
        const previousSchema = buildSchema(loadPreviousSchema());

        const dangerousChanges = findDangerousChanges(previousSchema, schema);

        // Log dangerous changes for review
        if (dangerousChanges.length > 0) {
            console.warn('Dangerous schema changes detected:');
            dangerousChanges.forEach(change => {
                console.warn(`- ${change.description}`);
            });
        }
    });

    test('all queries have descriptions', () => {
        const queryType = schema.getQueryType();
        const fields = queryType.getFields();

        Object.entries(fields).forEach(([name, field]: [string, any]) => {
            expect(field.description).toBeDefined();
            expect(field.description.length).toBeGreaterThan(10);
        });
    });
});

function loadPreviousSchema(): string {
    // Load from git or schema registry
    return `
        type Query {
            user(id: ID!): User
            products(first: Int, after: String): ProductConnection!
        }
        # ... rest of previous schema
    `;
}
```

## N+1 Query Detection

Test for N+1 query problems:

```typescript
// n-plus-one.test.ts
import { createTestServer, createTestContext } from './test-server';

describe('N+1 Query Detection', () => {
    let testServer: any;
    let queryCount: number;

    beforeAll(async () => {
        testServer = await createTestServer();
    });

    beforeEach(() => {
        queryCount = 0;
        // Hook into database to count queries
        mockDatabase.onQuery(() => queryCount++);
    });

    test('batch loads users for order list', async () => {
        const query = `
            query GetOrders {
                orders(first: 10) {
                    edges {
                        node {
                            id
                            user {
                                id
                                name
                            }
                        }
                    }
                }
            }
        `;

        await testServer.executeOperation({ query });

        // With DataLoader, should be 2 queries:
        // 1 for orders, 1 for all users (batched)
        // Without DataLoader would be 11 queries (1 + 10)
        expect(queryCount).toBeLessThanOrEqual(2);
    });

    test('deeply nested query is efficient', async () => {
        const query = `
            query GetUserDetails($id: ID!) {
                user(id: $id) {
                    orders {
                        items {
                            product {
                                category {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        await testServer.executeOperation({
            query,
            variables: { id: 'user-123' },
        });

        // Should use batch loading at each level
        expect(queryCount).toBeLessThanOrEqual(5);
    });
});
```

## CI Pipeline Integration

```yaml
# .github/workflows/graphql-tests.yaml
name: GraphQL Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate schema
        run: npm run graphql:validate

      - name: Check for breaking changes
        run: npm run graphql:check-changes

      - name: Run GraphQL tests
        run: npm test -- --testPathPattern=graphql

      - name: Generate schema coverage
        run: npm run graphql:coverage
```

## Summary

| Test Type | Purpose | Priority |
|-----------|---------|----------|
| **Query tests** | Correct data retrieval | High |
| **Mutation tests** | Data modification | High |
| **Subscription tests** | Real-time updates | Medium |
| **Schema tests** | API stability | High |
| **N+1 detection** | Performance | High |

GraphQL testing requires validating both the API contract and the implementation performance. Focus on query efficiency and schema stability to build reliable GraphQL APIs.
