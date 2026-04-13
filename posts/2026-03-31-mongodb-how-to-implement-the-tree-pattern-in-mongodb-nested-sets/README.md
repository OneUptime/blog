# How to Implement the Tree Pattern in MongoDB (Nested Sets)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Tree Pattern, Nested Set, Hierarchical Data

Description: Learn how to implement the nested sets tree pattern in MongoDB to enable efficient subtree queries and ancestor lookups using left and right boundary values.

---

## What Is the Nested Sets Pattern?

The nested sets pattern represents a tree by assigning each node a left (`lft`) and right (`rgt`) value such that a node's descendants are those whose `lft` and `rgt` values fall within the parent's range. This enables O(1) subtree queries using simple range comparisons.

## Assigning Left and Right Values

Perform a depth-first traversal of the tree, incrementing a counter as you enter (left) and exit (right) each node:

```text
Electronics (lft=1, rgt=12)
  Laptops (lft=2, rgt=7)
    Gaming Laptops (lft=3, rgt=4)
    Business Laptops (lft=5, rgt=6)
  Phones (lft=8, rgt=11)
    Smartphones (lft=9, rgt=10)
```

## Data Structure

```javascript
db.categories.insertMany([
  { name: "Electronics",       lft: 1,  rgt: 12 },
  { name: "Laptops",           lft: 2,  rgt: 7  },
  { name: "Gaming Laptops",    lft: 3,  rgt: 4  },
  { name: "Business Laptops",  lft: 5,  rgt: 6  },
  { name: "Phones",            lft: 8,  rgt: 11 },
  { name: "Smartphones",       lft: 9,  rgt: 10 }
])
```

## Indexes for Nested Sets

```javascript
db.categories.createIndex({ lft: 1 })
db.categories.createIndex({ rgt: 1 })
db.categories.createIndex({ lft: 1, rgt: 1 })
```

## Querying the Tree

### Find All Descendants of a Node

```javascript
// Find all descendants of Laptops (lft=2, rgt=7)
const laptops = db.categories.findOne({ name: "Laptops" });

db.categories.find({
  lft: { $gt: laptops.lft },
  rgt: { $lt: laptops.rgt }
}).sort({ lft: 1 })
// Returns: Gaming Laptops, Business Laptops
```

### Find All Ancestors of a Node

```javascript
// Find all ancestors of Gaming Laptops (lft=3, rgt=4)
const gamingLaptops = db.categories.findOne({ name: "Gaming Laptops" });

db.categories.find({
  lft: { $lt: gamingLaptops.lft },
  rgt: { $gt: gamingLaptops.rgt }
}).sort({ lft: 1 })
// Returns: Electronics, Laptops (the breadcrumb path)
```

### Find Direct Children Only

```javascript
// Direct children have no intermediate ancestor within the parent's range
// This requires knowing the depth, or a more complex query
// Easier with depth field added to each node:

db.categories.insertMany([
  { name: "Electronics", lft: 1, rgt: 12, depth: 0 },
  { name: "Laptops",     lft: 2, rgt: 7,  depth: 1 },
])

// Direct children of Electronics (depth = parent depth + 1)
const electronics = db.categories.findOne({ name: "Electronics" });
db.categories.find({
  lft: { $gt: electronics.lft },
  rgt: { $lt: electronics.rgt },
  depth: electronics.depth + 1
})
```

### Find the Subtree Size

```javascript
// Number of descendants = (rgt - lft - 1) / 2
function subtreeSize(node) {
  return (node.rgt - node.lft - 1) / 2;
}

const laptops = db.categories.findOne({ name: "Laptops" });
console.log(subtreeSize(laptops)); // 2
```

## Inserting a New Node

Inserting a node requires updating `lft` and `rgt` values for all affected nodes - this is the main disadvantage of nested sets:

```javascript
async function insertNode(parentName, newNodeName) {
  const parent = await db.categories.findOne({ name: parentName });
  const newLft = parent.rgt;
  const newRgt = parent.rgt + 1;

  // Shift all nodes to the right of the insertion point
  await db.categories.updateMany(
    { rgt: { $gte: parent.rgt } },
    { $inc: { rgt: 2 } }
  );
  await db.categories.updateMany(
    { lft: { $gte: parent.rgt } },
    { $inc: { lft: 2 } }
  );

  // Insert the new node
  await db.categories.insertOne({
    name: newNodeName,
    lft: newLft,
    rgt: newRgt
  });
}
```

## Removing a Leaf Node

```javascript
async function removeLeaf(nodeName) {
  const node = await db.categories.findOne({ name: nodeName });
  if (node.rgt - node.lft !== 1) throw new Error("Not a leaf node");

  await db.categories.deleteOne({ _id: node._id });

  // Shift remaining nodes left
  await db.categories.updateMany(
    { rgt: { $gt: node.rgt } },
    { $inc: { rgt: -2 } }
  );
  await db.categories.updateMany(
    { lft: { $gt: node.rgt } },
    { $inc: { lft: -2 } }
  );
}
```

## Trade-offs

```text
Operation           | Nested Sets Complexity
--------------------|------------------------
Find all descendants| O(1) - range query
Find all ancestors  | O(1) - range query
Insert a node       | O(n) - update all shifted nodes
Delete a leaf       | O(n) - update all shifted nodes
Move a subtree      | O(n) - complex restructure
```

## When to Use Nested Sets

- Category hierarchies that are read-heavy and rarely restructured
- Breadcrumb navigation (ancestor lookup)
- Rendering full subtrees in sorted order
- Trees that are imported or rebuilt in bulk

## Summary

The nested sets pattern uses left and right boundary values to represent tree structure, enabling extremely efficient subtree and ancestor queries using simple range conditions. It excels in read-heavy scenarios like category navigation and breadcrumbs. The trade-off is that insertions and deletions require updating many nodes, so this pattern is best suited for trees that change infrequently or can be rebuilt periodically.
