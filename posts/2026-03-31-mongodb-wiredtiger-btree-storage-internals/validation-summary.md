# Validation Summary: How WiredTiger B-Tree Storage Works Under the Hood in MongoDB

## Status
validated

## Post Type
Technical deep-dive / Internals guide

## Technologies Covered
- MongoDB
- WiredTiger storage engine
- B+-tree data structures
- MVCC (Multi-Version Concurrency Control)

## Sources Consulted
- WiredTiger official documentation: Tuning page size and compression (https://source.wiredtiger.com/develop/tune_page_size_and_comp.html)
- WiredTiger upgrade notes for default changes (https://source.wiredtiger.com/2.6.1/upgrading.html)
- MongoDB WiredTiger Storage Engine documentation (https://www.mongodb.com/docs/manual/core/wiredtiger/)
- MongoDB source code references: `wiredtiger_record_store.cpp`, `wiredtiger_index.cpp`, `key_string.h`
- MongoDB `compact` command documentation (https://www.mongodb.com/docs/manual/reference/command/compact/)

## Issues Found

1. **Collection B-tree key was described as `_id` — actually RecordId**: The post stated "For MongoDB collections, the key is the `_id` field by default." This is incorrect. The collection B-tree uses an internal 64-bit RecordId as the key (`key_format=q`). The `_id` index is a separate B-tree that maps `_id` values to RecordIds. Fixed to describe RecordId and clarify the `_id` index relationship.

2. **Index key uniqueness suffix was described as `_id` — actually RecordId**: The post stated indexes append "the `_id` for uniqueness." Non-unique indexes append the RecordId (not `_id`) to ensure B-tree key uniqueness. Fixed to use "RecordId."

3. **Leaf page size was wrong (4 KB stated, 32 KB correct)**: The post claimed "4 KB for leaf pages." WiredTiger's default `leaf_page_max` is 32 KB. Fixed.

4. **Internal page size was wrong (16 KB stated, 4 KB correct)**: The post claimed "16 KB for internal pages in older versions." WiredTiger's default `internal_page_max` has been 4 KB since v1.6.1 (was 2 KB before that, never 16 KB). Fixed.

5. **Fabricated parameter name `internalPageTargetSize`**: No such parameter exists in WiredTiger or MongoDB configuration. The correct parameter is `internal_page_max`. Fixed to use the correct parameter names.

## Review Notes
- The `collStats` command used in the post is deprecated as of MongoDB 6.0 in favor of the `$collStats` aggregation stage, but it still works. This is a minor point and was not changed.
- The copy-on-write and write amplification explanations are correct at a conceptual level, though in practice WiredTiger batches page writes during checkpoints, which mitigates the worst-case amplification described.
- The covered query example is correct — projecting `{ email: 1, _id: 0 }` with an index on `{ email: 1 }` avoids collection B-tree access.
