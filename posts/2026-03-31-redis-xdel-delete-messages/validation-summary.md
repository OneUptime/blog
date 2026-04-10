# Validation Summary: How to Use XDEL in Redis Streams to Delete Messages

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis Streams
- XDEL command
- XRANGE, XLEN, XACK, XAUTOCLAIM, XTRIM (related commands)
- Consumer Groups and PEL (Pending Entries List)

## Sources Consulted
- Redis official documentation for XDEL: https://redis.io/docs/latest/commands/xdel/
- Redis official documentation for XAUTOCLAIM: https://redis.io/docs/latest/commands/xautoclaim/
- Redis official documentation for XACK: https://redis.io/docs/latest/commands/xack/
- Redis official documentation for XTRIM: https://redis.io/docs/latest/commands/xtrim/

## Issues Found

### Issue 1 (Medium): Misleading memory reclamation advice
**What was wrong:** The Memory Considerations section stated "To fully compact memory, follow XDEL with XTRIM," implying XTRIM cleans up tombstones left by XDEL anywhere in the stream. In reality, XTRIM only evicts entries from the head of the stream (by MAXLEN or MINID). It cannot target tombstones from XDEL operations on entries in the middle of the stream. Memory for deleted entries is reclaimed only when all entries in the same macro-node are deleted.
**What was changed:** Rewrote the section to accurately explain macro-node-based memory reclamation and clarified that XTRIM only helps if deleted entries are near the head of the stream. Added a note that XTRIM does not target mid-stream tombstones.

### Issue 2 (Low): Missing Redis version note for XAUTOCLAIM behavior
**What was wrong:** The post stated that "XAUTOCLAIM will return deleted PEL entries in its third return value" without noting this is a Redis 7.0+ feature. Before Redis 7.0, XAUTOCLAIM did not return this third array element for deleted entries.
**What was changed:** Added "In Redis 7.0+" qualifier and noted that XAUTOCLAIM also automatically removes these entries from the PEL.

### Issue 3 (Low): Misleading summary about tombstone cleanup
**What was wrong:** The summary stated "deleted entries leave tombstones until the stream is trimmed," which reinforces the incorrect implication that XTRIM is the general solution for tombstone cleanup.
**What was changed:** Updated to "deleted entries leave tombstones until all entries in the same macro-node are removed," which accurately reflects Redis's internal memory management.

## Review Notes
- The claim that XACK succeeds on a deleted message still in the PEL is architecturally sound (XACK operates on the PEL, not the stream data) and widely accepted, but is not explicitly documented in the official Redis XACK documentation. The current wording is acceptable.
- The syntax, return values, and code examples for XDEL are all correct per official documentation.
- The mermaid diagram accurately represents the conceptual behavior of XDEL.
