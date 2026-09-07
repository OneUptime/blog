# Validation Summary: How to Generate Column-Level Lineage from Complex SQL

## Status
validated

## Post Type
Technical implementation guide with PostgreSQL SQL, Python, and OpenLineage JSON examples.

## Technologies Covered
- PostgreSQL SQL: temporary tables, CTEs, joins, filters, window functions, INSERT, and CREATE TABLE AS.
- Column-level lineage, scope resolution, schema snapshots, and metadata identity.
- OpenLineage 1.53.0: Lineage Dataset Facet, transformation classifications, naming conventions, and event types.
- Python dataclasses and set unpacking.

## Sources Consulted
- OpenLineage Lineage Dataset Facet (documentation displayed version 1.53.0): https://openlineage.io/docs/spec/facets/dataset-facets/lineage/
- Lineage facet JSON Schema: https://openlineage.io/spec/facets/1-0-0/LineageFacet.json
- OpenLineage core JSON Schema: https://openlineage.io/spec/2-0-2/OpenLineage.json
- Column lineage transformation vocabulary: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- Dataset naming: https://openlineage.io/docs/spec/naming/
- Dataset type facet: https://openlineage.io/docs/spec/facets/dataset-facets/type/
- Schema dataset facet: https://openlineage.io/docs/spec/facets/dataset-facets/schema/
- OpenLineage object model: https://openlineage.io/docs/spec/object-model/
- PostgreSQL WITH queries: https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL window functions: https://www.postgresql.org/docs/current/tutorial-window.html
- PostgreSQL INSERT: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL CREATE TABLE AS: https://www.postgresql.org/docs/current/sql-createtableas.html
- PostgreSQL CREATE TABLE: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL SELECT (aliases, wildcards, ordering, and query scope): https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL schemas: https://www.postgresql.org/docs/current/ddl-schemas.html
- PostgreSQL search_path and temporary schemas: https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL conditional expressions: https://www.postgresql.org/docs/current/functions-conditional.html
- Python dataclasses: https://docs.python.org/3/library/dataclasses.html
- Python expressions and set displays: https://docs.python.org/3/reference/expressions.html

## Issues Found
1. **Registry lifetime could stop at a transaction boundary.** Replaced the session-or-transaction rule with session-scoped state that tracks transactions, rollback, and ON COMMIT behavior. PostgreSQL temporary tables survive commits by default.
2. **Physical temporary identity was treated as permanently unique.** Clarified that pg_temp_N alone is not a durable session identifier. Physical lifetimes need session/creation evidence in the store; consumers that merge only namespace/name need a unique synthetic identity to distinguish them.
3. **CTE dependency ordering was unconditional.** Limited ordinary dependency-order resolution to non-recursive CTEs and required cycle-aware source propagation or an explicit unsupported result for recursion.
4. **Wildcard expansion used analysis-time schema wording.** Changed this to the schema when the query was resolved, including derived CTE/subquery fields, so later catalog changes do not redefine historical lineage.
5. **Expression rules could erase upstream lineage or misclassify conditional inputs.** Restricted plain IDENTITY to physical column references; required preserving upstream transformations, aggregation, and indirect dependencies when resolving logical fields. Clarified that condition inputs and value inputs can have different classifications. Added a comment documenting that combine() expects context sources already assigned an indirect subtype; changing relation alone cannot classify a predicate.
6. **INSERT arity guidance omitted PostgreSQL's implicit target-list behavior.** Kept exact arity checking for explicit lists and explained that an implicit list can cover the first N columns, with remaining columns supplied by defaults or nulls.
7. **CREATE TABLE AS naming omitted its target column-name list.** Added that this list overrides query output names before aliases and derived-name rules apply.

## Review Notes
- Reviewed the SQL syntax and semantics against PostgreSQL 18 documentation. The example requires existing source tables and a compatible destination table in the same database session; it is not a standalone database setup script. No live PostgreSQL execution was performed.
- The sample's direct order_id source and four additional physical source fields are consistent with its join, filter, and window operations. Retaining WINDOW influences when collapsing the outer rank filter is a producer policy; the specification defines transformation vocabulary but does not prescribe a complete SQL lineage resolver or path-composition algorithm.
- row_number() does not deterministically break ties in ordered_at. PostgreSQL DESC also puts nulls first by default. A production latest-order query should define timestamp nullability and a tie policy; the example remains valid as a lineage illustration.
- The Python example is a small merge helper, not a complete resolver. Its frozen dataclass supports hashing and set deduplication. The snippet was executed with a direct source and an indirect window source to check merging and deduplication.
- The JSON example parses successfully. Its facet properties and references were manually checked against the official LineageFacet schema, including optional transformation description/masking fields. The deliberately shortened DatasetEvent omits required envelope fields eventTime, producer, and schemaURL; it must be wrapped in a complete event before emission. No automated full-event schema validation or event ingestion was performed.
- OpenLineage documentation confirms the lineage facet supersedes columnLineage for overlapping relationships, the postgres namespace/database.schema.table convention, and the artificial JOB_OUTPUT/TEMPORARY representation. DatasetEvents describe structural metadata outside a run; run-level inputs/outputs remain separate.
- All eight linked official documentation pages were consulted successfully. The producer and warehouse example URLs are illustrative identifiers, not operational services; the author URL is attribution, not technical evidence. No CLI commands are included in the article.
