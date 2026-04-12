# Validation Summary: How to Use Write Concern w:1 in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (write concern configuration)
- MongoDB Node.js Driver
- MongoDB Shell (mongosh)
- Replica Sets

## Sources Consulted
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB 5.0 Release Notes (default write concern change): https://www.mongodb.com/docs/manual/release-notes/5.0/
- MongoDB Connection String URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

### 1. Incorrect claim that w:1 is MongoDB's default write concern
- **What was wrong:** The post stated "w:1 is MongoDB's default write concern" without qualification. Since MongoDB 5.0 (released July 2021), the default write concern for replica sets and sharded clusters is `w: "majority"`, not `w:1`. Only standalone instances still default to `w:1`.
- **What was changed:** Updated the introduction and "Default Behavior" section to clarify the version-dependent default. The "Default Behavior" section now notes that the equivalence only applied before MongoDB 5.0, and that on 5.0+ replica sets, `w:1` must be specified explicitly.
- **Why:** This is a significant behavioral difference that could mislead readers into thinking their writes are using `w:1` when they are actually using `w: "majority"` on modern MongoDB deployments.

### 2. Incorrect description of what w:1 writes to ("in-memory journal")
- **What was wrong:** The post described `w:1` as writing "to its in-memory journal" and later said the guarantee is that data "has been written to the primary's in-memory journal (or data files)." The journal is an on-disk write-ahead log, not an in-memory structure. `w:1` acknowledges after the write is applied to in-memory data structures, without guaranteeing journal persistence.
- **What was changed:** Changed "written the data to its in-memory journal" to "applied the write to its in-memory data structures." Updated the guarantees list similarly.
- **Why:** Conflating in-memory acknowledgment with journal writes misrepresents the durability semantics. The distinction is critical because the journal (`j: true`) is the mechanism that provides on-disk durability, and readers need to understand that `w:1` alone does not involve the journal.

### 3. Incorrect claim about "best" throughput
- **What was wrong:** The post stated "`w:1` offers the best write throughput among all write concerns." However, `w:0` (fire-and-forget/unacknowledged) has higher throughput since it doesn't wait for any acknowledgment. The post's own throughput comparison table correctly showed `w:0` as "Highest."
- **What was changed:** Changed "best write throughput among all write concerns" to "high write throughput" and similar phrasing in the summary.
- **Why:** Self-contradictory claims undermine the post's credibility and could confuse readers about the write concern hierarchy.

## Review Notes
- The `j: true` section is correct: it accurately explains that journaling survives a primary restart but not an election where the write wasn't replicated.
- The Node.js driver example uses correct syntax and API. Note that `await client.connect()` is technically optional in newer driver versions (4.0+) since operations auto-connect, but including it is not wrong and is still a common pattern.
- The rollback risk explanation is accurate and well-presented.
- The throughput comparison table is correct and helpful.
- The use-case guidance (when to use vs. avoid) is sound.
