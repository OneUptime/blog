# Validation Summary: How to Use BigQuery Scripting with DECLARE SET and LOOP for Complex ETL Logic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- GoogleSQL procedural language
- BigQuery scripting variables and control flow
- BigQuery DML and MERGE
- Dynamic SQL with EXECUTE IMMEDIATE

## Sources Consulted
- Google Cloud BigQuery procedural language reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/procedural-language
- Google Cloud BigQuery system variables reference: https://cloud.google.com/bigquery/docs/reference/system-variables
- Google Cloud BigQuery DML syntax reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- Google Cloud BigQuery lexical structure and syntax reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical

## Issues Found
- The batch-processing example used `UPDATE ... LIMIT 1000`, but BigQuery's `UPDATE` DML syntax does not support a top-level `LIMIT` clause. Changed the example to limit rows through an `IN (SELECT ... LIMIT 1000)` predicate.
- The complete ETL example declared `invalid_count` after a `SET` statement inside a `BEGIN` block. BigQuery requires variable declarations at the start of a block before other statements. Moved the declaration before the `SET`.
- The loop section title and intro mentioned `CONTINUE`, but the example used `LEAVE`, which BigQuery documents as a synonym for `BREAK`. Updated the heading and intro to match the code.

## Review Notes
The dynamic SQL examples are syntactically valid. In production code, table and column names interpolated with `FORMAT` should come from trusted metadata or be validated because query parameters only bind values, not identifiers.
