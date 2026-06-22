# Validation Summary: How to Use PostgreSQL Arrays and Array Operations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL arrays
- SQL array operators and functions
- GIN indexes
- GiST indexes with the `intarray` extension

## Sources Consulted
- PostgreSQL 18 Documentation: Arrays - https://www.postgresql.org/docs/current/arrays.html
- PostgreSQL 18 Documentation: Array Functions and Operators - https://www.postgresql.org/docs/current/functions-array.html
- PostgreSQL 18 Documentation: GIN Indexes - https://www.postgresql.org/docs/current/gin.html
- PostgreSQL 18 Documentation: intarray extension - https://www.postgresql.org/docs/current/intarray.html

## Issues Found
- The post showed `CREATE INDEX ... USING GIST(tags gist_array_ops)` for a `TEXT[]` column. PostgreSQL documents built-in GIN `array_ops` for general arrays, while GiST array operator classes are provided by the `intarray` extension for integer arrays. Changed the example to create `intarray` and use `gist__int_ops` on the existing `ratings INTEGER[]` column.
- The sorting example was labeled "PostgreSQL 14+", but the shown `array_agg(... ORDER BY ...)` pattern is valid for the post's PostgreSQL 10+ baseline. Removed the inaccurate version caveat.
- The count-occurrences example used `array_length(array_positions(...), 1)`, which returns `NULL` for an empty result instead of `0`. Changed it to `cardinality(array_positions(...))`.
- The performance section called single-element array assignment "WRONG" and recommended `array_replace(tags, tags[1], ...)`, which changes every matching value rather than only the first element. Updated the wording and example to describe the actual behavior accurately.
- Clarified that negative array indexes do not mean "from the end"; PostgreSQL arrays can have non-default lower bounds, including negative subscripts, but they are not Python-style reverse indexes.

## Review Notes
PostgreSQL 10 is no longer a supported PostgreSQL release as of this review date, but the post's SQL examples are still valid for the stated PostgreSQL 10+ feature baseline after the corrections above.
