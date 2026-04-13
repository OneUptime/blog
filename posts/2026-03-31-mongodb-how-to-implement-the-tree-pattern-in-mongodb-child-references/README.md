# How to Implement the Tree Pattern in MongoDB (Child References)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Tree Pattern, Hierarchical Data, Child References

Description: Learn how to implement hierarchical tree structures in MongoDB using the child references pattern, where each node stores an array of its direct children's IDs.

---

## What Is the Child References Pattern?

In the child references pattern, each node in the tree stores an array of its direct children's IDs. The parent node knows its children, but children do not store a reference to their parent.

This pattern is useful when you primarily navigate from parent to children (top-down traversal) and rarely need to find a node's parent.

## Data Structure

```javascript
// Category hierarchy: Electronics -> Laptops, Phones -> Gaming Laptops
{
  _id: ObjectId("n001"),
  name: "Electronics",
  children: [ObjectId("n002"), ObjectId("n003")]
}

{
  _id: ObjectId("n002"),
  name: "Laptops",
  children: [ObjectId("n004"), ObjectId("n005")]
}

{
  _id: ObjectId("n003"),
  name: "Phones",
  children: [ObjectId("n006")]
}

{
  _id: ObjectId("n004"),
  name: "Gaming Laptops",
  children: []
}

{
  _id: ObjectId("n005"),
  name: "Business Laptops",
  children: []
}

{
  _id: ObjectId("n006"),
  name: "Smartphones",
  children: []
}
```

## Basic Operations

### Finding Direct Children

```javascript
// Find direct children of Electronics
const electronics = db.categories.findOne({ name: "Electronics" });
const children = db.categories.find({ _id: { $in: electronics.children } }).toArray();
```

### Adding a Child

```javascript
// Add a new "Tablets" category under Electronics
const newTablets = await db.categories.insertOne({
  name: "Tablets",
  children: []
});

await db.categories.updateOne(
  { name: "Electronics" },
  { $push: { children: newTablets.insertedId } }
)
```

### Removing a Child

```javascript
// Remove a child by ID from parent
db.categories.updateOne(
  { name: "Electronics" },
  { $pull: { children: ObjectId("n003") } }
)
```

### Deleting a Subtree

```javascript
async function deleteSubtree(nodeId) {
  const node = await db.categories.findOne({ _id: nodeId });

  // Recursively delete children first
  for (const childId of node.children) {
    await deleteSubtree(childId);
  }

  // Delete the node itself
  await db.categories.deleteOne({ _id: nodeId });

  // Remove from parent's children array
  await db.categories.updateMany(
    { children: nodeId },
    { $pull: { children: nodeId } }
  );
}
```

## Traversing the Tree (BFS)

```javascript
async function getSubtree(rootId) {
  const result = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const node = await db.categories.findOne({ _id: currentId });
    if (node) {
      result.push(node);
      queue.push(...node.children);
    }
  }
  return result;
}

// Get all categories under Electronics
const subtree = await getSubtree(ObjectId("n001"));
```

## Finding the Path from Root to a Node

Since children don't store parent references, finding the path requires a full tree traversal or adding parent metadata:

```javascript
async function findPath(rootId, targetId) {
  const node = await db.categories.findOne({ _id: rootId });
  if (!node) return null;
  if (rootId.equals(targetId)) return [node];

  for (const childId of node.children) {
    const childPath = await findPath(childId, targetId);
    if (childPath) return [node, ...childPath];
  }
  return null;
}
```

## Indexing

```javascript
// Index children array for efficient lookups by child ID (to find parents)
db.categories.createIndex({ children: 1 })

// Index name for lookups
db.categories.createIndex({ name: 1 })
```

## When to Use Child References

```text
Good for:                          | Not ideal for:
-----------------------------------|-----------------------------------
Top-down navigation (parent->child)| Finding all ancestors of a node
Listing children quickly           | Querying all descendants efficiently
Trees with small fan-out           | Very deep trees (N+1 query problem)
Known tree depth (< 5 levels)      | Finding parent of a node quickly
```

## Comparison with Other Tree Patterns

```text
Pattern           | Find children | Find ancestors | Move subtree
------------------|---------------|----------------|-------------
Child references  | O(1)          | O(n)           | Moderate
Parent reference  | O(n)          | O(depth)       | Easy
Array of ancestors| O(1)          | O(1)           | Complex
Nested sets       | O(1)          | O(1)           | Complex
```

## Summary

The child references pattern stores each node's direct children as an array of IDs, making it efficient to retrieve children in a single query. It is ideal for top-down navigation, menu systems, and category hierarchies with known shallow depth. For finding ancestors or querying all descendants efficiently, consider the parent reference or materialized path patterns instead.
