# Validation Summary: How to Write SQL Queries in Amazon Athena

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Athena
- Trino / Presto SQL
- Amazon S3
- SQL data types, joins, CTEs, window functions, JSON functions, views, CTAS, and INSERT INTO

## Sources Consulted
- Amazon Athena User Guide: Athena engine version 3 - https://docs.aws.amazon.com/athena/latest/ug/engine-versions-reference-0003.html
- Amazon Athena User Guide: Data types in Amazon Athena - https://docs.aws.amazon.com/athena/latest/ug/data-types.html
- Amazon Athena User Guide: Extract JSON data from strings - https://docs.aws.amazon.com/athena/latest/ug/extracting-data-from-JSON.html
- Amazon Athena User Guide: Get the length and size of JSON arrays - https://docs.aws.amazon.com/athena/latest/ug/length-and-size.html
- Amazon Athena User Guide: Flatten nested arrays - https://docs.aws.amazon.com/athena/latest/ug/flattening-arrays.html
- Amazon Athena User Guide: Optimize queries - https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-query-optimization-techniques.html
- Amazon Athena User Guide: CREATE TABLE AS - https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena User Guide: INSERT INTO - https://docs.aws.amazon.com/athena/latest/ug/insert-into.html
- Amazon Athena User Guide: Work with views - https://docs.aws.amazon.com/athena/latest/ug/views.html
- Trino documentation: Date and time functions and operators - https://trino.io/docs/current/functions/datetime.html
- Trino documentation: Aggregate functions - https://trino.io/docs/current/functions/aggregate.html

## Issues Found
- The date/time example used `date_diff('hour', TIMESTAMP '2025-01-01', current_timestamp)`. In Trino, `current_timestamp` is a timestamp with time zone, while `TIMESTAMP '2025-01-01'` is a timestamp without time zone. Changed the example to use `localtimestamp` so both arguments are timestamp values without time zone.
- The JSON section introduced `UNNEST(items)` as flattening a JSON array. Athena's `UNNEST` applies to Athena array values; raw JSON strings require JSON extraction/casting first. Changed the surrounding wording and comment to say the example is for typed array columns.

## Review Notes
- The `APPROX_DISTINCT` note is technically correct as a standard-error statement, but it does not guarantee a maximum error for every input set.
- The CTAS example is valid, but Athena requires a manually specified `external_location` to be empty and may reject `external_location` when the workgroup enforces a query result location.
