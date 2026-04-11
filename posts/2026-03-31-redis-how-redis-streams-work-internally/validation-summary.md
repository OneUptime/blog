# Validation Summary: How Redis Streams Work Internally

## Status
validated

## Post Type
Technical deep-dive / Reference

## Technologies Covered
- Redis Streams
- Radix tree (rax) data structure
- Listpack encoding
- Consumer groups and PEL
- XADD, XLEN, XRANGE, XTRIM, XINFO, XPENDING commands

## Sources Consulted
- Redis official documentation for XINFO STREAM: https://redis.io/docs/latest/commands/xinfo-stream/
- Redis official documentation for Streams: https://redis.io/docs/latest/develop/data-types/streams/
- antirez listpack specification: https://github.com/antirez/listpack/blob/master/listpack.md
- Redis source code (listpack.c): https://github.com/redis/redis/blob/unstable/src/listpack.c

## Issues Found

### 1. Listpack element structure (incorrect order and description)
**What was wrong:** The post described listpack elements as storing: (1) encoding byte, (2) previous element length, (3) actual content. This was incorrect in two ways: the order was wrong (content comes before the back-length), and the field is the current entry's own back-length, not the previous element's length. The "previous element length" design was from the old ziplist format; listpack deliberately changed this to store each entry's own length at its end, eliminating the cascading update problem that plagued ziplist.

**What was changed:** Corrected to: (1) encoding byte, (2) actual content (data bytes), (3) back-length of the current entry (for backward traversal).

### 2. XINFO STREAM field descriptions swapped
**What was wrong:** The descriptions for `radix-tree-keys` and `radix-tree-nodes` were swapped. The post said `radix-tree-keys` was "Number of radix tree nodes" and `radix-tree-nodes` was "Total listpack nodes allocated."

**What was changed:** Corrected `radix-tree-keys` to "Number of keys in the radix tree (each key maps to a listpack node)" and `radix-tree-nodes` to "Number of internal nodes in the radix tree data structure."

## Review Notes
- The PEL is described as a "dictionary" — it is actually implemented as a rax (radix tree) in Redis source code. This is a minor abstraction that is acceptable for a blog post audience, so it was not changed.
- The post correctly notes that listpack replaced ziplist for stream encoding; this is accurate for Redis 7.0+.
- All Redis commands shown (XADD, XLEN, XRANGE, XTRIM, XINFO, XPENDING, CONFIG GET/SET, OBJECT ENCODING, MEMORY USAGE, DEBUG OBJECT) use correct syntax.
- The default values for `stream-node-max-bytes` (4096) and `stream-node-max-entries` (100) are correct.
- The complexity claims (O(1) for XLEN, O(log N) for insertion, O(1) amortized for append) are accurate.
