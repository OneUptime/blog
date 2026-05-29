# Validation Summary: How to Build a Data Vault Model on BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery scheduled queries
- BigQuery Data Transfer Service
- Data Vault 2.0
- Data warehousing and data modeling

## Sources Consulted
- Google Cloud BigQuery clustered tables documentation: https://cloud.google.com/bigquery/docs/clustered-tables
- Google Cloud BigQuery partitioned tables documentation: https://cloud.google.com/bigquery/docs/partitioned-tables
- GoogleSQL hash functions documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/hash_functions
- GoogleSQL string functions documentation for TO_HEX: https://cloud.google.com/bigquery/docs/reference/standard-sql/string_functions
- GoogleSQL JSON functions documentation for TO_JSON_STRING: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- GoogleSQL DML syntax documentation for MERGE and UPDATE: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- Google Cloud BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery Data Transfer Service TransferConfig reference: https://cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/projects.transferConfigs

## Issues Found
- The table definitions used BYTES hash keys and hash diffs while clustering on those hash key columns. BigQuery clustered columns must be top-level, non-repeated columns of supported types, and BYTES is not one of the supported clustering types. I changed the hash key and hash diff columns to STRING and updated the examples to use TO_HEX(SHA256(...)), which returns a hex-encoded STRING suitable for clustering.
- The customer satellite hash_diff used CONCAT over nullable attribute values without separators, which can produce ambiguous input strings for different attribute combinations. I changed the expression to hash TO_JSON_STRING(STRUCT(...)) so attribute names, boundaries, and NULL values are represented consistently.
- The introduction implied that partitioning strategies do not matter on BigQuery. BigQuery documentation states that partitioning and clustering can improve query performance and control query cost, so I clarified that large vault tables should still be partitioned and clustered.
- The automation section said to use Cloud Scheduler and BigQuery scheduled queries, but the provided command creates only a BigQuery scheduled query through the BigQuery Data Transfer Service. I changed the wording to match the command.

## Review Notes
The bq CLI was not installed in the review environment, so the scheduled query command was verified against the current Google Cloud BigQuery scheduled query documentation rather than local command help. The command shape, flags, scheduled_query data source, and query parameter are consistent with the documented bq mk --transfer_config pattern.
