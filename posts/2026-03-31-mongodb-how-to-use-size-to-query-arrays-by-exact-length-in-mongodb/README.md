# How to Use $size to Query Arrays by Exact Length in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array Queries, $size, Query Operator, NoSQL

Description: Learn how to use MongoDB's $size operator to filter documents based on the exact number of elements in an array field.

---

## What Is the $size Operator?

The `$size` operator in MongoDB matches documents where an array field has exactly the specified number of elements. It is a straightforward way to filter by array length without requiring extra metadata fields.

```javascript
{ field: { $size: number } }
```

## Basic Example

Suppose you have a `posts` collection:

```javascript
{ _id: 1, title: "Intro to MongoDB", tags: ["mongodb", "nosql"] }
{ _id: 2, title: "Advanced Queries", tags: ["mongodb", "queries", "aggregation"] }
{ _id: 3, title: "Getting Started", tags: [] }
```

Find posts with exactly two tags:

```javascript
db.posts.find({ tags: { $size: 2 } })
```

Returns document 1.

Find posts with no tags:

```javascript
db.posts.find({ tags: { $size: 0 } })
```

Returns document 3.

## Combining $size with Other Operators

While `$size` only supports exact matches, you can combine it with other query operators:

```javascript
// Posts with exactly 2 tags AND a specific tag
db.posts.find({
  $and: [
    { tags: { $size: 2 } },
    { tags: "mongodb" }
  ]
})
```

Note: You cannot use `$size` with range operators like `$gt` or `$lt` directly.

## Querying for Arrays Larger Than N

Since `$size` only supports exact matches, to query arrays larger than a given size, use a workaround with the `$exists` trick or store a computed length field:

```javascript
// Find documents where the 3rd element (index 2) exists - means array has at least 3 elements
db.posts.find({ "tags.2": { $exists: true } })
```

Or store a computed length at write time and index it:

```javascript
db.posts.updateMany({}, [
  { $set: { tagCount: { $size: "$tags" } } }
])
db.posts.createIndex({ tagCount: 1 })
db.posts.find({ tagCount: { $gt: 2 } })
```

## Using $size in Aggregation

Within an aggregation pipeline, use the `$size` expression to compute array lengths:

```javascript
db.posts.aggregate([
  {
    $project: {
      title: 1,
      tagCount: { $size: "$tags" }
    }
  },
  {
    $match: { tagCount: { $gte: 2 } }
  }
])
```

This is more flexible than the query operator since it supports range comparisons.

## Handling Missing or Non-Array Fields

If the field does not exist or is not an array, `$size` will not match that document (it won't throw an error). Use `$exists` to filter first if needed:

```javascript
db.posts.find({
  tags: { $exists: true, $size: 2 }
})
```

## Indexing Limitations

The `$size` query operator does not use indexes effectively. For performance-sensitive queries on array length, always maintain a dedicated count field:

```javascript
// On insert, maintain tagCount
db.posts.insertOne({
  title: "New Post",
  tags: ["mongodb"],
  tagCount: 1
})
db.posts.createIndex({ tagCount: 1 })
```

## Summary

The `$size` operator provides simple exact-length matching for array fields in MongoDB. For range-based length queries, use computed fields or aggregation expressions. Always index a separate count field if you frequently query by array size in performance-critical applications.
