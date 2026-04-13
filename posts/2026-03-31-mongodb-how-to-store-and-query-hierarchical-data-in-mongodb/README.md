# How to Store and Query Hierarchical Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Hierarchical Data, Tree structure, Schema Design, Aggregation

Description: Learn the main patterns for storing and querying hierarchical tree data in MongoDB including parent reference, materialized path, and path string approaches.

---

## Introduction

Hierarchical data such as category trees, org charts, comment threads, and folder structures requires careful schema design in MongoDB. Unlike relational databases with recursive CTEs, MongoDB uses document-oriented patterns to represent trees. The main patterns are: parent reference, array of ancestors (materialized path), and the path string approach. Each has different trade-offs for read vs write performance.

## Pattern 1 - Parent Reference

Each node stores a reference to its immediate parent. Simple to maintain, but querying descendants requires multiple round trips.

```javascript
// Category tree
db.categories.insertMany([
  { _id: 1, name: "Electronics", parentId: null },
  { _id: 2, name: "Computers", parentId: 1 },
  { _id: 3, name: "Phones", parentId: 1 },
  { _id: 4, name: "Laptops", parentId: 2 },
  { _id: 5, name: "Desktops", parentId: 2 }
]);
```

Query children of a node:

```javascript
// Get direct children of "Electronics" (id: 1)
db.categories.find({ parentId: 1 });
```

Get ancestors using `$graphLookup` (recursive):

```javascript
db.categories.aggregate([
  { $match: { _id: 4 } }, // Start from Laptops
  {
    $graphLookup: {
      from: "categories",
      startWith: "$parentId",
      connectFromField: "parentId",
      connectToField: "_id",
      as: "ancestors",
      maxDepth: 10
    }
  }
]);
// Returns Laptops, with ancestors: [Computers, Electronics]
```

## Using $graphLookup for Descendants

Find all descendants of a node:

```javascript
db.categories.aggregate([
  { $match: { _id: 1 } }, // Start from Electronics
  {
    $graphLookup: {
      from: "categories",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "parentId",
      as: "descendants"
    }
  }
]);
```

## Pattern 2 - Array of Ancestors (Materialized Path)

Store an array of all ancestor IDs with each node. Excellent for fast subtree queries.

```javascript
db.categories.insertMany([
  { _id: 1, name: "Electronics", ancestors: [], parentId: null },
  { _id: 2, name: "Computers", ancestors: [1], parentId: 1 },
  { _id: 3, name: "Phones", ancestors: [1], parentId: 1 },
  { _id: 4, name: "Laptops", ancestors: [1, 2], parentId: 2 },
  { _id: 5, name: "Desktops", ancestors: [1, 2], parentId: 2 }
]);

// Index for efficient subtree queries
db.categories.createIndex({ ancestors: 1 });
```

Get all descendants of Electronics (id: 1) in one query:

```javascript
db.categories.find({ ancestors: 1 });
// Returns Computers, Phones, Laptops, Desktops
```

Get all ancestors of a node:

```javascript
const laptops = db.categories.findOne({ _id: 4 });
db.categories.find({ _id: { $in: laptops.ancestors } });
```

## Adding a Node in Materialized Path

When inserting a new node, copy the parent's ancestors array and append the parent's ID:

```javascript
const parent = db.categories.findOne({ _id: 2 }); // Computers

db.categories.insertOne({
  _id: 6,
  name: "Gaming Laptops",
  parentId: 2,
  ancestors: [...parent.ancestors, 2]
  // ancestors: [1, 2]
});
```

## Pattern 3 - Path String (Materialized Path with String)

Store the full path as a dotted string for simple pattern matching:

```javascript
db.categories.insertMany([
  { _id: 1, name: "Electronics", path: "1" },
  { _id: 2, name: "Computers", path: "1.2" },
  { _id: 4, name: "Laptops", path: "1.2.4" }
]);

db.categories.createIndex({ path: 1 });

// Find all descendants of Electronics (path starts with "1.")
db.categories.find({ path: { $regex: /^1\./ } });

// Find depth of a node by counting dots
db.categories.aggregate([
  {
    $project: {
      name: 1,
      depth: {
        $size: { $split: ["$path", "."] }
      }
    }
  }
]);
```

## Full Tree Retrieval and Building Client-Side

Retrieve all nodes and build the tree in application code:

```javascript
const allCategories = await db.categories.find({}).toArray();

function buildTree(nodes, parentId = null) {
  return nodes
    .filter((n) => n.parentId === parentId)
    .map((node) => ({
      ...node,
      children: buildTree(nodes, node._id)
    }));
}

const tree = buildTree(allCategories);
```

## Moving a Subtree (Materialized Path)

When moving a node in the ancestors array pattern, update all descendants:

```javascript
async function moveNode(nodeId, newParentId) {
  const node = db.categories.findOne({ _id: nodeId });
  const newParent = db.categories.findOne({ _id: newParentId });

  const newAncestorPrefix = [...newParent.ancestors, newParentId];

  // Update the moved node
  db.categories.updateOne(
    { _id: nodeId },
    { $set: { parentId: newParentId, ancestors: newAncestorPrefix } }
  );

  // Update all descendants
  db.categories.find({ ancestors: nodeId }).forEach((descendant) => {
    const newAncestors = [
      ...newAncestorPrefix,
      ...descendant.ancestors.slice(
        descendant.ancestors.indexOf(nodeId)
      )
    ];
    db.categories.updateOne(
      { _id: descendant._id },
      { $set: { ancestors: newAncestors } }
    );
  });
}
```

## Pattern Comparison

```text
Pattern            | Read Speed | Write Speed | Move Subtree | Best For
-------------------|------------|-------------|--------------|-------------------
Parent Reference   | Slow       | Fast        | Fast         | Small trees, frequent moves
Array of Ancestors | Fast       | Medium      | Slow         | Large trees, read-heavy
Path String        | Fast       | Medium      | Slow         | Category breadcrumbs
```

## Summary

MongoDB's hierarchical data patterns each serve different use cases. The parent reference pattern with `$graphLookup` is best for trees requiring frequent structural changes. The array of ancestors pattern provides single-query subtree access with a straightforward index. Path string matching works well for breadcrumb display. Choose based on whether your workload is read-heavy (use ancestors array) or write-heavy with frequent tree restructuring (use parent reference).
