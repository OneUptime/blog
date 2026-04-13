# How to Model a Multi-Tenant Application Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Multi-Tenant, SaaS, Schema Design

Description: Learn how to design a multi-tenant MongoDB schema using database-per-tenant, collection-per-tenant, and shared-collection approaches with security and performance guidance.

---

## Multi-Tenancy Models Overview

A multi-tenant application serves multiple customers (tenants) from a single deployment. MongoDB supports three main tenancy models:

```text
Model                    | Isolation | Complexity | Scale
-------------------------|-----------|------------|-------
Database per tenant      | High      | High       | Limited (< 500 tenants)
Collection per tenant    | Medium    | Medium     | Moderate (< 10,000)
Shared collection        | Low       | Low        | Unlimited
Hybrid                   | Variable  | Medium     | High
```

## Model 1: Database Per Tenant

Each tenant gets their own MongoDB database:

```javascript
// Tenant A
use tenantA_db
db.orders.find({})

// Tenant B
use tenantB_db
db.orders.find({})
```

Connection management:

```javascript
const mongoose = require("mongoose");

const connections = {};

async function getConnection(tenantId) {
  if (!connections[tenantId]) {
    connections[tenantId] = await mongoose.createConnection(
      `mongodb://localhost:27017/${tenantId}_db`
    );
  }
  return connections[tenantId];
}

// Usage
const conn = await getConnection("tenantA");
const Order = conn.model("Order", orderSchema);
const orders = await Order.find({});
```

**Pros**: Full data isolation, per-tenant backup/restore, different schemas possible.
**Cons**: Many databases strain MongoDB connection limits and admin overhead.

## Model 2: Collection Per Tenant

All tenants share one database but have separate collections:

```javascript
// tenantA_orders, tenantB_orders
function getOrderCollection(tenantId) {
  return db.getCollection(`${tenantId}_orders`);
}

// Query tenant-specific collection
getOrderCollection("tenantA").find({ status: "pending" })
```

**Pros**: One database to manage, some isolation, easy per-tenant queries.
**Cons**: Collection count grows with tenants; difficult to query across tenants.

## Model 3: Shared Collections with tenantId Field

All tenants share the same collections, distinguished by a `tenantId` field:

```javascript
// Shared orders collection
{
  _id: ObjectId("6607a1b2c3d4e5f6a7b8c901"),
  tenantId: "tenant_a",
  customerId: "cust123",
  total: 199.99,
  status: "pending",
  createdAt: ISODate("2026-03-31T00:00:00Z")
}

{
  _id: ObjectId("6607a1b2c3d4e5f6a7b8c902"),
  tenantId: "tenant_b",
  customerId: "cust456",
  total: 89.99,
  status: "completed",
  createdAt: ISODate("2026-03-31T00:00:00Z")
}
```

Every query must include `tenantId`:

```javascript
// Always filter by tenantId
db.orders.find({ tenantId: "tenant_a", status: "pending" })
```

Compound index with `tenantId` as the leading field:

```javascript
db.orders.createIndex({ tenantId: 1, status: 1, createdAt: -1 })
db.orders.createIndex({ tenantId: 1, customerId: 1 })
```

## Tenant Registry

Always maintain a tenants collection for tenant metadata:

```javascript
// tenants collection
{
  _id: ObjectId("6607a1b2c3d4e5f6a7b8c001"),
  tenantId: "tenant_a",
  name: "Acme Corporation",
  plan: "enterprise",
  status: "active",
  quotas: {
    maxUsers: 1000,
    maxStorageGB: 100,
    apiRateLimit: 10000
  },
  settings: {
    timezone: "America/Los_Angeles",
    currency: "USD",
    customDomain: "acme.example.com"
  },
  createdAt: ISODate("2026-01-01T00:00:00Z"),
  billingEmail: "billing@acme.com"
}
```

## Application-Level Tenant Isolation

For shared collections, enforce `tenantId` in all queries at the middleware layer:

```javascript
// Express middleware - injects tenantId into all queries
function tenantMiddleware(req, res, next) {
  const tenantId = req.headers["x-tenant-id"] || req.user?.tenantId;
  if (!tenantId) return res.status(401).json({ error: "Tenant not identified" });

  req.db = {
    orders: {
      find: (query) => db.orders.find({ ...query, tenantId }),
      findOne: (query) => db.orders.findOne({ ...query, tenantId }),
      insertOne: (doc) => db.orders.insertOne({ ...doc, tenantId }),
      updateOne: (filter, update) => db.orders.updateOne({ ...filter, tenantId }, update),
      deleteOne: (filter) => db.orders.deleteOne({ ...filter, tenantId })
    }
  };
  next();
}
```

## Row-Level Security with MongoDB Views

Create per-tenant views for an extra isolation layer:

```javascript
// Create a view that automatically filters by tenantId
db.createView("tenantAOrders", "orders", [
  { $match: { tenantId: "tenant_a" } }
]);

// Application code for tenant A can query the view without specifying tenantId
db.tenantAOrders.find({ status: "pending" })
```

## Hybrid Approach: Large Tenants Get Own Database

Route large tenants to dedicated databases while small tenants share:

```javascript
async function getCollection(tenantId, collectionName) {
  const tenant = await db.tenants.findOne({ tenantId });

  if (tenant.plan === "enterprise" || tenant.settings.dedicatedDb) {
    // Enterprise tenants get their own database
    const conn = await getConnection(`${tenantId}_db`);
    return conn.collection(collectionName);
  }

  // Standard tenants use shared collection
  return db.collection(collectionName);
}
```

## Summary

Choose your MongoDB multi-tenancy model based on your tenant count, isolation requirements, and operational capacity. Use database-per-tenant for small numbers of high-value enterprise customers needing maximum isolation. Use shared collections with a `tenantId` field for SaaS applications with many tenants - always index `(tenantId, ...)` and enforce tenant isolation at the application middleware layer to prevent data leakage. A hybrid approach routes large tenants to dedicated databases while standard tenants share collections.
