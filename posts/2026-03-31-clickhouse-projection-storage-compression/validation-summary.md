# Validation Summary: How to Optimize Projection Storage with Compression in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse Projections
- ClickHouse Compression Codecs (Delta, ZSTD, Gorilla)
- ClickHouse System Tables (system.parts, system.projection_parts)

## Sources Consulted
- ClickHouse MergeTree documentation — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree (projections section)
- ClickHouse system.projection_parts table documentation — https://clickhouse.com/docs/operations/system-tables/projection_parts
- ClickHouse system.parts table documentation — https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse ALTER PROJECTION documentation — https://clickhouse.com/docs/sql-reference/statements/alter/projection
- ClickHouse CREATE TABLE / codec documentation — https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse GitHub issue #74234 (proposed per-column codec overrides in projections)

## Issues Found

1. **Incorrect claim about overriding codecs inside projection definitions (line 23)**
   - **What was wrong:** The post stated "You can override this per column inside the projection definition when creating the table from scratch." This is not currently possible in ClickHouse. Projection definitions only support SELECT ... GROUP BY ... ORDER BY syntax; there is no syntax for specifying per-column CODECs inside a projection. This capability has been proposed (GitHub issue #74234) but is not implemented.
   - **What was changed:** Replaced the sentence with: "To control the codec used inside a projection, set it on the corresponding column in the parent table definition."
   - **Why:** The original claim would mislead readers into attempting invalid syntax. The correct approach is to set the codec on the parent table's column, which the projection then inherits.

2. **Misleading codec recommendation table entry (line 79)**
   - **What was wrong:** The table listed "LowCardinality + ZSTD" in the "Recommended codec" column for low-cardinality strings. `LowCardinality` is a data type wrapper (`LowCardinality(String)`), not a compression codec. Listing it alongside actual codecs like Delta and Gorilla in a codec recommendation table implies it can be used in a `CODEC(...)` chain, which is incorrect.
   - **What was changed:** Changed the entry to "Use LowCardinality type + ZSTD codec" to make clear that LowCardinality is a type, not a codec.
   - **Why:** Prevents readers from attempting `CODEC(LowCardinality, ZSTD)`, which is invalid syntax.

## Review Notes
- The claim that projections inherit codecs from parent table columns (issue #5 in review) is architecturally consistent and practically correct, but is not explicitly stated in the official ClickHouse documentation. This is a minor documentation gap, not an error in the blog post.
- All SQL examples (CREATE TABLE, ALTER TABLE ADD/DROP/MATERIALIZE PROJECTION, system table queries) use valid syntax and correct column references.
- The Gorilla codec on Float64 and Delta codec on DateTime are both valid and well-suited use cases per official documentation.
- The `MATERIALIZE PROJECTION ... IN PARTITION` syntax is correctly documented.
