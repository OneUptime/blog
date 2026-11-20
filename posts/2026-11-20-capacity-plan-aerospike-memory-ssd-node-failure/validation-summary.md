# Validation summary

## Checks

Executed the exact Python calculator extracted from the article with Python 3.15.0. Checked five-node byte totals independently, verified 20% six-to-five-node scaling within rounding tolerance, and exercised the insufficient-node guard. Matched the displayed GiB results to actual output. Reviewed replication, tombstones, allocation overhead, device headroom, and the distinction between byte sizing and workload capacity. Generated and visually inspected the 1280x720 social image; text is readable and unclipped.

## Limitations

No Aerospike workload, hardware benchmark, or failure rehearsal was performed. The model uses hypothetical sizes and distribution allowance. It estimates primary-index entries and data capacity only; the article explicitly requires additional memory structures, indexes, reserved storage, caches, and operational headroom.

## Sources

- https://aerospike.com/docs/develop/data-modeling/record-sizing/
- https://aerospike.com/docs/database/learn/architecture/durable-deletes/
- https://aerospike.com/docs/database/manage/namespace/durability/
- https://aerospike.com/docs/database/manage/planning/capacity/
- https://aerospike.com/docs/develop/data-modeling/indexes/
- https://aerospike.com/docs/database/observe/index-memory-allocation/
- https://aerospike.com/docs/database/learn/best-practices/
- https://aerospike.com/docs/database/reference/faq/ops-disk-defrag/
- https://aerospike.com/docs/database/manage/planning/ssd/advanced-sizing/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
