# What Is $graphLookup and When to Use It in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, GraphLookup, Graph Queries, Recursive Queries

Description: Learn what the MongoDB $graphLookup aggregation stage does, how it performs recursive graph traversals, and when to use it for hierarchical and network data.

---

## What Is $graphLookup

`$graphLookup` is an aggregation pipeline stage that performs recursive, graph-like lookups within a single collection. It traverses relationships between documents by repeatedly matching a field in one document to a field in another, collecting all reachable documents up to a specified depth.

Use cases include:
- Organizational hierarchies (employee-manager trees)
- Category trees (parent-child taxonomies)
- Social network friend-of-friend queries
- Bill of materials (part-subpart trees)
- Permission inheritance chains

## Basic Syntax

```javascript
{
  $graphLookup: {
    from: <collection>,
    startWith: <expression>,        // starting value(s)
    connectFromField: <string>,     // field in the result documents
    connectToField: <string>,       // field to match against
    as: <string>,                   // output array field name
    maxDepth: <number>,             // optional - max traversal depth
    depthField: <string>,           // optional - adds depth to each result
    restrictSearchWithMatch: <filter> // optional - filter during traversal
  }
}
```

## Example 1 - Employee Reporting Hierarchy

Data model:

```javascript
db.employees.insertMany([
  { _id: "alice", name: "Alice", reportsTo: null, title: "CEO" },
  { _id: "bob",   name: "Bob",   reportsTo: "alice", title: "VP Engineering" },
  { _id: "carol", name: "Carol", reportsTo: "bob",   title: "Engineering Manager" },
  { _id: "dave",  name: "Dave",  reportsTo: "carol", title: "Senior Engineer" },
  { _id: "eve",   name: "Eve",   reportsTo: "bob",   title: "QA Lead" }
]);
```

Find all people who report (directly or indirectly) to Alice:

```javascript
db.employees.aggregate([
  { $match: { _id: "alice" } },
  {
    $graphLookup: {
      from: "employees",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "reportsTo",
      as: "directReports",
      depthField: "depth"
    }
  },
  {
    $project: {
      name: 1,
      directReports: { $sortArray: { input: "$directReports", sortBy: { depth: 1 } } }
    }
  }
]);
```

## Example 2 - Ancestor Chain (Bottom-Up)

Find all managers above a given employee:

```javascript
db.employees.aggregate([
  { $match: { _id: "dave" } },
  {
    $graphLookup: {
      from: "employees",
      startWith: "$reportsTo",
      connectFromField: "reportsTo",
      connectToField: "_id",
      as: "managementChain",
      depthField: "level"
    }
  }
]);
```

## Example 3 - Category Tree

```javascript
db.categories.insertMany([
  { _id: "electronics", name: "Electronics", parent: null },
  { _id: "computers",   name: "Computers",   parent: "electronics" },
  { _id: "laptops",     name: "Laptops",     parent: "computers" },
  { _id: "gaming",      name: "Gaming",      parent: "computers" }
]);

// Find all subcategories of Electronics
db.categories.aggregate([
  { $match: { _id: "electronics" } },
  {
    $graphLookup: {
      from: "categories",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "parent",
      as: "subcategories",
      maxDepth: 5,
      depthField: "depth"
    }
  }
]);
```

## Limiting Traversal Depth

Use `maxDepth` to prevent runaway queries on deep graphs:

```javascript
$graphLookup: {
  from: "employees",
  startWith: "$_id",
  connectFromField: "_id",
  connectToField: "reportsTo",
  as: "reports",
  maxDepth: 3  // only go 3 levels deep
}
```

`maxDepth: 0` returns only the direct connections (equivalent to a simple `$lookup`).

## Filtering Results During Traversal

`restrictSearchWithMatch` applies a filter at each traversal step, pruning paths early:

```javascript
$graphLookup: {
  from: "employees",
  startWith: "$_id",
  connectFromField: "_id",
  connectToField: "reportsTo",
  as: "activeReports",
  restrictSearchWithMatch: { status: "active" }  // only follow active employees
}
```

## Performance Considerations

`$graphLookup` can be memory-intensive. MongoDB allows it to use up to 100MB of RAM by default. For large graphs, add `allowDiskUse: true`:

```javascript
db.employees.aggregate(
  [ /* pipeline */ ],
  { allowDiskUse: true }
);
```

Create indexes on the `connectToField` to speed up traversal:

```javascript
db.employees.createIndex({ reportsTo: 1 });
db.categories.createIndex({ parent: 1 });
```

## When Not to Use $graphLookup

- For very large graphs (millions of nodes), consider a dedicated graph database
- For densely connected or cyclic graphs, `$graphLookup` skips already-visited documents to avoid infinite loops, but the total number of matched documents can still be large, leading to high memory usage
- For simple one-level joins, use regular `$lookup` instead

## Summary

`$graphLookup` enables recursive graph traversal within MongoDB collections by repeatedly matching `connectFromField` to `connectToField`. It is the right tool for organizational hierarchies, category trees, and friend networks where the depth of relationships is variable and unknown at query time. Always index the `connectToField`, set a reasonable `maxDepth`, and enable `allowDiskUse` for large datasets.
