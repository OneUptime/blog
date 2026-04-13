# How to Use $lookup for Left Outer Joins in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $lookup, Joins, Pipeline Stage, NoSQL

Description: Learn how to use MongoDB's $lookup stage to perform left outer joins between collections, including simple equality joins and complex pipeline-based joins.

---

## What Is the $lookup Stage?

The `$lookup` stage performs a left outer join with another collection in the same database. It attaches matched documents from the joined collection as an array field. If no match is found, the array is empty.

## Simple Equality Join Syntax

```javascript
{
  $lookup: {
    from: "collectionToJoin",
    localField: "fieldInCurrentCollection",
    foreignField: "fieldInJoinedCollection",
    as: "outputArrayFieldName"
  }
}
```

## Basic Example

Join orders with customer details:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customerDetails"
    }
  }
])
```

Each order document gets a `customerDetails` array with the matched customer(s).

## Flattening the Joined Array

Use `$unwind` to flatten the single-element array from a one-to-one join:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
    }
  },
  { $unwind: "$customer" }
])
```

## One-to-Many Join

Join posts with all their comments:

```javascript
db.posts.aggregate([
  {
    $lookup: {
      from: "comments",
      localField: "_id",
      foreignField: "postId",
      as: "comments"
    }
  },
  {
    $addFields: {
      commentCount: { $size: "$comments" }
    }
  }
])
```

## Pipeline-Based Join (MongoDB 3.6+)

Use a pipeline in `$lookup` for more complex join conditions including multiple conditions, computed expressions, and filtering:

```javascript
{
  $lookup: {
    from: "inventory",
    let: { orderSku: "$sku", orderQty: "$quantity" },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$sku", "$$orderSku"] },
              { $gte: ["$inStock", "$$orderQty"] }
            ]
          }
        }
      },
      { $project: { sku: 1, inStock: 1, warehouse: 1 } }
    ],
    as: "availableInventory"
  }
}
```

## Joining with Non-Equality Conditions

Find orders with matching promotions based on date range:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "promotions",
      let: { orderDate: "$orderDate", orderTotal: "$total" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $lte: ["$startDate", "$$orderDate"] },
                { $gte: ["$endDate", "$$orderDate"] },
                { $lte: ["$minOrderAmount", "$$orderTotal"] }
              ]
            }
          }
        }
      ],
      as: "applicablePromotions"
    }
  }
])
```

## Self-Join

Join a collection with itself to find related documents:

```javascript
db.employees.aggregate([
  {
    $lookup: {
      from: "employees",
      localField: "managerId",
      foreignField: "_id",
      as: "manager"
    }
  },
  { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } }
])
```

## Filtering After $lookup

Use `$match` to filter based on joined data:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product"
    }
  },
  { $unwind: "$product" },
  { $match: { "product.category": "Electronics" } }
])
```

## Performance Tips

- Add indexes on the `foreignField` in the joined collection.
- Use the pipeline form with `$match` as the first stage to reduce joined documents early.
- Avoid `$lookup` on large collections without indexes on join fields.

```javascript
// Index to support the join on foreignField
db.comments.createIndex({ postId: 1 })
db.orders.createIndex({ customerId: 1 })
```

## Left Outer Join Behavior

Documents in the source collection with no matches in the foreign collection still appear in the output, with an empty array for the joined field:

```javascript
{ _id: 5, customerId: "c999", customerDetails: [] }  // no matching customer
```

Use `$match` with `$ne: []` to filter out unmatched documents when needed.

## Summary

The `$lookup` stage enables rich multi-collection queries in MongoDB aggregation. Simple equality joins work well for straightforward foreign key relationships, while pipeline-based joins unlock complex multi-condition, computed, and filtered joins. Always index join fields and filter early in the pipeline to maintain performance at scale.
