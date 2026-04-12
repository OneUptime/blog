# How to Implement the Tree Pattern in MongoDB (Materialized Paths)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Tree Pattern, Materialized Path, Schema Design, Hierarchical Data

Description: Learn how to model tree structures in MongoDB using the Materialized Paths pattern, enabling efficient subtree queries with a single string field.

---

## What Is the Materialized Paths Pattern?

The Materialized Paths pattern stores the full path from the root to each node as a single string field. Instead of computing ancestry at query time, the path is encoded directly in the document, enabling fast prefix-based searches for subtrees and ancestors.

This approach trades a small amount of write complexity for extremely fast read performance on hierarchical queries.

## When to Use Materialized Paths

Use this pattern when:
- You need to display breadcrumb navigation
- Subtree queries are frequent and must be fast
- The tree is read-heavy and write-light
- You want to avoid recursive queries or `$graphLookup`

Avoid this pattern when nodes are moved frequently, since all descendants require path updates.

## Document Structure

Each document stores a `path` field containing the ancestor chain separated by a delimiter:

```javascript
db.categories.insertMany([
  { _id: 1, name: "Electronics",     path: ",1," },
  { _id: 2, name: "Computers",       path: ",1,2," },
  { _id: 3, name: "Laptops",         path: ",1,2,3," },
  { _id: 4, name: "Gaming Laptops",  path: ",1,2,3,4," },
  { _id: 5, name: "Phones",          path: ",1,5," },
  { _id: 6, name: "Smartphones",     path: ",1,5,6," }
]);
```

The leading and trailing commas make it easy to write unambiguous prefix queries (e.g., `,1,2,` won't accidentally match `,1,20,`).

## Finding All Descendants

Use a regex prefix match to get all nodes under a subtree in a single query:

```javascript
// All descendants of "Computers" (path starts with ",1,2,")
db.categories.find({ path: /^,1,2,/ });
// Returns: Computers, Laptops, Gaming Laptops (includes the node itself)
```

## Finding All Ancestors

To find all ancestors of a node, split the path and query by IDs:

```javascript
const node = db.categories.findOne({ _id: 4 }); // Gaming Laptops
const ancestorIds = node.path
  .split(",")
  .filter(id => id !== "" && id !== String(node._id))
  .map(Number);

db.categories.find({ _id: { $in: ancestorIds } });
// Returns: Electronics, Computers, Laptops
```

## Finding Direct Children

To find only immediate children, use a regex that matches exactly one additional level:

```javascript
// Direct children of "Computers" (id: 2, path: ",1,2,")
db.categories.find({ path: /^,1,2,[^,]+,$/ });
// Returns: Laptops only (not Gaming Laptops)
```

## Creating an Index for Path Queries

Index the path field to make prefix queries fast:

```javascript
db.categories.createIndex({ path: 1 });
```

For text-based path searches, a partial text approach works, but a regular index on path combined with regex queries is most efficient for this pattern.

## Inserting a New Node

When inserting a child, construct its path from the parent's path:

```javascript
async function insertChild(db, parentId, newNodeId, newNodeName) {
  const parent = await db.categories.findOne({ _id: parentId });
  const newPath = parent.path + newNodeId + ",";

  await db.categories.insertOne({
    _id: newNodeId,
    name: newNodeName,
    path: newPath
  });
}

await insertChild(db, 3, 7, "Ultrabooks");
// Ultrabooks gets path: ",1,2,3,7,"
```

## Moving a Subtree

Moving a subtree requires updating the path of the subtree root and all descendants:

```javascript
async function moveSubtree(db, nodeId, newParentId) {
  const node = await db.categories.findOne({ _id: nodeId });
  const newParent = await db.categories.findOne({ _id: newParentId });

  const oldPathPrefix = node.path;
  const newPathPrefix = newParent.path + nodeId + ",";

  // Update the node itself
  await db.categories.updateOne(
    { _id: nodeId },
    { $set: { path: newPathPrefix } }
  );

  // Update all descendants using a regex replace
  const descendants = await db.categories
    .find({ path: new RegExp("^" + oldPathPrefix.replace(/,/g, "\\,")) })
    .toArray();

  for (const desc of descendants) {
    const updatedPath = desc.path.replace(oldPathPrefix, newPathPrefix);
    await db.categories.updateOne(
      { _id: desc._id },
      { $set: { path: updatedPath } }
    );
  }
}
```

## Counting Depth

The depth of any node can be derived from its path without extra queries:

```javascript
function getDepth(path) {
  // Count non-empty segments between the delimiters
  return path.split(",").filter(s => s !== "").length;
}

getDepth(",1,2,3,4,"); // Returns 4
```

## Materialized Paths vs. Other Tree Patterns

| Operation | Materialized Paths | Parent References | Nested Sets |
|---|---|---|---|
| Subtree query | Fast (regex) | Slow (recursive) | Fast |
| Ancestor query | Fast (split + in) | Slow (recursive) | Fast |
| Insert | Fast | Fast | Slow |
| Move subtree | Medium (multi-update) | Fast (one update) | Slow |

## Summary

The Materialized Paths pattern encodes the full ancestry chain in each document, enabling single-query subtree and ancestor lookups using regex prefix matching. It is the best choice for read-heavy hierarchical data like category trees, org charts, and content taxonomies. Write operations involving subtree moves are more expensive but manageable with bulk updates.
