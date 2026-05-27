# Validation Summary: How to Query JSON Data in BigQuery Using JSON Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery JSON data type
- BigQuery JSON functions
- JSONPath

## Sources Consulted
- Google Cloud BigQuery JSON functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- Google Cloud BigQuery guide for working with JSON data in GoogleSQL: https://cloud.google.com/bigquery/docs/json-data
- Google Cloud BigQuery materialized views documentation: https://cloud.google.com/bigquery/docs/materialized-views-create

## Issues Found
- The post incorrectly stated that lax mode is the default JSONPath mode and that strict mode causes missing keys to error. Google BigQuery documentation says strict mode is the default, missing paths return SQL NULL for JSON extractors, invalid JSONPath syntax errors, and lax mode adapts matching between arrays and non-arrays. Updated the section and examples accordingly.
- The performance example used `CREATE MATERIALIZED VIEW` immediately after recommending regular columns for frequently accessed JSON paths. Changed the example to `CREATE OR REPLACE TABLE` for a regular extracted table, which better matches the recommendation to materialize those paths outside the JSON column.
- The metadata description listed `JSON_EXTRACT`, but the tutorial focuses on the current standard extractor functions. Updated the description to mention `JSON_VALUE_ARRAY` and `JSON_QUERY_ARRAY` instead.

## Review Notes
The remaining examples use current standard BigQuery JSON functions such as `JSON_VALUE`, `JSON_QUERY`, `JSON_VALUE_ARRAY`, `JSON_QUERY_ARRAY`, and `JSON_TYPE`. Legacy `JSON_EXTRACT` functions are supported but deprecated in favor of the standard extractors.
