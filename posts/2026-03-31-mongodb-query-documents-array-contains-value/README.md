# How to Query Documents Where an Array Contains a Value in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array, Query

Description: Learn how to query MongoDB documents where an array field contains a specific value using equality, $elemMatch, and $in operators.

---

MongoDB arrays are first-class citizens in the document model. Querying documents where an array field contains a specific value is one of the most common operations, and MongoDB provides several clean ways to do it.

## Simple Equality Match on an Array

The most direct approach uses a simple equality condition. MongoDB automatically checks whether any element in the array matches the value:

```javascript
// Find all products with the tag "electronics"
db.products.find({ tags: "electronics" });
```

This works even though `tags` is an array - MongoDB tests each element. A document like `{ tags: ["electronics", "sale", "featured"] }` matches.

## Matching Multiple Values with $in

To find documents where an array contains any one of several values, use `$in`:

```javascript
// Find products tagged "electronics" OR "computers"
db.products.find({
  tags: { $in: ["electronics", "computers"] }
});
```

This returns documents where the `tags` array contains at least one of the listed values.

## Matching Subdocuments in Arrays with $elemMatch

When array elements are embedded documents, use `$elemMatch` to apply multiple conditions to a single element:

```javascript
// Find orders where at least one line item has productId "P-100" with qty > 5
db.orders.find({
  lineItems: {
    $elemMatch: {
      productId: "P-100",
      qty: { $gt: 5 }
    }
  }
});
```

Without `$elemMatch`, applying two conditions across different elements would match unintended documents:

```javascript
// WARNING: This matches documents where productId is in ANY element
// and qty > 5 is in ANY (possibly different) element
db.orders.find({
  "lineItems.productId": "P-100",
  "lineItems.qty": { $gt: 5 }
});
```

## Matching a Specific Array Index

To match a value at a specific position, use dot notation with the index:

```javascript
// Find documents where the first tag is "featured"
db.products.find({ "tags.0": "featured" });
```

## Combining Array Checks with $and

To require multiple conditions on the same array (e.g., must contain both "sale" and "electronics"):

```javascript
db.products.find({
  $and: [
    { tags: "sale" },
    { tags: "electronics" }
  ]
});
```

This is equivalent to using `$all`, which is the more idiomatic way to write the same query: `{ tags: { $all: ["sale", "electronics"] } }`.

## Indexing Array Fields

MongoDB creates a multikey index when you index an array field. Each element gets its own index entry:

```javascript
db.products.createIndex({ tags: 1 });
```

Queries that use `tags: "electronics"` will use this index efficiently. Verify with explain:

```javascript
db.products.find({ tags: "electronics" }).explain("executionStats");
```

Look for `IXSCAN` and a multikey flag of `true` in the index scan stage.

## Negation: Finding Documents Where an Array Does Not Contain a Value

Use `$ne` or `$nin` to find documents where the array does not contain a value:

```javascript
// Exclude products tagged "discontinued"
db.products.find({ tags: { $ne: "discontinued" } });

// Exclude products tagged either "discontinued" or "archived"
db.products.find({ tags: { $nin: ["discontinued", "archived"] } });
```

## Summary

For simple array membership checks, MongoDB's equality operator works directly on array fields without special syntax. Use `$in` for multi-value membership tests, `$elemMatch` when conditions must apply to the same subdocument element, and multikey indexes to keep these queries fast at scale.
