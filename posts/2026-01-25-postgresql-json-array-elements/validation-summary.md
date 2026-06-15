# Validation Summary: How to Access JSON Array Elements in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- JSON
- JSONB
- SQL
- GIN indexes

## Sources Consulted
- PostgreSQL 18 Documentation: JSON Functions and Operators - https://www.postgresql.org/docs/current/functions-json.html
- PostgreSQL 18 Documentation: JSON Types - https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL 18 Documentation: GIN Indexes - https://www.postgresql.org/docs/current/gin.html
- PostgreSQL 9.5 Documentation: JSON Functions and Operators - https://www.postgresql.org/docs/9.5/functions-json.html
- Local execution check with PostgreSQL 16 Docker image.

## Issues Found
- The negative JSON array index example was labeled as "PostgreSQL 12+". PostgreSQL documentation shows negative integer subscripting for JSON array extraction in PostgreSQL 9.5, and the current documentation describes it without a PostgreSQL 12 version restriction. I removed the inaccurate version note while keeping the example unchanged.

## Review Notes
The SQL examples were run against PostgreSQL 16 in a local Docker container and executed successfully. The post defines a custom `jsonb_array_insert` helper; PostgreSQL also provides the built-in `jsonb_insert` function for this use case, but the custom helper is syntactically valid and works for the demonstrated insertion behavior.
