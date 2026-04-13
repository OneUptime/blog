# How to Use $project to Reshape Documents in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $project, Pipeline Stage, NoSQL

Description: Learn how to use MongoDB's $project aggregation stage to include, exclude, rename, and compute fields, reshaping documents as they flow through a pipeline.

---

## What Is the $project Stage?

The `$project` stage in MongoDB's aggregation pipeline reshapes documents by selecting which fields to include, exclude, rename, or compute. It is one of the most versatile pipeline stages, enabling you to transform document structure without altering the underlying collection.

```javascript
db.collection.aggregate([
  { $project: { field1: 1, field2: 1, newField: "$existingField" } }
])
```

## Including and Excluding Fields

By default, `_id` is included. Set a field to `1` to include, `0` to exclude:

```javascript
db.users.aggregate([
  {
    $project: {
      name: 1,
      email: 1,
      _id: 0  // explicitly exclude _id
    }
  }
])
```

You cannot mix inclusion and exclusion in the same `$project`, except for `_id`.

## Renaming Fields

Assign an existing field expression to a new name:

```javascript
db.orders.aggregate([
  {
    $project: {
      orderId: "$_id",
      customerName: "$customer.name",
      orderTotal: "$total",
      _id: 0
    }
  }
])
```

## Computing New Fields

Use expressions to compute new fields:

```javascript
db.orders.aggregate([
  {
    $project: {
      item: 1,
      subtotal: { $multiply: ["$price", "$quantity"] },
      tax: { $multiply: ["$price", "$quantity", 0.08] },
      discountApplied: { $gt: ["$discount", 0] }
    }
  }
])
```

## Accessing Nested Fields

Use dot notation or `$` references to include nested fields:

```javascript
db.users.aggregate([
  {
    $project: {
      name: 1,
      city: "$address.city",
      country: "$address.country",
      _id: 0
    }
  }
])
```

## Reshaping Arrays

Transform arrays using expressions within `$project`:

```javascript
db.orders.aggregate([
  {
    $project: {
      itemCount: { $size: "$items" },
      firstItem: { $arrayElemAt: ["$items", 0] },
      itemSkus: { $map: {
        input: "$items",
        as: "item",
        in: "$$item.sku"
      }}
    }
  }
])
```

## Conditional Field Inclusion

Use `$cond` to conditionally compute field values:

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      price: 1,
      priceCategory: {
        $cond: {
          if: { $gt: ["$price", 100] },
          then: "premium",
          else: "standard"
        }
      }
    }
  }
])
```

## Excluding Fields Only

To exclude specific fields and keep everything else:

```javascript
db.users.aggregate([
  {
    $project: {
      password: 0,
      internalNotes: 0,
      __v: 0
    }
  }
])
```

## Using Variables and Let

Combine with `$let` for complex expressions:

```javascript
db.orders.aggregate([
  {
    $project: {
      profitMargin: {
        $let: {
          vars: { revenue: "$total", cost: "$costOfGoods" },
          in: { $divide: [{ $subtract: ["$$revenue", "$$cost"] }, "$$revenue"] }
        }
      }
    }
  }
])
```

## Practical Use Case - API Response Shaping

Shape documents for an API response, removing internal fields and adding computed ones:

```javascript
db.products.aggregate([
  { $match: { active: true } },
  {
    $project: {
      _id: 0,
      id: { $toString: "$_id" },
      name: 1,
      price: 1,
      inStock: { $gt: ["$quantity", 0] },
      imageUrl: { $concat: ["https://cdn.example.com/", "$imageKey"] }
    }
  }
])
```

## Summary

The `$project` stage is a powerful tool for controlling document shape in aggregation pipelines. It supports field inclusion/exclusion, renaming, computed expressions, array transformations, and conditional logic. Use it to normalize data for API responses, reduce document size for downstream stages, and derive new fields from existing ones.
