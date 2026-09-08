# How to Reconstruct Data Lineage from Query Logs When Pipeline Code Is Missing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, SQL, Metadata, Data Engineering, Observability

Description: Turn retained query history into evidence-backed lineage while preserving execution context, uncertainty, and coverage gaps.

---

Sometimes the repository is gone, the scheduler was replaced, and the only surviving account of a pipeline is the SQL that reached the warehouse. Query history can recover useful lineage, but it is not a complete pipeline definition. It records what the database observed during a retention window, subject to permissions, truncation, caching, sampling, and engine-specific behavior.

The safe goal is therefore not to recreate a fictional perfect DAG. It is to build an observed lineage graph whose edges carry enough evidence to be checked, aged, and revised.

## Define what a log-derived edge proves

For each edge, keep at least these fields:

```json
{
  "upstream": "bigquery:acme.raw.orders",
  "downstream": "bigquery:acme.analytics.daily_orders",
  "observedAt": "2026-09-08T01:12:42Z",
  "queryId": "bquxjob_123",
  "statementType": "CREATE_TABLE_AS_SELECT",
  "outcome": "SUCCEEDED",
  "evidence": "BIGQUERY_JOBS",
  "parserVersion": "lineage-parser/4.2.0",
  "confidence": "OBSERVED"
}
```

`OBSERVED` means that a successful recorded statement named both datasets in roles the parser could resolve. It does not mean the edge runs every day, that the missing application had no other branch, or that every row in the output came from every input.

Use separate states for weaker evidence:

- `DECLARED` for a manually supplied or schema-defined relationship
- `OBSERVED` for a successfully executed statement
- `INFERRED` for a reviewed heuristic, such as a name match
- `UNRESOLVED` when the parser reached dynamic SQL, an unknown function, or a hidden object

Never silently promote inferred evidence to observed evidence.

## Export history before its retention window closes

First copy the source history to a protected, append-only staging area. Preserve the original record and add an ingestion timestamp and content hash. Useful fields include:

- query or statement ID, parent query ID, session ID, and transaction ID
- query text or a protected reference to it
- submitting principal, client application, labels, and workload identity
- database, schema, role, search path, and engine region
- start and end time, execution status, and error details
- referenced objects, destination objects, and affected-row counts supplied by the engine

BigQuery's `INFORMATION_SCHEMA.JOBS` view provides near-real-time project job metadata. Its documented fields include `query`, `referenced_tables`, `job_id`, `parent_job_id`, labels, statement type, state, and error information. `referenced_tables` is not populated for cache hits, so an empty array is not proof that a query read nothing.

A bounded export can look like this:

```sql
SELECT
  job_id,
  parent_job_id,
  creation_time,
  start_time,
  end_time,
  user_email,
  statement_type,
  state,
  error_result,
  query,
  referenced_tables,
  destination_table,
  labels
FROM `acme-analytics.region-eu.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
  AND job_type = 'QUERY';
```

The qualifier and the query execution location must match. Export every region separately. BigQuery also represents a multi-statement script with a parent job and child jobs; avoid treating the parent and its children as duplicate transformations.

On PostgreSQL, statement logging can include session, process, database, user, application, and query identifiers through `log_line_prefix`. Query identifiers require `compute_query_id` or a module that computes them; `%Q` is always zero on messages emitted by `log_statement`, which logs before the identifier is calculated. Configure and test those fields before relying on logs. `pg_stat_statements` is useful for aggregate workload analysis, but it normalizes structurally equivalent statements into one entry and has a bounded statement set. It cannot replace an execution ledger.

## Resolve names in their execution context

The text `INSERT INTO summary SELECT * FROM orders` is ambiguous without its catalog, database, schema, and search path. Reconstruct the exact session context that controlled name resolution at execution time.

Canonicalize a dataset only after resolution:

```text
platform + account/host + database + schema + object
```

Keep the original spelling too. Quoted identifiers can be case-sensitive, while unquoted identifiers follow engine-specific folding rules. Do not lowercase everything globally.

Resolve views against the definition effective at the query time, not just today's definition. The same applies to synonyms, aliases, and renamed tables. If historical DDL is unavailable, stop at the view node and mark the deeper edge unresolved.

## Parse statement roles, not just table names

A list of mentioned tables is not lineage. The parser must identify which objects were read, written, created, replaced, merged, or dropped.

For example:

```sql
MERGE INTO analytics.customer_balance AS target
USING staging.customer_delta AS source
ON target.customer_id = source.customer_id
WHEN MATCHED THEN
  UPDATE SET balance = target.balance + source.delta
