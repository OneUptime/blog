# How to Use $arrayElemAt and $arrayToObject in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $arrayElemAt, $arrayToObject, Array, Pipeline

Description: Learn how to use $arrayElemAt to access array elements by index and $arrayToObject to convert key-value arrays into objects in MongoDB aggregation.

---

## $arrayElemAt

`$arrayElemAt` returns the element of an array at the specified index position. Negative indices count from the end of the array.

### Syntax

```javascript
{ $arrayElemAt: [ <array>, <index> ] }
```

- Index `0` = first element
- Index `-1` = last element
- Index out of bounds = returns nothing (the field is absent in the output)

## $arrayToObject

`$arrayToObject` converts an array to an object (document). The array can be in two forms:
1. An array of two-element arrays: `[[key, value], ...]`
2. An array of `{ k: key, v: value }` objects

### Syntax

```javascript
{ $arrayToObject: <array expression> }
```

## Examples

### $arrayElemAt Examples

#### Input Documents

```javascript
[
  { _id: 1, scores: [85, 92, 78, 90, 88] },
  { _id: 2, scores: [60, 75, 82] }
]
```

#### Example 1 - Access First and Last Elements

```javascript
db.students.aggregate([
  {
    $project: {
      firstScore: { $arrayElemAt: ["$scores", 0] },
      lastScore:  { $arrayElemAt: ["$scores", -1] },
      thirdScore: { $arrayElemAt: ["$scores", 2] }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, firstScore: 85, lastScore: 88, thirdScore: 78 },
  { _id: 2, firstScore: 60, lastScore: 82, thirdScore: 82 }
]
```

#### Example 2 - Extract First Match After $lookup

After `$lookup`, extract just the first matching document:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "productInfo"
    }
  },
  {
    $project: {
      amount: 1,
      productName: { $arrayElemAt: ["$productInfo.name", 0] }
    }
  }
])
```

#### Example 3 - Out-of-Bounds Index

Index beyond the array length produces no field in the output:

```javascript
// Input: { _id: 1, arr: [10, 20] }
db.data.aggregate([
  { $project: { elem: { $arrayElemAt: ["$arr", 5] } } }
])
// Output: { _id: 1 }  -- 'elem' is absent
```

---

### $arrayToObject Examples

#### Example 4 - Convert k/v Array to Object

Convert an array of `{ k, v }` pairs into a single document:

```javascript
// Input: { _id: 1, attributes: [{ k: "color", v: "red" }, { k: "size", v: "L" }] }
db.products.aggregate([
  {
    $project: {
      specs: { $arrayToObject: "$attributes" }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, specs: { color: "red", size: "L" } }
]
```

#### Example 5 - Convert Two-Element Sub-Arrays to Object

Convert `[["key", "value"], ...]` format:

```javascript
// Input: { _id: 1, pairs: [["width", 100], ["height", 200]] }
db.dimensions.aggregate([
  {
    $project: {
      dimensions: { $arrayToObject: "$pairs" }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, dimensions: { width: 100, height: 200 } }
]
```

#### Example 6 - $arrayToObject After $map

Transform an array of objects into a key-value structure dynamically:

```javascript
// Input: { _id: 1, metrics: [{ name: "clicks", count: 100 }, { name: "views", count: 500 }] }
db.analytics.aggregate([
  {
    $project: {
      metricMap: {
        $arrayToObject: {
          $map: {
            input: "$metrics",
            as: "m",
            in: { k: "$$m.name", v: "$$m.count" }
          }
        }
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, metricMap: { clicks: 100, views: 500 } }
]
```

#### Example 7 - Dynamic Field Names with $arrayToObject

When document field names are stored in a data field rather than as schema fields, `$arrayToObject` converts them:

```javascript
// Input: { _id: 1, fieldNames: ["a", "b"], fieldValues: [1, 2] }
db.dynamic.aggregate([
  {
    $project: {
      result: {
        $arrayToObject: {
          $zip: { inputs: ["$fieldNames", "$fieldValues"] }
        }
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, result: { a: 1, b: 2 } }
]
```

Note: `$zip` combines two arrays element-by-element into an array of two-element arrays.

## Common Patterns

```javascript
// Get the last element of an array
{ $arrayElemAt: ["$arr", -1] }

// Get second to last
{ $arrayElemAt: ["$arr", -2] }

// Safe access with $ifNull fallback
{ $ifNull: [{ $arrayElemAt: ["$arr", 0] }, "default"] }

// Build object from parallel key/value arrays
{ $arrayToObject: { $zip: { inputs: ["$keys", "$values"] } } }
```

## Use Cases

- Extracting the most recent or first element from a time-ordered array
- Accessing a specific element after `$lookup` (e.g., first match)
- Transforming EAV (Entity-Attribute-Value) arrays into structured objects
- Building dynamic projections from data-driven key-value arrays

## Summary

`$arrayElemAt` accesses a single element from an array by zero-based index (negative indices count from the end). `$arrayToObject` converts an array of `{ k, v }` pairs or two-element arrays into a single document object. Together they are useful for flattening array structures into accessible fields, especially after `$lookup` and `$map` operations.
