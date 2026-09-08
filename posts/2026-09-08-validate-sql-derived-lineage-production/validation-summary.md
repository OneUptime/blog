# Validation Summary: How to Validate SQL-Derived Lineage Against What Actually Ran in Production

## Status
validated

## Post Type
Technical guide with SQL and Python examples.

## Technologies Covered
- SQL-derived table and column lineage
- Google BigQuery INFORMATION_SCHEMA, jobs API, scripts, and transactions
- Snowflake ACCESS_HISTORY
- OpenMetadata lineage ingestion from query logs
- OpenLineage dataset naming and column lineage semantics
- Python sets and JSON

## Sources Consulted
- [BigQuery JOBS view](https://cloud.google.com/bigquery/docs/information-schema-jobs)
- [BigQuery jobs REST resource](https://cloud.google.com/bigquery/docs/reference/rest/v2/Job)
- [BigQuery INFORMATION_SCHEMA troubleshooting](https://docs.cloud.google.com/bigquery/docs/info-schema-troubleshoot)
- [BigQuery multi-statement transactions](https://docs.cloud.google.com/bigquery/docs/transactions)
- [GoogleSQL DDL statements](https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language)
- [GoogleSQL DML statements](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax)
- [GoogleSQL conditional expressions](https://cloud.google.com/bigquery/docs/reference/standard-sql/conditional_expressions)
- [Snowflake ACCESS_HISTORY](https://docs.snowflake.com/en/sql-reference/account-usage/access_history)
- [OpenMetadata lineage ingestion](https://docs.open-metadata.org/latest/connectors/ingestion/lineage)
- [OpenMetadata lineage workflow through query logs](https://docs.open-metadata.org/latest/connectors/ingestion/workflows/lineage/lineage-workflow-query-logs)
- [OpenLineage column lineage facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
- [Python set types](https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found
1. **Comparison keys omitted required semantics.** The Python example compared only source/target pairs despite requiring operation and grain. Added WRITE and TABLE to each tuple and documented the tuple order, preserving the expected differences.
2. **Canonical identity requirements were too universal.** Not every engine has a separate host/account and every listed catalog level. Qualified the requirement to use the components applicable to the engine; the BigQuery project/dataset/table example remains valid.
3. **Successful statements were insufficient to confirm committed writes.** The extract lacked transaction metadata. Added transaction_id and clarified that transactional writes require a matching successful COMMIT_TRANSACTION before confirmation, with unresolved transactions carried across windows. Added cache_hit to retain the evidence needed for the existing cache caveat.
4. **The view graph reversed the established edge direction.** Changed the arrows to upstream-to-downstream and retained the target schema so the diagram agrees with the earlier representation and SQL.
5. **View-definition edges lacked supporting evidence.** Direct/base access lists do not establish every intermediate dependency. Made the example conditional on the historical view definition confirming the relationships, preventing unsupported VIEW_DEFINITION edges.

## Review Notes
- Confirmed the BigQuery selected fields, success filters, region requirement, cache limitation, and script-parent distinction against official documentation. The six-hour creation-time filter is a bounded sample extract; a continuous collector needs overlap/backfill for jobs completing outside a polling window.
- Verified INSERT SELECT, GROUP BY, CREATE OR REPLACE TABLE AS SELECT, arithmetic, CASE, and boolean filtering against GoogleSQL documentation. Existing datasets/tables, compatible input types, target column order, and warehouse permissions are prerequisites.
- SQL was reviewed against documentation, not executed against a live BigQuery or Snowflake account. No warehouse credentials or test datasets were supplied.
- Executed the Python example and checked its exact set differences. Parsed the example JSON and validation.json successfully.
- The CASE predicate and filter classifications agree with OpenLineage INDIRECT/CONDITIONAL and INDIRECT/FILTER semantics. The example JSON is an illustrative internal representation, not an OpenLineage event schema.
- Snowflake documentation confirms direct/base/modified object evidence, up to three hours of latency, incomplete statement coverage, and omission of intermediate views. ACCESS_HISTORY requires Enterprise Edition or higher. Column source metadata can validate supported mappings without proving complete transformation expressions.
- OpenMetadata query-log ingestion parses logged SQL; it should not be treated as independent evidence of every physical access. Both linked OpenMetadata pages resolve to current versioned documentation.
- All post links were checked. The original Google troubleshooting URL initially failed in the browser tool; its canonical docs.cloud.google.com page loaded successfully. No deprecated API or CLI usage was found; there are no terminal commands or product configuration snippets.
- Precision and recall are conditional coverage metrics as described. Implementations should use consistent eligibility sets and report an undefined/empty denominator explicitly rather than divide by zero.
