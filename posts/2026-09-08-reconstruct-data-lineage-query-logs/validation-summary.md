# Validation Summary: How to Reconstruct Data Lineage from Query Logs When Pipeline Code Is Missing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SQL and dialect-aware lineage parsing
- Google BigQuery job history, GoogleSQL MERGE, and multi-statement queries
- PostgreSQL statement logging, pg_stat_statements, name resolution, and transactions
- Snowflake ACCESS_HISTORY
- OpenMetadata lineage ingestion
- OpenLineage dataset naming

## Sources Consulted
- BigQuery JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery jobs REST resource: https://cloud.google.com/bigquery/docs/reference/rest/v2/Job
- BigQuery INFORMATION_SCHEMA introduction: https://cloud.google.com/bigquery/docs/information-schema-intro
- GoogleSQL DML and MERGE syntax: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery multi-statement queries: https://cloud.google.com/bigquery/docs/multi-statement-queries
- Snowflake ACCESS_HISTORY: https://docs.snowflake.com/en/sql-reference/account-usage/access_history
- PostgreSQL error reporting and logging: https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL pg_stat_statements: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL schemas and search path: https://www.postgresql.org/docs/current/ddl-schemas.html
- PostgreSQL identifier lexical rules: https://www.postgresql.org/docs/current/sql-syntax-lexical.html
- PostgreSQL transactions: https://www.postgresql.org/docs/current/tutorial-transactions.html
- OpenMetadata lineage ingestion: https://docs.open-metadata.org/latest/connectors/ingestion/lineage
- OpenLineage naming conventions: https://openlineage.io/docs/spec/naming/

## Issues Found
1. The MERGE explanation claimed that SQL text proved a successful write and read. Changed it to describe logical dependencies and require successful, committed execution for an observed write edge. Successful MERGE can affect zero rows; runtime failures are also possible.
2. The PostgreSQL logging description omitted query-ID restrictions. Added the computation requirement and the documented fact that `%Q` is always zero in `log_statement` messages.
3. The outcome discussion conflated parsing failures with execution failures. Distinguished a failed database execution from a lineage parser failing to understand SQL that the database successfully executed.
4. Deduplication guidance did not distinguish execution IDs from PostgreSQL normalized-query identifiers. Explicitly require execution identity, include project scoping, and exclude PostgreSQL query identifiers as sufficient execution keys.
5. The coverage example divided a transaction count by a statement count. Changed the metric to writes with known commit outcome and explicitly defined the common statement denominator. All displayed percentages round correctly to one decimal place.

## Review Notes
- The BigQuery export columns, region-qualified view, query-job filter, and timestamp expression match the documented interface. The example is a SELECT for extraction; persisting its results requires an export or ingestion mechanism.
- BigQuery JOBS includes running jobs and 180 days of history. Ingestion must revisit unfinished jobs to obtain terminal status. DONE alone is not success; error information and transaction outcome matter.
- The MERGE syntax is valid GoogleSQL for existing tables with compatible columns. Multiple source rows matching one target row for an update can cause a runtime error; the example does not guarantee source-key uniqueness.
- The JSON evidence record is valid illustrative JSON. Its confidence states, outcome label, parser version, and temporary-node URI are application-defined examples, not prescribed vendor or OpenLineage schemas.
- The referenced documentation links resolve to the intended resources, including redirects. PostgreSQL current documentation resolved to version 18 and OpenMetadata latest to v2.0.x during review.
- Historical catalog resolution, scope-aware parsing, temporary-object preservation, unresolved procedure nodes, immutable evidence, and workload-specific aging are sound design guidance. Engine access history remains subject to documented coverage limitations.
- No terminal commands or deployable configuration snippets are present. Review used official documentation and static inspection; no warehouse connection or live database fixtures were available, so SQL was not executed against a database.
