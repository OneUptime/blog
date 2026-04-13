# How to Use $all to Match Documents with All Array Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $all, Array Query, Query Operator, Filter

Description: Learn how to use MongoDB's $all operator to find documents where an array field contains every value in a specified list, regardless of order.

---

## What Is $all

The `$all` operator matches documents where the array field contains all of the specified values. The order of values does not matter, and the array may contain additional elements beyond those listed.

Syntax:

```javascript
{ field: { $all: [value1, value2, value3] } }
```

## Basic Example

Find products tagged with both "sale" and "electronics":

```javascript
db.products.find({ tags: { $all: ["sale", "electronics"] } })
```

This returns documents where the `tags` array contains at least both `"sale"` and `"electronics"`, even if other tags are also present.

## $all vs $in

| Operator | Match condition |
|----------|----------------|
| `$in` | Array contains ANY of the specified values |
| `$all` | Array contains ALL of the specified values |

```javascript
// Matches docs with tag "sale" OR "electronics"
db.products.find({ tags: { $in: ["sale", "electronics"] } })

// Matches docs with tag "sale" AND "electronics"
db.products.find({ tags: { $all: ["sale", "electronics"] } })
```

## $all with a Single Value

`$all: ["value"]` is equivalent to `$eq: "value"` for array fields:

```javascript
db.posts.find({ categories: { $all: ["mongodb"] } })
// Same as:
db.posts.find({ categories: "mongodb" })
```

## $all with $elemMatch

When you need all elements to satisfy complex conditions (not just value equality), combine `$all` with `$elemMatch`:

```javascript
// Find courses that require both JavaScript AND Python proficiency >= 3
db.courses.find({
  requirements: {
    $all: [
      { $elemMatch: { skill: "javascript", level: { $gte: 3 } } },
      { $elemMatch: { skill: "python", level: { $gte: 3 } } }
    ]
  }
})
```

## Tag-Based Filtering Pattern

```javascript
// Multi-tag filter: must have all selected tags
async function findByAllTags(collection, requiredTags) {
  return collection.find({
    tags: { $all: requiredTags }
  }).toArray();
}

const results = await findByAllTags(db.collection("articles"), [
  "mongodb", "performance", "indexing"
]);
```

## Permissions and Role Checking

```javascript
// Find users who have ALL required permissions
db.users.find({
  permissions: { $all: ["read", "write", "admin"] }
})
```

## Index Support for $all

`$all` can use a multikey index (an index on an array field). MongoDB performs an index lookup for each element and intersects the results:

```javascript
await db.collection("products").createIndex({ tags: 1 });

// Uses the multikey index
db.products.find({ tags: { $all: ["sale", "electronics"] } })
```

## Common Mistakes

- Confusing `$all` with `$in` - `$all` requires all values to be present, `$in` requires any.
- Using `$all` on non-array fields - it also works for scalar fields but behavior is less intuitive.
- Passing an empty array `$all: []` - this matches no documents, which may be unexpected.

## Summary

The `$all` operator finds documents where an array field contains every element in the specified list, regardless of order or additional elements. It is ideal for tag-based filtering and permission checking. Use a multikey index on the array field to support `$all` queries efficiently. Combine `$all` with `$elemMatch` for complex element-level conditions.
