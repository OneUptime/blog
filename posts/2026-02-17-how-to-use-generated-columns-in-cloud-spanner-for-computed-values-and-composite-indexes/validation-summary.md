# Validation Summary: How to Use Generated Columns in Cloud Spanner for Computed Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- GoogleSQL DDL
- Generated columns
- Secondary indexes
- Python Cloud Spanner client library

## Sources Consulted
- Google Cloud Spanner: Create and manage generated columns: https://cloud.google.com/spanner/docs/generated-column/how-to
- Google Cloud Spanner: GoogleSQL data definition language: https://cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Google Cloud Spanner: Commit timestamps in GoogleSQL-dialect databases: https://cloud.google.com/spanner/docs/commit-timestamp
- Google Cloud Spanner Python sample: Mutations write data with TIMESTAMP column: https://cloud.google.com/spanner/docs/samples/spanner-insert-data-with-timestamp-column
- Google Cloud Spanner Python sample: Query with FLOAT parameter: https://cloud.google.com/spanner/docs/samples/spanner-query-with-float-parameter

## Issues Found
- The post incorrectly stated or implied that only stored generated columns can be indexed and that non-stored generated columns cannot be indexed. Updated the text to clarify that generated columns, including non-stored generated columns, can be indexed.
- The guidance for choosing non-stored versus stored generated columns was too closely tied to indexability. Updated the guidance so stored columns are recommended when the value should be persisted in the base table, while non-stored columns are appropriate when base-table storage is the concern.
- The post said a newly added stored generated column would show NULL values during backfill. Spanner documentation states that stored generated columns cannot be read or queried while backfilling. Updated the backfill note accordingly.
- The expression examples used `CreatedAt` for a generated column while earlier examples defined `CreatedAt` with `allow_commit_timestamp=true`. Spanner does not allow generated columns to reference commit timestamp columns, so the example now uses `PublishedAt`.
- The restrictions section overstated that generated columns cannot reference other generated columns in all cases and omitted several documented restrictions. Updated it to reflect documented constraints for generated primary keys, immutable expressions for stored or indexed generated columns, and `allow_commit_timestamp` limitations.

## Review Notes
The SQL examples use GoogleSQL-dialect Cloud Spanner syntax. The Python client usage of `spanner.COMMIT_TIMESTAMP` and `spanner.param_types.FLOAT64` matches official samples.
