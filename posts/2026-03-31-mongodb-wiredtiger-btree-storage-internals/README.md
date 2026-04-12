# How WiredTiger B-Tree Storage Works Under the Hood in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, B-Tree, Storage Engine, Internal

Description: Understand how WiredTiger uses B-tree data structures to store MongoDB collections and indexes, and how this affects query performance and write amplification.

---

WiredTiger stores all MongoDB collection data and indexes using B-tree (specifically B+-tree) data structures on disk. Understanding how this works helps you make better decisions about index design, document size, and read/write performance trade-offs.

## What Is a B-Tree in WiredTiger?

A B+-tree organizes data in a sorted, balanced tree where:
- **Internal nodes** contain keys and pointers to child pages
- **Leaf nodes** contain the actual data records
- All data lives at the leaf level
- Leaf nodes are linked for efficient range scans

For MongoDB collections, the key is an internal RecordId (a 64-bit integer). The `_id` index is a separate B-tree that maps `_id` values to RecordIds. For secondary indexes, the key is the indexed field value plus the RecordId for uniqueness.

```text
Root Page
  |-- Internal Page [a - m]
  |     |-- Leaf Page [a, b, c, d]
  |     |-- Leaf Page [e, f, g, h]
  |     |-- Leaf Page [i, j, k, l, m]
  |-- Internal Page [n - z]
        |-- Leaf Page [n, o, p, q]
        |-- ...
```

## Page Size

WiredTiger's default maximum page size is 32 KB for leaf pages (`leaf_page_max`) and 4 KB for internal pages (`internal_page_max`).

```javascript
// Check WiredTiger config for a collection
db.runCommand({ collStats: "orders" }).wiredTiger.creationString
```

## How Writes Work

When you insert or update a document:

1. The in-memory B-tree page is located
2. The new version is written to the page in memory (as an MVCC update)
3. The journal records the write
4. The background reconciler periodically writes modified pages back to disk

This is a **copy-on-write** pattern - WiredTiger never overwrites data in place. Modified pages are written to new locations, and the tree pointers are updated.

## Write Amplification

Because WiredTiger uses copy-on-write, a single document update causes:
1. The modified leaf page to be written to disk
2. Its parent internal page to be updated (new pointer)
3. Potentially the grandparent, up to the root

This is **write amplification**. On SSDs it is acceptable, but on spinning disks it causes significant random I/O.

```text
Document Update -> Leaf Write -> Internal Page Write -> Root Write
                 = 1 logical write * amplification factor
```

## How Reads Work

A query traverses the B-tree from root to leaf:

```text
Query: { _id: "order-12345" }
  1. Load root page from cache (or disk)
  2. Compare key against index boundaries
  3. Follow pointer to internal page
  4. Follow pointer to leaf page
  5. Return matching record
```

For a balanced B-tree with N records, this takes O(log N) disk reads. With the WiredTiger cache, root and internal pages are almost always hot, reducing effective I/O to one or zero disk reads for most queries.

## Compaction and Page Fill Factor

Over time, deletions and updates create fragmented pages with wasted space. Run compact to consolidate:

```javascript
db.runCommand({ compact: "orders" });
```

This rewrites the B-tree, reclaims space, and improves read locality. Schedule this during maintenance windows.

## Index B-Trees

Every MongoDB index is a separate B-tree. An index on `{ email: 1 }` stores `(email_value, _id)` pairs as keys, sorted by email. This allows:
- Efficient equality lookups: O(log N)
- Efficient range scans: O(log N + K) where K is the result size

```javascript
// Covered query uses only the index B-tree - no collection B-tree access
db.users.find({ email: "alice@example.com" }, { email: 1, _id: 0 });
```

## Summary

WiredTiger uses B+-trees for both collection storage and indexes, organizing data in sorted pages that allow O(log N) lookups and efficient range scans. Writes use a copy-on-write mechanism that avoids in-place updates but introduces write amplification. The WiredTiger cache keeps hot pages (especially root and internal nodes) in memory, minimizing disk I/O for common access patterns. Run compact periodically to reclaim fragmented space and restore read locality.
