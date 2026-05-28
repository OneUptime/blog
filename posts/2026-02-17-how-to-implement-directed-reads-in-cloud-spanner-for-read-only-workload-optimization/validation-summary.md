# Validation Summary: How to Use Directed Reads in Cloud Spanner for Read-Only Workload Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Spanner directed reads
- Spanner multi-region replication
- Python Cloud Spanner client library
- Java Cloud Spanner client library
- Go Cloud Spanner client library

## Sources Consulted
- Google Cloud Spanner directed reads documentation: https://docs.cloud.google.com/spanner/docs/directed-reads
- Google Cloud Spanner replication documentation: https://cloud.google.com/spanner/docs/replication
- Google Cloud Spanner region types documentation: https://docs.cloud.google.com/spanner/docs/region-types
- Google Cloud Spanner pricing documentation: https://cloud.google.com/spanner/pricing
- Python Cloud Spanner `DirectedReadOptions` reference: https://cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.types.DirectedReadOptions
- Java Cloud Spanner `DirectedReadOptions` reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.spanner.v1.DirectedReadOptions
- Java Cloud Spanner `Options.directedRead` reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.Options
- Go Cloud Spanner package reference: https://pkg.go.dev/cloud.google.com/go/spanner

## Issues Found
- The post used "leader or follower" terminology for directed read replica selection. Spanner directed reads officially select by `READ_WRITE` or `READ_ONLY` replica type and/or location, so the wording and examples were updated to use those terms.
- The replication overview implied only leader and follower replica types. Spanner documents read-write, read-only, and witness replicas; read-write replicas can serve reads and can become leaders. The explanation and diagram labels were corrected.
- The post said default routing might send a European read to the US leader. This was too broad because read behavior depends on read type and routing. It was replaced with a more accurate statement about default routing and strong reads from non-leader replicas potentially communicating with the leader.
- The Go example used `client.Single().WithDirectedReadOptions(...)`, which is not the request-level API shown in current official samples. It was changed to `client.Single().QueryWithOptions(..., spanner.QueryOptions{DirectedReadOptions: ...})`.
- The stale-read limitation implied follower reads are inherently a few seconds old. Directed reads do not change consistency guarantees; strong reads remain strongly consistent and stale reads follow the requested timestamp bound. The limitation was corrected.

## Review Notes
The examples assume the chosen locations exist in the database's instance configuration. Directed reads are supported for read-only transactions and single reads in dual-region, multi-region, or custom regional configurations with optional read-only replicas; they are not supported for read-write transactions or partitioned DML.
