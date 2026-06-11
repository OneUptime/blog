# Validation Summary: How to Build PostgreSQL Range Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL range types (`int4range`, `int8range`, `numrange`, `tsrange`, `tstzrange`, `daterange`)
- PostgreSQL multirange types (`int4multirange`, `tstzmultirange`)
- Custom range type definitions (`CREATE TYPE ... AS RANGE`)
- GiST indexes for range columns
- Exclusion constraints (including partial constraints with `WHERE`)
- `btree_gist` extension
- SQL DDL and DML

## Sources Consulted
- PostgreSQL Range Types documentation: https://www.postgresql.org/docs/current/rangetypes.html
- PostgreSQL Range Functions and Operators: https://www.postgresql.org/docs/current/functions-range.html
- PostgreSQL CREATE TYPE (RANGE) docs: https://www.postgresql.org/docs/current/sql-createtype.html
- PostgreSQL CREATE INDEX / GiST: https://www.postgresql.org/docs/current/indexes-types.html
- PostgreSQL Exclusion Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION
- PostgreSQL `btree_gist` extension: https://www.postgresql.org/docs/current/btree-gist.html
- PostgreSQL 14 release notes (multirange types, `range_agg`): https://www.postgresql.org/docs/14/release-14.html

## Issues Found
No technical issues found. Verified specific claims:
- Discrete range canonicalization: `int4range(1, 10, '[]')` correctly canonicalizes to `[1, 11)`; `int4range(1, 10, '(]')` correctly canonicalizes to `[2, 11)`.
- Overlap example: `'[1, 5)'::int4range && '[5, 10)'::int4range` is correctly false (5 is excluded from `[1,5)`).
- Adjacency examples are correct, including `'[1, 5]'::int4range -|- '[6, 10)'::int4range` being true after canonicalization to `[1,6)` and `[6,10)`.
- Difference operator: `'[1, 15)' - '[5, 10)'` correctly errors due to non-contiguous result; `'[1, 15)' - '[10, 20)'` correctly yields `[1, 10)`.
- Bound extraction (`lower`, `upper`, `lower_inc`, `upper_inc`, `lower_inf`, `upper_inf`, `isempty`) all return the documented values.
- `CREATE TYPE inetrange AS RANGE (subtype = inet)` is valid since `inet` has a default B-tree operator class.
- `float8mi` is the correct built-in float8 subtraction function used as `subtype_diff`.
- Exclusion constraint combining `room_id WITH =` and `time_slot WITH &&` correctly requires `btree_gist`.
- Multirange syntax, `tstzmultirange` literal format, and `range_agg` aggregate are all PostgreSQL 14+ features as stated.
- Partial exclusion constraint syntax `EXCLUDE USING GIST (...) WHERE (NOT is_cancelled)` is correct.

## Review Notes
- The "Inefficient Range Comparisons" pitfall labels the two-column `start_time/end_time` comparison query as "Inefficient." With appropriate B-tree indexes this query is not strictly inefficient — the more accurate argument is that the range-type version is clearer, less error-prone (handles boundary inclusivity correctly), and enables GiST/exclusion-constraint patterns. This is a minor framing nuance, not a technical error, so no change was made.
- The blog post does not specify a minimum PostgreSQL version for the core range type features (range types and exclusion constraints have been available since PostgreSQL 9.2 and 9.0 respectively), but it does correctly call out PostgreSQL 14+ for multiranges.
