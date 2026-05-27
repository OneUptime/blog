# Validation Summary: How to Use Key Salting to Distribute Write Load in Cloud Bigtable

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Bigtable
- Cloud Bigtable row key design and key salting
- Python
- Google Cloud Bigtable Python client library
- Java
- Google Cloud Bigtable Java client library
- Key Visualizer

## Sources Consulted
- Cloud Bigtable schema design best practices: https://docs.cloud.google.com/bigtable/docs/schema-design
- Cloud Bigtable performance guide: https://docs.cloud.google.com/bigtable/docs/performance
- Cloud Bigtable instances, clusters, and nodes: https://docs.cloud.google.com/bigtable/docs/instances-clusters-nodes
- Cloud Bigtable latency troubleshooting: https://docs.cloud.google.com/bigtable/docs/latency
- Cloud Bigtable Key Visualizer overview: https://docs.cloud.google.com/bigtable/docs/keyvis-overview
- Cloud Bigtable key salting blog: https://cloud.google.com/blog/products/databases/cloud-bigtable-schema-optimization-key-salting/
- Google Cloud Bigtable Python Table reference: https://docs.cloud.google.com/python/docs/reference/bigtable/latest/table
- Google Cloud Bigtable Python row_set reference: https://docs.cloud.google.com/python/docs/reference/bigtable/latest/google.cloud.bigtable.row_set
- Google Cloud Bigtable Java BigtableDataClient reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-bigtable/latest/com.google.cloud.bigtable.data.v2.BigtableDataClient

## Issues Found
- The post overstated hotspot behavior by saying sequential or common-prefix writes will always hit a hotspot and all writes land on the same tablet and node. Changed this to "can hit" and "many writes can land in the same tablet range" to match Bigtable's documented tablet balancing behavior.
- The post described each tablet as "served by" a single node. Changed this to "associated with" a single node, matching the official Bigtable node documentation.
- The salting explanation said salted keys spread writes across the entire key space. Changed this to multiple salted key ranges, which is more accurate for fixed bucket prefixes such as `00#` through `19#`.
- The Python example output for the MD5-based salting function was incorrect. For `event#2026-02-17T10:00:01` with 10 buckets, the shown implementation returns bucket `05`, not `07`.
- The Python range-scan example imported `google.cloud.bigtable.row` as `bt_row` and used `bt_row.RowRange`, but the current Python client exposes `RowRange` under `google.cloud.bigtable.row_set`, and `Table.read_rows` also directly supports `start_key` and `end_key`. Changed the sample to call `table.read_rows(start_key=..., end_key=..., limit=...)`.
- The conclusion said salting "forces" even distribution across all nodes. Changed this to say salting spreads writes across multiple key ranges so Bigtable can balance tablets across nodes more effectively.

## Review Notes
- The Java single-row mutation sample matches the current `BigtableDataClient.mutateRow(RowMutation)` documentation.
- The bucket-count guidance is reasonable as a starting heuristic, but production workloads should still validate distribution and latency with workload-specific tests and Key Visualizer.
