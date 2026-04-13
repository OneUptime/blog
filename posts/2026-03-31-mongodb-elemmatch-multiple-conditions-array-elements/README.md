# How to Use $elemMatch to Match Multiple Conditions on Array Elements in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $elemMatch, Array Query, Query Operator, Embedded Document

Description: Learn how to use MongoDB's $elemMatch to match documents where a single array element satisfies multiple conditions simultaneously.

---

## The Problem $elemMatch Solves

When you apply multiple conditions to an array field without `$elemMatch`, MongoDB checks whether ANY element matches the first condition AND ANY element matches the second condition - they do not need to be the same element.

```javascript
// WRONG: does NOT require both conditions on the same element
db.scores.find({
  results: { $gt: 80, $lt: 90 }
})
// Matches if one element is > 80 and a DIFFERENT element is < 90
```

`$elemMatch` requires all conditions to be satisfied by the same single element.

## Basic $elemMatch Usage

```javascript
// Correct: both conditions must be true for the SAME element
db.scores.find({
  results: { $elemMatch: { $gt: 80, $lt: 90 } }
})
```

## Array of Embedded Documents

`$elemMatch` is most powerful with arrays of objects:

```javascript
// Find orders that have at least one item with qty > 5 AND price < 50
db.orders.find({
  items: {
    $elemMatch: {
      qty: { $gt: 5 },
      price: { $lt: 50 }
    }
  }
})
```

Without `$elemMatch`, `qty > 5` and `price < 50` could match different items in the array.

## Matching by Specific Field in an Array Object

```javascript
// Find students with at least one failed exam in Math
db.students.find({
  exams: {
    $elemMatch: {
      subject: "Math",
      score: { $lt: 60 }
    }
  }
})
```

## $elemMatch in Projection

`$elemMatch` can also be used in the projection (second argument) to return only the first matching element:

```javascript
// Return only the first Math exam for each student
db.students.find(
  { "exams.subject": "Math" },
  {
    name: 1,
    exams: { $elemMatch: { subject: "Math" } }
  }
)
```

Note: `$elemMatch` in projection returns at most one matching element per document.

## $elemMatch vs Dot Notation

Dot notation queries like `"items.qty": { $gt: 5 }` do not restrict conditions to the same element. Use `$elemMatch` whenever you need multi-condition matching on array elements.

```javascript
// Dot notation: qty > 5 and price < 50 can be on different items
db.orders.find({ "items.qty": { $gt: 5 }, "items.price": { $lt: 50 } })

// $elemMatch: both conditions must be on the same item
db.orders.find({ items: { $elemMatch: { qty: { $gt: 5 }, price: { $lt: 50 } } } })
```

## Combining $elemMatch with Other Operators

```javascript
// Find users with an address in NY that has a zip starting with "100"
db.users.find({
  addresses: {
    $elemMatch: {
      state: "NY",
      zip: { $regex: /^100/ }
    }
  }
})
```

## Index Support

MongoDB can use a multikey index to support `$elemMatch` queries:

```javascript
db.orders.createIndex({ "items.sku": 1 });

// Uses multikey index on items.sku
db.orders.find({
  items: { $elemMatch: { sku: "ABC123", qty: { $gt: 0 } } }
})
```

## Common Mistakes

- Using multiple conditions on an array field directly without `$elemMatch` and expecting them to apply to the same element.
- Using `$elemMatch` with a single condition - unnecessary; direct field matching works.
- Expecting `$elemMatch` in projection to return all matching elements - it returns only the first.

## Summary

`$elemMatch` ensures that all specified conditions are satisfied by the same element in an array. Use it whenever you need to match documents based on multiple criteria applied to a single array element. Without `$elemMatch`, MongoDB evaluates each condition independently across all array elements, which may produce incorrect matches.
