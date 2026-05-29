# Validation Summary: How to Avoid Hotspots in Cloud Spanner with Proper Primary Key Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Spanner
- GoogleSQL DDL
- Spanner primary key design
- Spanner split and hotspot statistics
- Google Cloud CLI
- Python
- UUID v4

## Sources Consulted
- Cloud Spanner schema design best practices: https://docs.cloud.google.com/spanner/docs/schema-design
- Cloud Spanner primary key default values management: https://docs.cloud.google.com/spanner/docs/primary-key-default-value
- Cloud Spanner create and manage sequences: https://docs.cloud.google.com/spanner/docs/sequence-tasks
- Cloud Spanner split statistics: https://docs.cloud.google.com/spanner/docs/introspection/hot-split-statistics
- Cloud Spanner transaction statistics: https://docs.cloud.google.com/spanner/docs/introspection/transaction-statistics
- Cloud Spanner emulator documentation: https://docs.cloud.google.com/spanner/docs/emulator
- gcloud spanner databases execute-sql reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/execute-sql
- gcloud emulators spanner start reference: https://docs.cloud.google.com/sdk/gcloud/reference/emulators/spanner/start

## Issues Found
- The original bit-reversal Python example produced unsigned 64-bit values such as `9223372036854775808`, which exceed Spanner's signed `INT64` range. Replaced the example with Spanner's built-in `bit_reversed_positive` sequence DDL.
- The original text said bit reversal preserves ordering. Bit-reversed generated IDs preserve uniqueness and distribution, not monotonic ordering. Updated the wording and decision flow accordingly.
- The hash-shard example used `num_shards=1000` without qualification. Added guidance to choose shard count based on expected scale and node count, and reduced the example default.
- The hotspot detection command queried transaction statistics by commit latency, which is not the direct hot split diagnostic. Replaced it with a `SPANNER_SYS.SPLIT_STATS_TOP_10MINUTE` query using `CPU_USAGE_SCORE`.
- The interleaved table section implied a distributed parent key always makes children distributed. Clarified that this is true when writes are spread across many parents, while a single very hot parent can still need mitigation.
- The testing section suggested using the Spanner emulator for load testing. Updated it to state that the emulator is for local functional testing and that real Spanner instances should be used for performance and hotspot validation.

## Review Notes
The remaining examples are intentionally simplified GoogleSQL examples. UUID v4, hash-prefix keys, avoiding monotonic leading key columns, and using hot split statistics are consistent with current Cloud Spanner documentation.
