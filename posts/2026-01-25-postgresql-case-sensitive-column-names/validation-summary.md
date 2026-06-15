# Validation Summary: How to Handle Case-Sensitive Column Names in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL identifiers and quoted identifiers
- PostgreSQL information schema
- PostgreSQL PL/pgSQL dynamic SQL
- PostgreSQL string matching
- SQLAlchemy ORM declarative mappings

## Sources Consulted
- PostgreSQL 18 documentation: Lexical Structure / Identifiers and Key Words - https://www.postgresql.org/docs/current/sql-syntax-lexical.html
- PostgreSQL 18 documentation: String Functions and Operators (`quote_ident`, `format`) - https://www.postgresql.org/docs/current/functions-string.html
- PostgreSQL 18 documentation: PL/pgSQL Basic Statements / Dynamic Commands - https://www.postgresql.org/docs/current/plpgsql-statements.html
- PostgreSQL 18 documentation: Information Schema `columns` view - https://www.postgresql.org/docs/current/infoschema-columns.html
- PostgreSQL 18 documentation: SQL Key Words - https://www.postgresql.org/docs/current/sql-keywords-appendix.html
- PostgreSQL 18 documentation: Pattern Matching (`LIKE`, `ILIKE`) - https://www.postgresql.org/docs/current/functions-matching.html
- SQLAlchemy 2.1 documentation: Declarative Mapping Styles - https://docs.sqlalchemy.org/en/21/orm/declarative_styles.html

## Issues Found
- The SQLAlchemy example used `sqlalchemy.ext.declarative.declarative_base`, which is superseded by the `DeclarativeBase` superclass in SQLAlchemy 2.x. Updated the snippet to use `DeclarativeBase`, `Mapped`, and `mapped_column`.
- The dynamic SQL section said to use `quote_ident()` but the example used `format()` with `%I`. Updated the prose and comment to explain that `%I` safely quotes identifiers like `quote_ident()`.
- The generated legacy migration statements did not schema-qualify tables even though the query filters by `table_schema = 'public'`. Updated the `format()` call to generate `ALTER TABLE %I.%I ...` using `table_schema` and `table_name`.

## Review Notes
The core PostgreSQL identifier behavior, quoted identifier escaping, reserved-word quoting guidance, information schema usage, and `ILIKE` guidance are consistent with the official PostgreSQL documentation. `psql` was not installed in the local environment, so examples were verified against official documentation rather than executed locally.
