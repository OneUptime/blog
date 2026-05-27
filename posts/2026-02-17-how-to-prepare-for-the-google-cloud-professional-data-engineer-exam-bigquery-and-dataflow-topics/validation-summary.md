# Validation Summary: How to Prepare for the Google Cloud Professional Data Engineer Exam BigQuery

## Status
validated

## Post Type
Certification study guide

## Technologies Covered
- Google BigQuery
- Google Cloud Dataflow
- Apache Beam Python SDK
- Google Cloud CLI
- BigQuery SQL
- Pub/Sub
- Cloud Storage

## Sources Consulted
- BigQuery partitioned tables: https://cloud.google.com/bigquery/docs/creating-partitioned-tables
- BigQuery clustered tables: https://cloud.google.com/bigquery/docs/clustered-tables
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery materialized views: https://cloud.google.com/bigquery/docs/materialized-views-create
- BigQuery Storage Write API: https://cloud.google.com/bigquery/docs/write-api
- BigQuery legacy streaming API: https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- BigQuery row-level security: https://cloud.google.com/bigquery/docs/row-level-security-intro
- Dataflow exactly-once processing: https://cloud.google.com/dataflow/docs/concepts/exactly-once
- Dataflow Pub/Sub streaming: https://cloud.google.com/dataflow/docs/concepts/streaming-with-cloud-pubsub
- Dataflow Flex Templates: https://cloud.google.com/dataflow/docs/guides/templates/configuring-flex-templates
- gcloud dataflow flex-template build reference: https://cloud.google.com/sdk/gcloud/reference/dataflow/flex-template/build
- Apache Beam CombinePerKey transform: https://beam.apache.org/documentation/transforms/python/aggregation/combineperkey/
- Apache Beam programming guide for windowing and triggers: https://beam.apache.org/documentation/programming-guide/

## Issues Found
- The first BigQuery partitioning SQL example was labeled as ingestion-time partitioning, but the SQL partitioned on the `created_at` column. I changed the comment to describe column-based timestamp partitioning and used the official `TIMESTAMP_TRUNC(created_at, DAY)` form for timestamp partitioning.
- The BigQuery pricing description used "TB" for on-demand query pricing. Official BigQuery pricing is stated per TiB, so I changed the wording to "TiB" and noted that the $6.25 rate applies in many regions.
- The materialized view example used `COUNT(DISTINCT event_type)`, which is not in BigQuery materialized views' supported aggregate list. I changed it to `APPROX_COUNT_DISTINCT(event_type)`, which is supported.
- The Apache Beam streaming example used `PipelineOptions` and `json.loads` without importing them. I added the missing imports.
- The Apache Beam streaming example applied `CombinePerKey(sum)` to dictionaries rather than key-value pairs. I added a step to map events to `(user_id, 1)` pairs, then formatted the combined results as BigQuery rows and provided a matching schema.
- The architecture section said different teams can query the same data without affecting each other's performance. That was too absolute for shared on-demand slots, so I changed it to say teams can query without duplicating data and can use reservations for workload isolation.
- The data-loading section said streaming inserts are charged per row and implied the Storage Write API always provides exactly-once semantics. I updated this to match the documented billing model and clarified that exactly-once writes require application-created streams with stream offsets.
- The exactly-once scenario implied user code itself runs exactly once. I clarified that Dataflow provides exactly-once processing for pipeline results by default, uses source deduplication for Pub/Sub, and that external side effects should be idempotent.

## Review Notes
Most conceptual guidance is accurate for exam preparation. Some snippets still depend on user-defined helper functions such as `parse_csv_row` and `add_event_timestamp`; this is acceptable for a study-guide excerpt, but a future runnable tutorial should define those functions explicitly.
