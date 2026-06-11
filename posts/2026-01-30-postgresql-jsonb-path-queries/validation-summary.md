# Validation Summary: How to Implement PostgreSQL JSONB Path Queries

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- PostgreSQL (12+)
- JSONB data type
- SQL/JSON path language
- GIN indexes (default and `jsonb_path_ops` operator classes)
- Expression / functional indexes
- Generated columns
- PL/pgSQL functions

## Sources Consulted
- [PostgreSQL JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL JSON Functions and Operators](https://www.postgresql.org/docs/current/functions-json.html)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin-intro.html)
- [PostgreSQL 12 Release Notes](https://www.postgresql.org/docs/12/release-12.html) (for SQL/JSON path language introduction)
- [PostgreSQL Type Conversion - Operators](https://www.postgresql.org/docs/current/typeconv-oper.html)

## Issues Found

1. **Incorrect index type for JSONB (table)**: The comparison table claimed "Indexing: GIN, GiST supported" for JSONB. PostgreSQL only ships a GIN operator class for JSONB (plus btree/hash for full-document equality); there is no native GiST operator class for JSONB. Changed to "GIN supported".

2. **Incorrect operator coverage for `jsonb_path_ops` (mermaid diagram)**: The diagram claimed default `jsonb_ops` supports only `@>, ?, ?|, ?&` and `jsonb_path_ops` supports only `@>`. Per current PostgreSQL docs, both classes also support `@?` and `@@`, with `jsonb_path_ops` additionally supporting `@>, @?, @@` (but not the key-exists family). Updated the mermaid diagram to reflect this.

3. **Misleading SQL comment about `jsonb_path_ops`**: The inline comment on the `CREATE INDEX ... USING GIN (metadata jsonb_path_ops)` example said it "only supports the @> containment operator". Updated the comment to: "Supports @>, @?, and @@ but not the key-exists operators (?, ?|, ?&)".

## Review Notes

- The remaining technical content is accurate, including: SQL/JSON path language introduced in PostgreSQL 12; JSONB binary storage and duplicate-key/key-order semantics; the `->`/`->>`/`#-` operator behavior; `jsonb_path_query`, `jsonb_path_query_array`, `jsonb_path_query_first`, `jsonb_path_exists` function signatures; filter syntax (`?(...)`, `@`, `==`, `&&`, `starts with`, `like_regex` with `i`/`s`/`m` flags); containment semantics including the array-primitive special exception used by `metadata -> 'category' <@ '["electronics","accessories"]'::jsonb`; `jsonb_set`, `-`, `#-` modification operators; and variable injection via the `vars` JSON parameter.
- The comparison `WHERE jsonb_path_query_first(metadata, '$.category') = '"electronics"'` relies on PostgreSQL implicitly casting the unknown string literal to `jsonb` (the LHS type). This works but is subtle; readers may want to write `'"electronics"'::jsonb` explicitly for clarity.
- The `like_regex` documentation also supports the `q` flag (literal string mode), which the post does not mention — not an error, just incomplete.
- The post's claim that GIN indexes are not supported for JSON is accurate (only JSONB has the operator classes), though expression indexes on JSON are technically possible — acceptable simplification.
