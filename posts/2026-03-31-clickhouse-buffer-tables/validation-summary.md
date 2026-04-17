# Validation Summary: How to Use Buffer Tables to Absorb Write Spikes in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse Buffer table engine
- ClickHouse MergeTree / ReplicatedMergeTree
- ClickHouse async_insert feature
- SQL

## Sources Consulted
- ClickHouse Buffer engine docs: https://clickhouse.com/docs/engines/table-engines/special/buffer
- ClickHouse async_insert docs and settings: https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse source: `src/Storages/StorageBuffer.cpp` — confirms `optimize()` calls `flushAllBuffers`
- GitHub Issue #8226 — "Way to force Buffer flush"
- GitHub Issue #71694 — "RFC: Rework Buffer Tables" (Nov 2024)
- GitHub PR #60111 — parallel Buffer flush
- ClickHouse `system.tables` reference for `total_rows` / `total_bytes` on Buffer tables

## Issues Found
1. **Async insert characterization was incorrect.** The intro claimed async inserts "buffer per session." In reality, async inserts are server-side and grouped by query shape + settings + user, shared across clients issuing matching INSERT queries. Updated the introduction and the comparison table to describe this accurately.
2. **Comparison table cell "Server-side, per-session" for async inserts** was wrong for the same reason above. Changed to "Server-side, grouped per query shape + settings" and the Buffer cell to "Server-side, shared per destination table" for clarity.
3. **Deduplication advice was misleading.** The original text suggested that if deduplication is needed, one could just use `ReplicatedMergeTree` on the destination. Per the official ClickHouse Buffer docs, Buffer tables actually **break** `ReplicatedMergeTree` insert deduplication because the flush randomizes block order and sizes, so the dedup block hash no longer matches. Rewrote the bullet to warn against using Buffer tables when exactly-once writes are required.

## Review Notes
- `OPTIMIZE TABLE buffer_table` as a manual flush mechanism is correct in current versions. `StorageBuffer::optimize()` in the source explicitly calls `flushAllBuffers`, and this is the community-standard way. Left as-is.
- The Buffer engine parameter list, flush semantics (all mins AND / any max OR), transparent querying over buffer + destination, graceful shutdown flush, and the loss-on-crash limitation are all accurately described.
- The post recommends `num_layers` equal to CPU core count. The official docs specifically recommend `16`, not "CPU core count," but 16 is a reasonable approximation for modern servers and this is a pragmatic heuristic rather than a technical error. Left as-is.
- The schema-change guidance ("drop and recreate the Buffer table after ALTER on destination") matches the official recommendation in ClickHouse docs. Newer versions handle some ALTERs more gracefully, but drop-and-recreate is still the documented safe path.
- GitHub Issue #71694 (Nov 2024) discusses deprecating/reworking Buffer tables in favor of async_insert. The post already flags async inserts as the preferred path for modern clients, which aligns well with the direction of the project.
- The per-layer threshold semantic (thresholds apply per layer, so real memory ceiling is `num_layers × max_bytes`) is not stated explicitly in the post. A future revision could call this out to help readers size `max_bytes` correctly — not a technical error, but a useful clarification.
