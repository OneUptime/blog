# Validation Summary: How to Use PostgreSQL JSONB for Document Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- JSONB and JSON data types
- SQL/JSON path expressions
- GIN indexes and `jsonb_path_ops`
- PostgreSQL expression indexes

## Sources Consulted
- PostgreSQL documentation: JSON Types - https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL documentation: JSON Functions and Operators - https://www.postgresql.org/docs/current/functions-json.html
- PostgreSQL documentation: GIN Indexes - https://www.postgresql.org/docs/current/gin.html
- PostgreSQL documentation: Indexes on Expressions - https://www.postgresql.org/docs/current/indexes-expressional.html
- PostgreSQL 9.4 release announcement - https://www.postgresql.org/about/news/postgresql-94-increases-flexibility-scalability-and-performance-1557/
- PostgreSQL 12 release announcement - https://www.postgresql.org/about/news/postgresql-12-released-1976/

## Issues Found
- The `jsonb_set` nested-path example said it would create a missing `warranty` parent object. PostgreSQL's `jsonb_set` requires all earlier path steps to exist, so the original example would leave the document unchanged when `warranty` was absent. Changed the example to create a new key under the existing `specs` object and updated the comment to say the parent must exist.
- The `jsonb_path_ops` indexing note said it "only supports @>". Current PostgreSQL documentation states that `jsonb_path_ops` supports `@>`, `@?`, and `@@`, but not the key-exists operators. Updated the comment accordingly.

## Review Notes
The remaining SQL examples and technical explanations align with current PostgreSQL documentation. The post mentions PostgreSQL 12+ as recommended for JSONPath support; PostgreSQL 12 is now unsupported, but the feature/version statement is still historically accurate.
