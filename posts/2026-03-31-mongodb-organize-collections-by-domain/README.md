# How to Organize Collections by Feature or Domain in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Design, Domain, Collection, Architecture

Description: Organize MongoDB collections by domain or feature boundary to improve maintainability, team ownership, and query performance in large applications.

---

## Overview

As MongoDB applications grow, collections proliferate and become difficult to navigate. Organizing collections around domain boundaries - such as `orders`, `inventory`, and `users` - rather than by technical function makes the schema intuitive, supports team ownership, and helps you apply appropriate indexes and retention policies per domain.

## Domain-Driven Collection Grouping

Group collections by the business domain they belong to. Each domain owns its own set of collections.

```text
Database: myapp

-- Users Domain --
users
user_profiles
user_sessions
user_preferences

-- Orders Domain --
orders
order_items
order_payments
order_shipments

-- Inventory Domain --
products
product_variants
inventory_levels
inventory_adjustments

-- Notifications Domain --
notification_templates
notification_queue
notification_delivery_log
```

## Using Database-Per-Domain for Strong Isolation

If teams are large or data access needs differ significantly, use separate databases per domain.

```javascript
const usersDb = client.db("users_domain");
const ordersDb = client.db("orders_domain");
const inventoryDb = client.db("inventory_domain");

// Cross-database $lookup is supported in MongoDB 5.1+ using from: { db, coll }
// For broader compatibility or complex joins, fetch in application code
async function getOrderWithUser(orderId) {
  const order = await ordersDb.collection("orders").findOne({ _id: orderId });
  const user = await usersDb.collection("users").findOne({ _id: order.userId });
  return { ...order, user };
}
```

## Namespace Constants

Define collection names as constants to avoid typos and enable IDE autocomplete.

```javascript
// collections.js
const COLLECTIONS = {
  // Users domain
  USERS: "users",
  USER_PROFILES: "user_profiles",
  USER_SESSIONS: "user_sessions",

  // Orders domain
  ORDERS: "orders",
  ORDER_ITEMS: "order_items",
  ORDER_PAYMENTS: "order_payments",

  // Inventory domain
  PRODUCTS: "products",
  INVENTORY: "inventory_levels",
};

module.exports = COLLECTIONS;

// Usage
const COLLECTIONS = require("./collections");
const orders = await db.collection(COLLECTIONS.ORDERS).find({}).toArray();
```

## Domain Repository Pattern

Encapsulate collection access in domain-specific repositories.

```javascript
class OrderRepository {
  constructor(client, db) {
    this.client = client;
    this.orders = db.collection("orders");
    this.items = db.collection("order_items");
  }

  async findByCustomer(customerId) {
    return this.orders
      .find({ customerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
  }

  async createWithItems(orderData, items) {
    const session = this.client.startSession();
    return session.withTransaction(async () => {
      const { insertedId } = await this.orders.insertOne(
        { ...orderData, createdAt: new Date() },
        { session }
      );
      await this.items.insertMany(
        items.map((i) => ({ ...i, orderId: insertedId })),
        { session }
      );
      return insertedId;
    });
  }
}
```

## Applying Domain-Specific Indexes

Create indexes tailored to each domain's access patterns.

```javascript
// Users domain indexes
await db.collection("users").createIndex({ email: 1 }, { unique: true });
await db.collection("user_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Orders domain indexes
await db.collection("orders").createIndex({ customerId: 1, createdAt: -1 });
await db.collection("order_items").createIndex({ orderId: 1 });

// Inventory domain indexes
await db.collection("products").createIndex({ category: 1, price: 1 });
await db.collection("inventory_levels").createIndex({ productId: 1 }, { unique: true });
```

## Summary

Organizing MongoDB collections by domain or feature boundary makes the schema readable, assigns clear ownership to teams, and ensures that indexes, TTL policies, and access controls are applied at the right granularity. Use namespace constants and repository classes to enforce domain boundaries in application code and prevent collections from leaking across domains.
