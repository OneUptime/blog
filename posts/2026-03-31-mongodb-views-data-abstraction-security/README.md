# How to Use Views for Data Abstraction and Security in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, View, Security, Role-Based Access Control, Database Design

Description: Learn how MongoDB views provide data abstraction by hiding implementation details and security by exposing only permitted fields to specific database roles.

---

MongoDB views let you present a curated subset of your data as if it were a collection. This is valuable for two distinct purposes: simplifying application queries (abstraction) and restricting what different user roles can see (security).

## Data Abstraction with Views

Suppose your `orders` collection has a complex schema. You can create a view that presents a simplified, stable interface:

```javascript
db.createView("order_summary", "orders", [
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product"
    }
  },
  { $unwind: "$product" },
  {
    $project: {
      orderId: "$_id",
      customerEmail: 1,
      productName: "$product.name",
      quantity: 1,
      total: { $multiply: ["$quantity", "$product.price"] },
      status: 1,
      _id: 0
    }
  }
])
```

Application code queries `order_summary` instead of writing joins every time:

```javascript
db.order_summary.find({ status: "pending" })
```

## Security - Field-Level Restriction

Create a view that excludes sensitive fields and grant read access on the view instead of the raw collection:

```javascript
// View: excludes password hash, SSN, and payment tokens
db.createView("users_safe", "users", [
  {
    $project: {
      passwordHash: 0,
      ssn: 0,
      paymentToken: 0
    }
  }
])
```

Grant access to the role:

```javascript
db.createRole({
  role: "supportAgent",
  privileges: [
    {
      resource: { db: "myapp", collection: "users_safe" },
      actions: ["find"]
    }
  ],
  roles: []
})

db.createUser({
  user: "support1",
  pwd: "secret",
  roles: [{ role: "supportAgent", db: "myapp" }]
})
```

Now `support1` can read `users_safe` but has no access to the raw `users` collection.

## Row-Level Security with $match

Restrict which documents are visible, not just which fields:

```javascript
// View for EMEA region data only
db.createView("orders_emea", "orders", [
  { $match: { region: "EMEA" } }
])
```

A user with access to `orders_emea` cannot see orders from other regions even if they try to filter differently - the view's `$match` always applies.

## Schema Abstraction During Migrations

When migrating a field name, create a view that normalizes both old and new documents:

```javascript
db.createView("users_v2", "users", [
  {
    $addFields: {
      // Normalize: use new field name if present, fall back to old
      displayName: {
        $ifNull: ["$displayName", "$fullName"]
      }
    }
  },
  { $project: { fullName: 0 } }
])
```

Application code targets `users_v2` during the migration window.

## Limitations to Be Aware Of

- Views are read-only. All write operations must go to the source collection.
- Views do not store data - every query re-runs the pipeline.
- You cannot create indexes directly on a view.
- A view can reference another view, but both must share the same collation.

## Summary

MongoDB views serve dual roles: abstracting complex aggregation logic into a stable query interface, and enforcing field-level and row-level security by restricting what roles can access. Combine views with RBAC to ensure users see only the data they are authorized to access.
