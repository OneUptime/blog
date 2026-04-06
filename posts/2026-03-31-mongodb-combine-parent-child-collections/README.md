# How to Combine Data from Parent and Child Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Lookup, Aggregation, Relationship, Join

Description: Use $lookup and $unwind to join parent and child collections in MongoDB aggregation pipelines, replicating SQL-style parent-child queries.

---

## Overview

MongoDB is a document database, but real applications often store related data across multiple collections - for example, orders and their line items, or categories and their products. The `$lookup` aggregation stage performs left outer joins between collections, letting you combine parent and child data in a single query.

## Data Model

A typical parent-child relationship in MongoDB:

```javascript
// Parent: orders
{ _id: ObjectId("..."), customerId: "cust_001", status: "shipped", placedAt: new Date() }

// Child: order_items
{ _id: ObjectId("..."), orderId: ObjectId("..."), productName: "Laptop", qty: 1, price: 999.99 }
```

## Basic $lookup Join

Embed child documents into the parent using `$lookup`.

```javascript
const ordersWithItems = await db.collection("orders").aggregate([
  { $match: { status: "shipped" } },
  {
    $lookup: {
      from: "order_items",
      localField: "_id",
      foreignField: "orderId",
      as: "items",
    },
  },
  {
    $addFields: {
      itemCount: { $size: "$items" },
      orderTotal: { $sum: { $map: { input: "$items", as: "i", in: { $multiply: ["$$i.qty", "$$i.price"] } } } },
    },
  },
]).toArray();
```

## Pipeline $lookup for Complex Conditions

Use the pipeline form of `$lookup` to filter child documents before embedding them.

```javascript
const ordersWithBigItems = await db.collection("orders").aggregate([
  {
    $lookup: {
      from: "order_items",
      let: { orderId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$orderId", "$$orderId"] },
                { $gte: ["$price", 100] },
              ],
            },
          },
        },
        { $sort: { price: -1 } },
        { $limit: 5 },
      ],
      as: "expensiveItems",
    },
  },
  { $match: { "expensiveItems.0": { $exists: true } } },
]).toArray();
```

## Unwinding Children for Flat Output

Use `$unwind` to produce one document per child row - similar to a SQL `JOIN`.

```javascript
const flatLineItems = await db.collection("orders").aggregate([
  { $match: { customerId: "cust_001" } },
  {
    $lookup: {
      from: "order_items",
      localField: "_id",
      foreignField: "orderId",
      as: "item",
    },
  },
  { $unwind: "$item" },
  {
    $project: {
      orderId: "$_id",
      status: 1,
      productName: "$item.productName",
      qty: "$item.qty",
      price: "$item.price",
      lineTotal: { $multiply: ["$item.qty", "$item.price"] },
    },
  },
]).toArray();
```

## Nested Lookup: Three Levels

Join a third collection (products) to enrich the child documents.

```javascript
const enriched = await db.collection("orders").aggregate([
  {
    $lookup: {
      from: "order_items",
      localField: "_id",
      foreignField: "orderId",
      as: "items",
    },
  },
  { $unwind: "$items" },
  {
    $lookup: {
      from: "products",
      localField: "items.productId",
      foreignField: "_id",
      as: "items.productDetails",
    },
  },
  { $unwind: { path: "$items.productDetails", preserveNullAndEmptyArrays: true } },
]).toArray();
```

## Index for $lookup Performance

```javascript
await db.collection("order_items").createIndex({ orderId: 1 });
```

## Summary

MongoDB's `$lookup` stage joins parent and child collections inside the aggregation pipeline. Use the basic form for simple foreign key joins, the pipeline form to filter or sort child documents before embedding, and `$unwind` to produce flat output rows. Always index the foreign key field on the child collection to keep lookups fast.
