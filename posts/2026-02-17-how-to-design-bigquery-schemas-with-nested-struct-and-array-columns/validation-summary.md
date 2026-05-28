# Validation Summary: How to Design BigQuery Schemas with Nested STRUCT and ARRAY Columns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery nested and repeated fields
- BigQuery STRUCT and ARRAY types
- BigQuery partitioned and clustered tables

## Sources Consulted
- Google Cloud BigQuery documentation: Specify nested and repeated columns in table schemas - https://docs.cloud.google.com/bigquery/docs/nested-repeated
- Google Cloud BigQuery documentation: Use nested and repeated fields - https://docs.cloud.google.com/bigquery/docs/best-practices-performance-nested
- Google Cloud BigQuery documentation: Work with arrays - https://docs.cloud.google.com/bigquery/docs/arrays
- Google Cloud BigQuery documentation: Create clustered tables - https://docs.cloud.google.com/bigquery/docs/creating-clustered-tables
- Google Cloud BigQuery documentation: Data definition language statements in GoogleSQL - https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- Google Cloud BigQuery documentation: Modifying table schemas - https://docs.cloud.google.com/bigquery/docs/managing-table-schemas
- Google Cloud BigQuery documentation: Quotas and limits - https://cloud.google.com/bigquery/quotas
- Google Cloud BigQuery documentation: GoogleSQL data types - https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types

## Issues Found
- The e-commerce schema used `CLUSTER BY event_type, user.user_id`. BigQuery clustering columns must be top-level, non-repeated columns, so clustering directly on `user.user_id` is not valid. Changed the example to `CLUSTER BY event_type`.
- The sensor readings schema used `CLUSTER BY device.device_id`. BigQuery does not allow clustering directly on nested fields, so I added a top-level `device_id` column and changed the clustering clause to `CLUSTER BY device_id`.
- The limitations section incorrectly stated that clustering on a STRUCT field such as `user.user_id` is allowed. Updated the explanation to state that clustering columns must be top-level and non-repeated, and that nested keys should be duplicated into top-level columns when needed for clustering.
- The schema changes example used `ALTER TABLE ... ADD COLUMN address.latitude FLOAT64`, but BigQuery SQL DDL does not support adding nested columns inside existing RECORD/STRUCT fields with dot notation. Replaced it with a valid `ALTER TABLE ADD COLUMN` example that adds a new top-level STRUCT column.
- The schema changes explanation said changing a STRUCT field type requires table recreation. BigQuery supports some `ALTER COLUMN SET DATA TYPE` changes, including certain STRUCT field type changes, while complex changes inside arrays of STRUCTs require rewriting the table. Updated the wording to match current BigQuery behavior.
- The ARRAY size limitation wording implied there is no relevant hard limit. Updated it to mention that there is no separate per-array element count limit, but row size limits still apply.

## Review Notes
The remaining SQL examples use supported GoogleSQL syntax for STRUCTs, ARRAYs, ARRAY of STRUCTs, dot notation, scalar subqueries over `UNNEST`, partitioning by DATE columns, and clustering by valid top-level columns. The post's performance guidance is directionally correct, but future revisions could add more nuance that denormalization should follow access patterns and that very high-cardinality repeated fields may not be a good fit.
