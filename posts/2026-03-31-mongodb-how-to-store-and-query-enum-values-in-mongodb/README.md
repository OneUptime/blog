# How to Store and Query Enum Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, ENUM, Schema Validation, Query, Data Modeling

Description: Learn how to store and query enum values in MongoDB using schema validation, string enums, and efficient patterns for status fields and categorical data.

---

## Introduction

MongoDB does not have a native enum type, but you can implement enum-like constraints using JSON Schema validation rules. Enums are commonly used for status fields, categories, roles, and other categorical data. Proper implementation includes schema validation to enforce allowed values, indexing for efficient queries, and clear patterns for evolving the enum set over time.

## Storing Enum Values as Strings

The simplest approach is to store enum values as lowercase strings with underscore separators:

```javascript
// Order document with enum fields
{
  _id: ObjectId("..."),
  orderId: "ORD-001",
  status: "pending",          // Enum: pending, processing, shipped, delivered, cancelled
  paymentStatus: "unpaid",    // Enum: unpaid, paid, refunded
  priority: "normal"          // Enum: low, normal, high, urgent
}
```

## Enforcing Enums with JSON Schema Validation

Add a validator to the collection that enforces allowed enum values:

```javascript
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["status", "paymentStatus"],
      properties: {
        status: {
          bsonType: "string",
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
          description: "Order status must be one of the defined values"
        },
        paymentStatus: {
          bsonType: "string",
          enum: ["unpaid", "paid", "refunded"],
          description: "Payment status must be a valid value"
        },
        priority: {
          bsonType: "string",
          enum: ["low", "normal", "high", "urgent"]
        }
      }
    }
  },
  validationAction: "error",  // "warn" to log only, "error" to reject invalid docs
  validationLevel: "strict"   // "strict" = always validate, "moderate" = skip validation for updates to non-compliant docs
});
```

## Adding Validation to an Existing Collection

```javascript
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        status: {
          bsonType: "string",
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"]
        }
      }
    }
  },
  validationLevel: "moderate", // Only validate newly inserted/updated docs
  validationAction: "error"
});
```

## Querying by Enum Value

```javascript
// Simple equality query
db.orders.find({ status: "pending" });

// Multiple values using $in
db.orders.find({ status: { $in: ["pending", "processing"] } });

// Exclude certain values
db.orders.find({ status: { $nin: ["cancelled", "delivered"] } });
```

## Indexing Enum Fields

Create indexes on frequently queried enum fields:

```javascript
// Single field index
db.orders.createIndex({ status: 1 });

// Compound index for common query patterns
db.orders.createIndex({ status: 1, createdAt: -1 });
db.orders.createIndex({ paymentStatus: 1, status: 1 });
```

## Aggregating by Enum Value

Get counts per status:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalRevenue: { $sum: "$amount" }
    }
  },
  { $sort: { count: -1 } }
]);
```

## Defining Enums in Mongoose

```javascript
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: {
      values: ["pending", "processing", "shipped", "delivered", "cancelled"],
      message: "{VALUE} is not a valid order status"
    },
    default: "pending",
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid", "refunded"],
    default: "unpaid"
  }
});

const Order = mongoose.model("Order", orderSchema);
```

## Using Numeric Enums for Storage Efficiency

For high-volume collections, numeric enums save storage:

```javascript
// Map in application code
const STATUS = { PENDING: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3, CANCELLED: 4 };

db.orders.insertOne({ status: STATUS.PENDING }); // Stores 0

// Query using constant
db.orders.find({ status: STATUS.DELIVERED }); // { status: 3 }
```

Trade-off: queries and aggregations are less readable.

## Evolving Enums Safely

Adding a new enum value to an existing collection with validation:

```javascript
// Step 1: Update the validation schema to include the new value
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      properties: {
        status: {
          enum: ["pending", "processing", "shipped", "delivered", "cancelled", "on_hold"]
          // Added "on_hold"
        }
      }
    }
  }
});

// Step 2: Now insert documents with the new status
db.orders.updateOne(
  { _id: someId },
  { $set: { status: "on_hold" } }
);
```

Removing a value requires first migrating existing documents away from it.

## Summary

Implement MongoDB enums as string fields enforced by JSON Schema `$jsonSchema` validators with the `enum` keyword. Use `validationAction: "error"` to strictly reject invalid values and index enum fields with `createIndex` for efficient filtering. Use `$in` for multi-value queries and `$group` for distribution analytics. When evolving enum sets, add new values to the validator before using them, and migrate documents away from removed values before dropping them from the schema.
