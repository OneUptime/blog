# Validation Summary: How to Use Stale Reads in Cloud Spanner to Reduce Latency

## Status
validated

## Post Type
Tutorial / Performance guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner timestamp bounds
- Python Google Cloud Spanner client
- Go Google Cloud Spanner client
- Java Google Cloud Spanner client

## Sources Consulted
- Google Cloud Spanner timestamp bounds documentation: https://docs.cloud.google.com/spanner/docs/timestamp-bounds
- Google Cloud Spanner reads documentation: https://docs.cloud.google.com/spanner/docs/reads
- Python Cloud Spanner `Snapshot` reference: https://cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.snapshot.Snapshot
- Go Cloud Spanner client reference: https://docs.cloud.google.com/go/docs/reference/cloud.google.com/go/spanner/latest
- Java Cloud Spanner `DatabaseClient` reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.DatabaseClient
- Java Cloud Spanner `TimestampBound` reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.TimestampBound

## Issues Found
- Exact staleness was described as reading data "at most" a duration old. Changed this to "exactly" stale, because `exact_staleness` executes reads at a timestamp that is the specified duration old.
- The bounded staleness section described only `min_read_timestamp`. Updated the section to explain that bounded staleness can use either a maximum staleness duration or a minimum read timestamp.
- Several strong-read and stale-read latency claims were too absolute. Softened them to match Google Cloud's documented "typically" and "usually" behavior for leader coordination and nearby replica reads.
- The Go sample comment described exact staleness as a tolerance and stated that the read is always served without a leader check. Updated the wording to match exact-staleness semantics and documented replica behavior.
- The Java sample used `singleUseReadOnlyTransaction()` inside a try-with-resources block. Updated it to use `dbClient.singleUse(bound).readRow(...)`, which matches the official single-use stale read pattern.
- The Python benchmark snippet used `datetime` and `spanner` without importing them and used an off-by-one p99 index calculation. Added the missing imports and corrected the p99 index.

## Review Notes
The post is technically relevant and accurate after the fixes. The numeric latency examples remain illustrative rather than guaranteed, which is appropriate for a performance guide because observed latency depends on instance configuration, replica placement, workload, and client location.
