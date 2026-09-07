# Validation Summary: How to Build MySQL-to-PostgreSQL Column Lineage

## Status
validated

## Post Type
Technical implementation guide with SQL, Python, YAML, and JSON examples.

## Technologies Covered
- MySQL 8.4 metadata, identifiers, data types, and binary logging
- PostgreSQL metadata, identifiers, numeric and temporal types, and transactions
- OpenLineage dataset identities, lineage facets, run events, and dataset versions
- ETL, change data capture, column lineage, and Parquet staging
- Python 3, YAML, and JSON

## Sources Consulted
- OpenLineage naming conventions: https://openlineage.io/docs/spec/naming/
- OpenLineage Lineage Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/lineage/
- OpenLineage Column Lineage Dataset Facet: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- OpenLineage Version Facet: https://openlineage.io/docs/spec/facets/dataset-facets/version_facet/
- OpenLineage run cycle: https://openlineage.io/docs/spec/run-cycle/
- OpenLineage custom facets: https://openlineage.io/docs/spec/facets/custom-facets/
- MySQL INFORMATION_SCHEMA COLUMNS: https://dev.mysql.com/doc/refman/8.4/en/information-schema-columns-table.html
- PostgreSQL information_schema.columns: https://www.postgresql.org/docs/current/infoschema-columns.html
- MySQL identifier case sensitivity: https://dev.mysql.com/doc/refman/8.4/en/identifier-case-sensitivity.html
- PostgreSQL lexical structure: https://www.postgresql.org/docs/current/sql-syntax-lexical.html
- MySQL binary logging formats: https://dev.mysql.com/doc/refman/8.4/en/binary-log-formats.html
- MySQL replication implementation: https://dev.mysql.com/doc/refman/8.4/en/replication-implementation.html
- MySQL source configuration and file-position checkpoints: https://dev.mysql.com/doc/refman/8.4/en/replication-howto-slaveinit.html
- MySQL temporal types: https://dev.mysql.com/doc/refman/8.4/en/datetime.html
- MySQL integer types: https://dev.mysql.com/doc/refman/8.4/en/integer-types.html
- PostgreSQL temporal types: https://www.postgresql.org/docs/current/datatype-datetime.html
- PostgreSQL numeric types: https://www.postgresql.org/docs/current/datatype-numeric.html
- PostgreSQL transaction identifiers: https://www.postgresql.org/docs/current/transaction-id.html
- Python dictionary operations: https://docs.python.org/3/library/stdtypes.html#mapping-types-dict
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **A single checkpoint was said to prove a consumed range.** Replaced this claim with a distinction between a checkpoint and a range. Added start/end positions, source identity, commit-coupled checkpoint advancement, and binlog availability as requirements for useful replay evidence. One coordinate alone does not establish which changes were committed.
2. **The transaction UUID could be mistaken for a PostgreSQL transaction ID.** Clarified that it is an application-assigned commit correlation ID. Native PostgreSQL transaction IDs are not UUIDs.
3. **The checkpoint JSON's relationship to OpenLineage was underspecified.** Identified it as application-defined metadata and explained that emission through OpenLineage requires a custom facet with producer and schema metadata. The example is not itself a complete event or standard checkpoint facet.
4. **The PostgreSQL metadata query omitted its connection prerequisite.** Explicitly required connecting to analytics. Filtering table_catalog does not allow information_schema.columns to inspect another database.
5. **Temporal and unsigned integer terminology was ambiguous.** Replaced timezone-naive timestamp with DATETIME and used the SQL type spelling BIGINT UNSIGNED. MySQL TIMESTAMP performs session-time-zone conversion to and from UTC; DATETIME does not perform that conversion.

## Review Notes
- Confirmed the MySQL and PostgreSQL namespace schemes and dataset name components against OpenLineage naming documentation.
- Confirmed that the current Lineage Dataset Facet supports DatasetEvent field relationships and supersedes the older facet for the relationships it describes. Producer and backend support still need verification in the deployed environment.
- Confirmed metadata column names, ordinal ordering, identifier-case behavior, ordinary SELECT exclusion from binlogging, and row-based logging semantics. The PostgreSQL WHERE snippet is intentionally a replacement predicate, not a standalone statement.
- Parsed the YAML contract and JSON checkpoint successfully. Compiled and executed the Python example: valid mappings passed, and missing source and target columns produced all six expected errors.
- The Python helper checks field existence only. Supply the contract's fields mapping and column-name collections using the canonicalization policy described in the post. Type, nullability, ordering, and coverage checks remain implementation responsibilities explicitly discussed in the article.
- YAML transform labels are application-defined contracts, not built-in SQL functions. The timestamp conversion must honor MySQL session time zone and PostgreSQL timestamp input semantics; a label alone does not implement conversion.
- Reviewed SQL against official catalog documentation; no live MySQL/PostgreSQL services or lineage backend were used. No end-to-end copy, CDC replay, or event-acceptance test was performed.
- All ten linked documentation pages resolved to the intended resources; the author link redirected to the expected GitHub profile. PostgreSQL current documentation resolved to version 18 and OpenLineage documentation displayed version 1.53.0 during review. MySQL checks used the explicitly linked 8.4 manual.
- Schema hashing, mapping versioning, staging boundaries, and canary checks are sound design recommendations, not automatic guarantees provided by OpenLineage or either database.
