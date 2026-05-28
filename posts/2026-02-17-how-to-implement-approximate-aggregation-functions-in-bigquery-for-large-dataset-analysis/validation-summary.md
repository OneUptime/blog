# Validation Summary: How to Use Approximate Aggregation Functions in BigQuery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- Approximate aggregate functions
- HyperLogLog++ sketch functions

## Sources Consulted
- Google Cloud BigQuery approximate aggregate functions documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/approximate_aggregate_functions
- Google Cloud BigQuery HyperLogLog++ functions documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/hll_functions
- Google Cloud BigQuery date functions documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions
- Google Cloud BigQuery timestamp functions documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- Google Cloud BigQuery cost best practices documentation: https://docs.cloud.google.com/bigquery/docs/best-practices-costs
- Google Cloud BigQuery function performance best practices documentation: https://docs.cloud.google.com/bigquery/docs/best-practices-performance-functions

## Issues Found
- The post implied approximate functions lower costs under BigQuery on-demand pricing. BigQuery on-demand query pricing is based on bytes read, so approximate functions often improve latency and compute usage without necessarily reducing billed bytes. Updated the cost language to distinguish on-demand pricing from capacity-based slot pricing.
- The post stated approximate functions consume fewer slot-hours and that this means lower on-demand cost. Updated the wording because slot-hour savings apply to capacity-based pricing and performance, not directly to on-demand bytes-read billing.
- The `HLL_COUNT.EXTRACT(HLL_COUNT.MERGE(user_sketch))` example was invalid because `HLL_COUNT.MERGE` returns an `INT64` cardinality estimate, while `HLL_COUNT.EXTRACT` expects a `BYTES` sketch. Updated the query to use `HLL_COUNT.MERGE(user_sketch)` directly.
- The post included specific performance and error-rate claims such as "5-10x faster," "within 1%," "process significantly less data," and "20-40 percent" cost reduction. Official docs describe statistical uncertainty and improved performance on huge inputs but do not guarantee those specific values. Reworded these claims to avoid unsupported guarantees.
- The post described `APPROX_COUNT_DISTINCT` as using HyperLogLog++ directly. BigQuery documents HyperLogLog++ sketch functions separately and describes `APPROX_COUNT_DISTINCT` as a system-precision approximate aggregate. Updated the wording to avoid overstating the implementation detail.

## Review Notes
The BigQuery approximate aggregate function names and core syntax are current. `APPROX_QUANTILES`, `APPROX_TOP_COUNT`, `APPROX_TOP_SUM`, `DATE_TRUNC` with a timestamp value, and the corrected `HLL_COUNT` examples are consistent with current GoogleSQL documentation.
