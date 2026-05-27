# Validation Summary: How to Set Up Change Streams in Cloud Spanner for Real-Time Data Capture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Spanner change streams
- GoogleSQL DDL
- Google Cloud CLI
- Apache Beam
- Dataflow
- BigQuery

## Sources Consulted
- Google Cloud Spanner change streams overview: https://docs.cloud.google.com/spanner/docs/change-streams
- Google Cloud Spanner create and manage change streams: https://docs.cloud.google.com/spanner/docs/change-streams/manage
- Google Cloud Spanner change stream partitions, records, and queries: https://docs.cloud.google.com/spanner/docs/change-streams/details
- GoogleSQL data definition language reference for `CREATE CHANGE STREAM` / `ALTER CHANGE STREAM`: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Google Cloud CLI reference for `gcloud spanner databases ddl update`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/ddl/update
- Google Cloud CLI reference for `gcloud spanner databases ddl`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/ddl
- Apache Beam current Javadoc for `SpannerIO.ReadChangeStream`: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/spanner/SpannerIO.ReadChangeStream.html
- Apache Beam BigQueryIO documentation/Javadocs: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/bigquery/BigQueryIO.html

## Issues Found
- The post said `value_capture_type` has three options. The current GoogleSQL DDL reference and change stream record documentation list four values, including `NEW_ROW_AND_OLD_VALUES`. Added the missing option.
- The Java Beam sample used `ParDo`, `BigQueryIO`, and `WriteDisposition` without imports. Added the relevant Apache Beam imports so the snippet is syntactically complete apart from the intentionally user-defined `ProcessChangeRecordFn` and `getTableSchema()`.
- The direct API section implied that a `NULL` `end_timestamp` keeps one stream query open indefinitely. Google Cloud documentation describes change stream reads as partition-based: a query continues until the partition ends or the connection is terminated, and readers must follow child partition records. Updated the explanation.
- The data change record example omitted several documented fields that are part of a data change record. Added `value_capture_type`, transaction counts, transaction tag, and system transaction fields.
- The conclusion described change streams as globally ordered and exactly-once. Google Cloud documents ordering and exactly-once behavior within a partition, while ordering across partitions is not guaranteed. Narrowed the claim to ordered, exactly-once records within each change stream partition.

## Review Notes
- The `retention_period` text was left unchanged because the GoogleSQL DDL reference currently states a default of 1 day and a valid range of 1 to 7 days. Some higher-level Google Cloud change stream pages have inconsistent wording about default and maximum retention, so the SQL reference was treated as authoritative for this tutorial.
- The Dataflow example remains a skeleton: `ProcessChangeRecordFn` and `getTableSchema()` are application-specific placeholders, which is acceptable for this level of tutorial.
