# Validation Summary: How to Preserve Historical Lineage Through Schema Evolution

## Status
validated

## Post Type
Technical guide with SQL schema definitions, a parameterized query, an OpenLineage JSON example, and a custom YAML migration manifest.

## Technologies Covered
- Data lineage, schema evolution, stable identities, and metadata governance
- PostgreSQL version tables, temporal queries, and DDL event triggers
- OpenLineage dataset identity, lifecycle, schema, and version facets
- MySQL 8.4 binary logging and replication filtering
- JSON and YAML

## Sources Consulted
- OpenLineage object model: https://openlineage.io/docs/spec/object-model/
- OpenLineage lifecycle facet: https://openlineage.io/docs/spec/facets/dataset-facets/lifecycle_state_change/
- Lifecycle facet JSON Schema: https://openlineage.io/spec/facets/1-0-0/LifecycleStateChangeDatasetFacet.json
- OpenLineage schema facet: https://openlineage.io/docs/spec/facets/dataset-facets/schema/
- OpenLineage version facet: https://openlineage.io/docs/spec/facets/dataset-facets/version_facet/
- OpenLineage naming conventions: https://openlineage.io/docs/spec/naming/
- PostgreSQL CREATE TABLE and primary key semantics: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL range bounds and exclusion constraints: https://www.postgresql.org/docs/current/rangetypes.html
- PostgreSQL prepared query parameters: https://www.postgresql.org/docs/current/sql-prepare.html
- PostgreSQL event trigger functions: https://www.postgresql.org/docs/current/functions-event-triggers.html
- PostgreSQL event triggers: https://www.postgresql.org/docs/current/event-triggers.html
- PostgreSQL event timing and rollback behavior: https://www.postgresql.org/docs/current/event-trigger-definition.html
- MySQL 8.4 binary log format, including temporary-table exceptions: https://dev.mysql.com/doc/refman/8.4/en/binary-log-setting.html
- MySQL row-based logging: https://dev.mysql.com/doc/refman/8.4/en/replication-rbr-usage.html
- MySQL database-level filtering and DDL: https://dev.mysql.com/doc/refman/8.4/en/replication-rules-db-options.html
- MySQL replication filtering: https://dev.mysql.com/doc/refman/8.4/en/replication-rules.html
- MySQL binary log expiration and configuration: https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html
- Author profile link verified: https://github.com/nawazdhandala

## Issues Found
1. **Migration operation mismatch.** The YAML declared `rename_column` but changed dataset names without naming a column. Changed it to `rename_table` and identified the manifest as a custom example, rather than implying a standard migration-tool format. Migration intent alone does not prove deployment success.
2. **Incomplete catalog-belief history.** The original correction instructions suggested inserting another observation into tables keyed by stable ID and effective start time. Such an insert can violate the primary key, and one `observed_at` value cannot reconstruct overwritten beliefs. Clarified that these tables represent the latest corrected effective-time history and require a separate append-only audit log retaining original observations and all validity changes. Historical catalog beliefs require replay to an observation cutoff. Adjusted the conclusion to distinguish immutable observations from corrected version tables.
3. **Overlapping intervals.** Half-open bounds remove boundary duplication only when versions do not overlap. Added the requirement to enforce non-overlap per stable ID through ingestion transactions or exclusion constraints; the shown primary keys alone are insufficient.
4. **DDL completion versus commit.** Specified the required `ddl_command_end` and `sql_drop` contexts. Added transactional evidence persistence and post-commit publication because the callbacks run before commit and the transaction can still roll back. Clarified that dropped-object schema and name can be NULL.
5. **MySQL logging scope.** Qualified the DDL statement-logging claim with the temporary-table exception under row-based logging and clarified that settings, retention, and filters along the capture path affect completeness.
6. **Query execution context.** Clarified that `$1` is a bound `timestamptz` parameter for a prepared query, not a standalone SQL literal.

## Review Notes
- Confirmed the six lifecycle enum values, `previousIdentifier` fields, facet schema URL, and PostgreSQL dataset naming format against OpenLineage documentation. The JSON is a dataset fragment, not a complete event envelope. Example `.example` hosts are intentional placeholders.
- Stable internal IDs, identity review, tombstones, scoped aliases, deduplication, and snapshot reconciliation are application design recommendations, not automatic OpenLineage or PostgreSQL functionality.
- Storage-defined dataset versions and separate transformation-edge history are appropriate. Schema-only observations cannot establish changes in transformation semantics.
- The tables remain illustrative: audit replay, tombstone storage, identity registries, edge traversal, and ingestion transactions require application implementation. No new sections or schema redesign were added to the post.
- Parsed the JSON and YAML examples. Checked SQL definitions and parameter usage against PostgreSQL documentation; all three CREATE TABLE statements and the prepared as-of query also executed successfully in a disposable local PostgreSQL cluster. The query ran against empty tables, so this verifies SQL execution rather than end-to-end lineage or audit replay behavior. The temporary server was stopped and its files removed.
- Official documentation links resolve to the intended resources. PostgreSQL current documentation resolved to version 18; MySQL references explicitly target 8.4. No deprecated API usage was found in the post.
