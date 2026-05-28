# Validation Summary: How to Export VPC Flow Logs to BigQuery for Long-Term Network Analysis on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC Flow Logs
- Cloud Logging log sinks
- BigQuery datasets, partitioned tables, views, and scheduled queries
- Google Cloud CLI (`gcloud`)
- BigQuery CLI (`bq`)
- GoogleSQL

## Sources Consulted
- Google Cloud SDK reference for `gcloud compute networks subnets update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud VPC Flow Logs overview: https://cloud.google.com/vpc/docs/flow-logs
- Google Cloud VPC Flow Logs configuration guide: https://docs.cloud.google.com/vpc/docs/using-flow-logs
- Google Cloud VPC Flow Logs record format: https://docs.cloud.google.com/vpc/docs/about-flow-logs-records
- Google Cloud SDK reference for `gcloud logging sinks create`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Logging guide for routed logs in BigQuery: https://cloud.google.com/logging/docs/export/bigquery
- Cloud Logging sink destination permissions: https://cloud.google.com/logging/docs/export/configure_export_v2
- BigQuery dataset creation documentation: https://cloud.google.com/bigquery/docs/datasets
- BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery GoogleSQL string functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/string_functions

## Issues Found
- The `gcloud compute networks subnets update` example used the Compute Engine API enum `INTERVAL_10_MIN` for `--logging-aggregation-interval`. The gcloud CLI expects values such as `interval-10-min`, so the command was updated.
- The dataset example said to use the same region as the VPC but created the dataset in the `US` multi-region. The location was updated to `us-central1` to match the example subnet region.
- The sink was configured with `--use-partitioned-tables`, but the verification query, flattened view, and scheduled query referenced date-sharded wildcard tables and `_TABLE_SUFFIX`. Partitioned Cloud Logging exports use the unsuffixed table name, so those examples were updated to query `compute_googleapis_com_vpc_flows` and filter by `timestamp`.
- The post described creating a "materialized view" but the SQL example creates a normal view. The wording was changed to "view or scheduled query" to match the code.
- The internet egress query only excluded `172.16.*`, which misses most of the RFC1918 `172.16.0.0/12` range. The filter was updated to exclude `172.16.*` through `172.31.*`.
- The internet egress query comment said no destination VM always means external traffic. The comment was softened because missing VM metadata is a common external-destination signal, but it is not a complete proof of internet egress.

## Review Notes
The core approach is valid: VPC Flow Logs can be routed from Cloud Logging to BigQuery with a log sink, and `roles/bigquery.dataEditor` is the documented destination role for the sink writer identity. The analysis queries are examples and may need project-specific refinements for IPv6, Cloud VPN, Interconnect, Private Service Connect, or Shared VPC environments.
