# Validation Summary: How to Implement Batch Writes in Cloud Spanner for High-Throughput Ingestion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner mutations and batched commits
- Cloud Spanner Batch DML
- Cloud Spanner Partitioned DML
- Google Cloud Monitoring metrics
- Python
- Go
- Google Cloud CLI

## Sources Consulted
- Cloud Spanner quotas and limits: https://docs.cloud.google.com/spanner/quotas
- Cloud Spanner mutations documentation: https://docs.cloud.google.com/spanner/docs/modify-mutation-api
- Cloud Spanner Batch Write documentation: https://docs.cloud.google.com/spanner/docs/batch-write
- Cloud Spanner DML and Batch DML documentation: https://docs.cloud.google.com/spanner/docs/dml-tasks
- Cloud Spanner ExecuteBatchDml REST reference: https://docs.cloud.google.com/spanner/docs/reference/rest/v1/projects.instances.databases.sessions/executeBatchDml
- Cloud Spanner Partitioned DML documentation: https://docs.cloud.google.com/spanner/docs/dml-partitioned
- Cloud Spanner CPU utilization metrics: https://docs.cloud.google.com/spanner/docs/cpu-utilization
- Cloud Spanner Cloud Monitoring documentation: https://docs.cloud.google.com/spanner/docs/monitoring-cloud
- Google Cloud Spanner Python client Transaction reference: https://docs.cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.transaction.Transaction
- Google Cloud Spanner Python client Batch reference: https://cloud.google.com/python/docs/reference/spanner/latest/batch-api
- Google Cloud Spanner Go client reference: https://pkg.go.dev/cloud.google.com/go/spanner

## Issues Found
- The post used the outdated mutation limit of 20,000 mutations per commit. Updated it to the current documented limit of 80,000 mutations per commit, including indexes, and adjusted the row-count example from 5,000 rows to 20,000 rows for a simple four-column row with no secondary indexes.
- The commit-size limit was written as 100 MB. Updated it to 100 MiB to match the official quota wording.
- The first method described the Python `database.batch()` example as a single `Apply` call. Updated the heading and wording to describe a batched mutation commit, which matches the Python client API.
- The post claimed Batch DML is limited to 20 statements per batch. I could not verify that as a current documented Spanner limit, so I replaced it with guidance to stay within transaction, parameter, and request-size limits.
- The Partitioned DML section described it as the fastest option and framed the tradeoff as eventual consistency. Updated the wording to match official semantics: Partitioned DML is for bulk updates and deletes, does not provide all-or-nothing atomicity across the full operation, requires idempotent statements, and returns a lower-bound row count.
- The Partitioned DML example printed an exact archived row count. Updated the message to say "at least" because Spanner documents the returned count as a lower bound.
- The key-distribution example said random UUIDs spread writes across all splits. Updated that to "help spread writes across splits" to avoid overclaiming.
- The monitoring example used the generic CPU utilization metric while applying the high-priority CPU thresholds. Updated the metric filter and surrounding wording to use `spanner.googleapis.com/instance/cpu/utilization_by_priority`.

## Review Notes
The post is technically relevant and includes implementation details. The examples remain illustrative snippets and assume existing Spanner instances, databases, tables, imports, and authentication. The official Batch Write API is currently documented as Preview; the post focuses mostly on batched commits, Batch DML, Partitioned DML, and parallel client-side writers rather than adding a new Batch Write API section.