WHEN NOT MATCHED THEN
  INSERT (customer_id, balance) VALUES (source.customer_id, source.delta);
```

This identifies a logical dependency from `staging.customer_delta` to `analytics.customer_balance`, plus a target read during matching and calculation. A successful, committed execution supports an observed write edge, but it may affect zero rows; the SQL text alone does not prove a successful write. Model that self-read explicitly if consumers need change-impact or column-level semantics, but do not create a meaningless self-edge in a table-only graph.

Handle at least these families deliberately:

- `INSERT ... SELECT`, `CREATE TABLE AS`, `CREATE VIEW`, and `MERGE`
- `UPDATE ... FROM` and `DELETE ... USING`
- temporary tables and common table expressions
- multi-statement scripts and transactions
- procedure calls and generated SQL
- table functions, external tables, and engine-specific syntax

Use a parser for the actual SQL dialect. Regex is useful for classifying obvious statements, not for resolving nested queries, quoting, or scopes.

## Require outcome evidence for writes

Treat recorded execution failures as evidence that a statement was attempted, not that an output was produced. A lineage-parser failure leaves the dependency unresolved even when the database execution succeeded. Publish a write edge only when the warehouse reports success according to its transaction semantics.

Buffer statements by transaction when commit information is available. A successful statement followed by a rollback must not become durable output lineage. Autocommit statements can close immediately. When commit status is unavailable, label the edge accordingly instead of guessing.

Reads are also nuanced. A submitted query can fail before reading a table, and an optimizer can eliminate a branch. Query text is evidence of a logical dependency, while engine-provided access history or executed-plan data may provide stronger runtime evidence. Store the evidence type so consumers can distinguish them.

## Preserve intermediate and hidden execution

Temporary tables should initially be nodes scoped by server, session, and creation instance:

```text
temp://warehouse/session-918/tmp_ranked_orders#creation-2
```

Process statements in order, linking creation, reads, and replacement. Once the chain is verified, a derived view can collapse the temporary node for display while retaining it in evidence storage.

A procedure call such as `CALL refresh_finance()` does not expose internal statements in its call text. Capture nested statements, procedure audit records, or engine access history. If none exists, connect the job to an unresolved procedure node. Do not parse today's procedure body and claim that it proves what an older invocation executed.

## Deduplicate without erasing separate executions

At-least-once log export will repeat rows. Use an engine execution ID where it is stable, scoped by account/project and region. PostgreSQL query identifiers identify normalized queries, not individual executions, so they are insufficient for this purpose. Otherwise derive an ingestion identity from immutable source coordinates, not normalized SQL alone.

Keep repeated executions as separate observations. Ten runs of one query are ten pieces of freshness and frequency evidence even if they yield the same graph edge. Maintain a current edge projection with `firstObservedAt`, `lastObservedAt`, and `observationCount`, backed by immutable execution records.

## Measure reconstruction coverage

Publish a coverage report beside the graph, using successful write statements as the denominator for each percentage:

```text
successful write statements:       18,420
statements parsed:                  18,101  (98.3%)
writes with resolved destinations:  17,992  (97.7%)
writes with known commit outcome:   17,644  (95.8%)
executions correlated to a job:     14,803  (80.4%)
```

Quarantine parse failures with sanitized samples, dialect, and error category. Run canary transformations containing a join, aggregate, temporary table, and failed transaction. Assert that the expected edges appear and that rolled-back edges do not.

Finally, expire edges based on source-specific observation windows. An edge not seen for seven days might be stale for an hourly pipeline but normal for a quarterly close. Absence is meaningful only after a complete capture window.

## Conclusion

Query logs can reconstruct dependable observed lineage when every edge remains tied to execution context and outcome. Export history early, resolve names with the historical catalog, parse dialect-aware statement roles, preserve procedures and temporary objects, and publish coverage gaps. The result is narrower than the missing pipeline code, but it is auditable and honest.

## Official Documentation

- [BigQuery `INFORMATION_SCHEMA.JOBS` view](https://cloud.google.com/bigquery/docs/information-schema-jobs)
- [BigQuery jobs REST resource](https://cloud.google.com/bigquery/docs/reference/rest/v2/Job)
- [BigQuery `INFORMATION_SCHEMA` introduction](https://cloud.google.com/bigquery/docs/information-schema-intro)
- [Snowflake `ACCESS_HISTORY` view](https://docs.snowflake.com/en/sql-reference/account-usage/access_history)
- [PostgreSQL error reporting and logging](https://www.postgresql.org/docs/current/runtime-config-logging.html)
- [PostgreSQL `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [OpenMetadata lineage ingestion](https://docs.open-metadata.org/latest/connectors/ingestion/lineage)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
