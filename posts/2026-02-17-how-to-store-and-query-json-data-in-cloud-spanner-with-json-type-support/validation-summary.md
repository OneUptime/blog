# Validation Summary: How to Store and Query JSON Data in Cloud Spanner with JSON Type Support

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Spanner
- GoogleSQL
- JSON data type and JSON functions
- Generated columns and secondary indexes
- Python Cloud Spanner client library

## Sources Consulted
- Cloud Spanner: Work with JSON data: https://docs.cloud.google.com/spanner/docs/working-with-json
- Cloud Spanner: JSON functions in GoogleSQL: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/json_functions
- Cloud Spanner: Create and manage generated columns: https://docs.cloud.google.com/spanner/docs/generated-column/how-to
- Cloud Spanner: Secondary indexes: https://docs.cloud.google.com/spanner/docs/secondary-indexes
- Python Cloud Spanner client: Transaction reference: https://docs.cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.transaction.Transaction
- Python Cloud Spanner client: Database reference: https://docs.cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.database.Database

## Issues Found
- The post incorrectly said Spanner does not support updating a single JSON field in SQL and requires an application-level read-modify-write of the full document. Current GoogleSQL for Spanner supports JSON mutator functions such as JSON_SET and JSON_REMOVE, which produce a new JSON value with the requested path change. I updated the SQL and Python examples to use JSON_SET through DML.
- The insertion section described SQL JSON literals as passing a "JSON string." I changed the wording to "JSON literal" to match the syntax shown and avoid implying that the value is stored as an ordinary STRING column.

## Review Notes
- JSON columns still cannot be used as primary keys or as keys in secondary indexes; the generated-column indexing pattern in the post is correct for scalar JSON paths.
- Spanner also supports JSON search indexes for broader JSON document search in Enterprise and Enterprise Plus editions, but the post's generated-column approach remains valid for frequently queried scalar fields.
