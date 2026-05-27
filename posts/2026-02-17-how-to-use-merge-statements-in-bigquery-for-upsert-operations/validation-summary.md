# Validation Summary: How to Use MERGE Statements in BigQuery for Upsert Operations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigQuery
- GoogleSQL / SQL DML
- MERGE statements
- Incremental loading
- Change Data Capture processing
- Slowly Changing Dimensions Type 2

## Sources Consulted
- Google Cloud BigQuery DML syntax reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- Google Cloud BigQuery DML guide: https://cloud.google.com/bigquery/docs/data-manipulation-language
- Google Cloud BigQuery partitioned-table DML guide: https://cloud.google.com/bigquery/docs/using-dml-with-partitioned-tables
- Google Cloud BigQuery procedural language reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/procedural-language
- Google Cloud BigQuery ROW_NUMBER reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/numbering_functions

## Issues Found
- The MERGE examples used qualified target columns such as `target.name` on the left side of `UPDATE SET` assignments. BigQuery's MERGE grammar defines update items as `column_name = expression`, so I changed those assignments to unqualified target column names while keeping source references qualified.
- The MERGE with DELETE example was labeled as deleting removed records, but the query deletes records explicitly marked inactive in the source. I changed the comment to say it deletes inactive records.
- The partition-pruning example claimed it only scans today's partition while only constraining the target table. I filtered the source subquery by `event_date`, joined on the partition column, and clarified that the target partition scan is restricted.

## Review Notes
- The SCD Type 2 section correctly notes that changed existing rows require a second pass or a separate INSERT after closing the old current record, because rows inserted during a MERGE are not eligible for matching in the same statement.
