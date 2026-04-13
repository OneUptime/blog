# How to Use $graphLookup for Recursive Graph Traversal in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $graphLookup, Graph Traversal, Recursive Queries, NoSQL

Description: Learn how to use MongoDB's $graphLookup stage to traverse graph-like structures recursively, enabling queries on hierarchical data like org charts and category trees.

---

## What Is the $graphLookup Stage?

The `$graphLookup` stage performs recursive lookups on a collection, following a chain of references to traverse graph or tree structures. It is ideal for hierarchical data like organizational charts, category hierarchies, social network connections, and dependency graphs.

```javascript
{
  $graphLookup: {
    from: "collection",
    startWith: startExpression,
    connectFromField: "fieldToFollowFrom",
    connectToField: "fieldToMatchAgainst",
    as: "outputField",
    maxDepth: number,           // optional
    depthField: "fieldName",    // optional
    restrictSearchWithMatch: {} // optional filter
  }
}
```

## Basic Example - Org Chart

Find all employees who report (directly or indirectly) to a manager:

```javascript
// employees collection
{ _id: 1, name: "Alice", reportsTo: null }    // CEO
{ _id: 2, name: "Bob",   reportsTo: "Alice" }
{ _id: 3, name: "Carol", reportsTo: "Alice" }
{ _id: 4, name: "Dave",  reportsTo: "Bob" }
{ _id: 5, name: "Eve",   reportsTo: "Bob" }
{ _id: 6, name: "Frank", reportsTo: "Carol" }
```

Find all reports under Alice:

```javascript
db.employees.aggregate([
  { $match: { name: "Alice" } },
  {
    $graphLookup: {
      from: "employees",
      startWith: "$name",
      connectFromField: "name",
      connectToField: "reportsTo",
      as: "allReports"
    }
  }
])
```

Returns Alice's document with `allReports` containing Bob, Carol, Dave, Eve, and Frank.

## Limiting Traversal Depth

Use `maxDepth` to limit how many levels deep to traverse:

```javascript
db.employees.aggregate([
  { $match: { name: "Alice" } },
  {
    $graphLookup: {
      from: "employees",
      startWith: "$name",
      connectFromField: "name",
      connectToField: "reportsTo",
      as: "directAndIndirectReports",
      maxDepth: 1  // direct reports and their direct reports
    }
  }
])
```

## Capturing Depth with depthField

```javascript
db.employees.aggregate([
  { $match: { name: "Alice" } },
  {
    $graphLookup: {
      from: "employees",
      startWith: "$name",
      connectFromField: "name",
      connectToField: "reportsTo",
      as: "reports",
      depthField: "level"
    }
  }
])
```

Each document in `reports` has a `level` field: `0` for direct reports, `1` for their reports, etc.

## Category Tree Traversal

Find all subcategories under a parent category:

```javascript
db.categories.aggregate([
  { $match: { slug: "electronics" } },
  {
    $graphLookup: {
      from: "categories",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "parentId",
      as: "allSubcategories",
      depthField: "depth"
    }
  }
])
```

## Upward Traversal - Finding Ancestors

Traverse upward in the hierarchy from a leaf node:

```javascript
db.employees.aggregate([
  { $match: { name: "Dave" } },
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "name",
      as: "managementChain",
      depthField: "level"
    }
  }
])
```

Returns Dave's management chain (Bob at level 0, Alice at level 1).

## Restricting Traversal with a Filter

Use `restrictSearchWithMatch` to only follow nodes matching a condition:

```javascript
db.employees.aggregate([
  { $match: { name: "Alice" } },
  {
    $graphLookup: {
      from: "employees",
      startWith: "$name",
      connectFromField: "name",
      connectToField: "reportsTo",
      as: "activeReports",
      restrictSearchWithMatch: { active: true }
    }
  }
])
```

Only traverses active employees.

## Social Network - Friends of Friends

```javascript
db.users.aggregate([
  { $match: { username: "alice" } },
  {
    $graphLookup: {
      from: "users",
      startWith: "$friends",
      connectFromField: "friends",
      connectToField: "username",
      as: "network",
      maxDepth: 2,
      depthField: "hops"
    }
  }
])
```

## Performance Considerations

- `$graphLookup` performs multiple recursive lookups - index `connectToField` for performance.
- Set `maxDepth` to prevent unbounded traversal on large graphs.
- The output array is unordered - sort by `depthField` if order matters.

```javascript
db.employees.createIndex({ reportsTo: 1 })
db.categories.createIndex({ parentId: 1 })
```

## Summary

`$graphLookup` enables powerful recursive traversal of graph and tree structures stored in MongoDB. Whether navigating org charts, category trees, social networks, or dependency graphs, it handles arbitrarily deep relationships with configurable depth limits, ancestor/descendant direction, and filtered traversal. Always index the `connectToField` to maintain performance on large hierarchies.
