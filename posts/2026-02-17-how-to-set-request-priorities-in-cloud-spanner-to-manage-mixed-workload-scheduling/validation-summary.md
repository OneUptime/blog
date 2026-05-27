# Validation Summary: Set Request Priorities in Cloud Spanner to Manage Mixed Workload Scheduling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner request priorities
- Cloud Spanner Python client library
- Cloud Spanner Java client library
- Cloud Spanner Go client library
- Cloud Spanner query statistics tables
- GoogleSQL

## Sources Consulted
- Cloud Spanner RequestOptions reference: https://docs.cloud.google.com/spanner/docs/reference/rest/v1/RequestOptions
- Cloud Spanner CPU utilization and task priority documentation: https://docs.cloud.google.com/spanner/docs/cpu-utilization
- Cloud Spanner query statistics documentation: https://docs.cloud.google.com/spanner/docs/introspection/query-statistics
- Cloud Spanner Python client documentation: https://docs.cloud.google.com/python/docs/reference/spanner/latest
- Cloud Spanner Python Database.run_in_transaction documentation: https://cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.database.Database
- Cloud Spanner Java Options.RpcPriority documentation: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.Options.RpcPriority
- Cloud Spanner Java Options.priority documentation: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.Options
- Cloud Spanner Java DatabaseClient documentation: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.DatabaseClient
- Cloud Spanner Go client documentation: https://pkg.go.dev/cloud.google.com/go/spanner
- Cloud Spanner Go spannerpb RequestOptions documentation: https://pkg.go.dev/cloud.google.com/go/spanner/apiv1/spannerpb

## Issues Found
- The post described priority scheduling as a strict priority queue and implied guaranteed ordering. Updated the explanation and diagram language to reflect that priority is a scheduler hint and does not guarantee execution order.
- The post stated MEDIUM was the default priority. Updated this because Spanner treats unspecified priority as HIGH.
- The Python transaction example passed `request_options` to `database.run_in_transaction`, which would be forwarded to the callback rather than setting request options for the transaction. Removed that invalid argument and kept the request-level priority on `execute_sql`.
- The Java example used `RpcPriority.HIGH` / `RpcPriority.LOW` without importing the nested enum and queried twice before reading the current row. Updated it to use `Options.RpcPriority`, query once, and close `ResultSet` instances.
- The Go example ignored `BufferWrite` errors and treated every iterator error as end-of-iteration. Updated it to return `BufferWrite` errors, check `iterator.Done`, and return row decoding errors.
- The query statistics SQL used non-existent columns such as `latency_seconds` and `read_rows`, and used `APPROX_QUANTILES` over a non-existent raw latency column. Updated the examples to use documented columns such as `execution_count`, `avg_latency_seconds`, `avg_rows_scanned`, and `latency_distribution` with `SPANNER_SYS.DISTRIBUTION_PERCENTILE`.
- The wrap-up claimed the impact is always significant and that user-facing transactions stay responsive. Adjusted this to state the benefit is under contention and is not absolute.

## Review Notes
The request-tag query groups query statistics by tag, not by priority, because the documented query statistics schema exposes request tags and query metrics but not a priority column. To compare priority classes directly, teams should use Cloud Monitoring CPU utilization metrics grouped by priority.
