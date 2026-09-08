# How to Validate SQL-Derived Lineage Against What Actually Ran in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, SQL, Observability, Data Quality, Data Engineering

Description: Reconcile parser-derived dependencies with successful warehouse execution evidence and quantify every unresolved or contradictory edge.

---

A SQL parser can produce a plausible lineage graph from a query that never ran. It can also miss dependencies hidden behind views, dynamic SQL, procedures, policies, or engine-specific syntax. Production execution history supplies a second view of reality, but it has limitations of its own.

Validation works by comparing evidence classes, not by declaring either source universally correct:

```text
declared SQL or compiled artifact
        versus
successful production execution evidence
```

The mismatches show where the lineage system needs better context, coverage, or semantics.

## Define comparable edge sets

Normalize both sources into the same representation:

```json
{
  "upstream": "bigquery:acme.raw.orders",
  "downstream": "bigquery:acme.analytics.daily_orders",
  "operation": "WRITE",
  "fieldMappings": [],
  "queryId": "bquxjob_123",
  "evidence": "WAREHOUSE_HISTORY"
}
```

Canonical identity must include platform and the applicable account or host, database or project, schema or dataset, and object components for that engine. Resolve unqualified names with the catalog and session context effective when the query ran. Preserve the original spelling and query ID for debugging.

Use set comparison per execution, with tuples ordered as upstream, downstream, operation, and grain:

```python
parser_edges = {
    ("acme.raw.orders", "acme.analytics.daily_orders", "WRITE", "TABLE"),
    ("acme.raw.customers", "acme.analytics.daily_orders", "WRITE", "TABLE"),
}

observed_edges = {
    ("acme.raw.orders", "acme.analytics.daily_orders", "WRITE", "TABLE"),
    ("acme.raw.customers", "acme.analytics.daily_orders", "WRITE", "TABLE"),
    ("acme.security.allowed_customers", "acme.analytics.daily_orders", "WRITE", "TABLE"),
}

missing_from_parser = observed_edges - parser_edges
not_confirmed_at_runtime = parser_edges - observed_edges
```

Do not compare only table-name strings. Include direction, operation, and grain. A parser that gets both names right but reverses source and target has failed.

## Capture only completed production executions

Build the observed set from warehouse records that identify both the execution and its outcome. For writes, require success and, where available, transaction commit.

BigQuery's `INFORMATION_SCHEMA.JOBS` view exposes fields including query text, query ID, parent job ID, statement type, state, errors, referenced tables, destination table, and labels. A validation extract can retain the raw arrays for later normalization:

```sql
SELECT
  job_id,
  parent_job_id,
  transaction_id,
  cache_hit,
  creation_time,
  statement_type,
  state,
  error_result,
  query,
  referenced_tables,
  destination_table,
  labels
FROM `acme-prod.region-us.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND error_result IS NULL;
```

Run the query in the matching location and export each relevant region. This extract identifies successful statements, not necessarily committed writes. For a non-null `transaction_id`, require a successful `COMMIT_TRANSACTION` job with the same transaction ID before confirming durable output; keep unresolved transactions pending across extraction windows. `referenced_tables` is documented as populated only for non-cache-hit query jobs, so absence on a cache hit cannot invalidate a parsed read edge.

Multi-statement scripts have parent and child jobs. Validate statement-level child jobs and use `parent_job_id` to keep the execution together. Do not count the script parent as a duplicate transformation.

Snowflake's `ACCOUNT_USAGE.ACCESS_HISTORY`, when available for the account and use case, exposes direct and base objects accessed as well as objects modified. That distinction is useful for comparing a parser's view reference with the warehouse's expanded base-table access. Account for documented latency and access controls before setting a validation SLO.

## Compare at several semantic levels

One pass cannot answer every lineage question. Score each execution at increasing precision:

1. **Target detection**: was the durable output identified?
2. **Direct input detection**: were named tables and views identified?
3. **Base input detection**: were dependencies through views expanded correctly?
4. **Column mapping**: were value-producing input fields mapped to output fields?
5. **Indirect influence**: were join, filter, group, window, and condition fields classified?
6. **Outcome**: did the graph avoid failed or rolled-back writes?

An engine may expose table access without column transformation expressions. Use that evidence to validate levels one through three, not to claim that level four passed.

## Explain mismatches before correcting them

Classify every difference. Common `missing_from_parser` causes are:

- view expansion used a stale or absent definition
- a stored procedure or trigger executed nested SQL
- dynamic SQL resolved an object name only at runtime
- a row-access or masking policy read an additional object
- an external table or table function hid a physical dependency
- the parser used the wrong dialect or name-resolution context

Common `not_confirmed_at_runtime` causes are:

- warehouse history is incomplete, late, filtered, or outside retention
- a cache hit omitted referenced-table metadata
- the optimizer eliminated an unused branch
- conditional SQL did not execute that branch for this run
- the parser expanded all possible dynamic targets
- a failed or rolled-back statement never produced durable output

“Parser false positive” should be the result of this classification, not the default label for every missing warehouse record.

## Use direct objects and base objects deliberately

Suppose the query reads a view:

```sql
INSERT INTO analytics.active_customer_count
SELECT region, COUNT(*)
FROM governed.active_customers
GROUP BY region;
```

The parser sees the direct object `governed.active_customers`. The warehouse may report base tables such as `raw.customers` and `security.account_status`. Both graphs can be correct at different abstraction levels.

If the view definition effective at execution time confirms these dependencies, keep both relationships, using upstream-to-downstream arrows. Direct and base access lists alone do not reconstruct intermediate view definitions:

```text
governed.active_customers -> analytics.active_customer_count DIRECT_REFERENCE
raw.customers -> governed.active_customers                   VIEW_DEFINITION
security.account_status -> governed.active_customers        VIEW_DEFINITION
```

Do not flatten the view away unless the consumer explicitly asks for root sources. Preserving the boundary explains ownership and where a change should be made.

## Validate column lineage with controlled fixtures

Production access history rarely proves the exact expression-to-field mapping by itself. Create dialect-specific canary queries with known semantics:

```sql
CREATE OR REPLACE TABLE lineage_test.output AS
SELECT
  order_id,
  quantity * unit_price AS gross_amount,
  CASE WHEN status = 'refunded' THEN 1 ELSE 0 END AS refund_flag
FROM lineage_test.input
WHERE is_test = false;
```

Expected mappings are:

- `order_id` directly derives from `order_id`
- `gross_amount` directly derives from `quantity` and `unit_price`
- `status` indirectly influences `refund_flag` through a conditional; the output values are literals rather than copied source values
- `is_test` influences output membership as a filter and is not copied into every output value

Run fixtures on the actual engine version, parser version, and catalog-resolution rules used in production. Include quoted names, nested queries, CTEs, views, joins, aggregates, windows, `MERGE`, temporary tables, and one unsupported construct that must be reported as unresolved.

## Join declared and observed records reliably

The best correlation key is an engine query or statement ID propagated into lineage metadata. When an application can set labels or session metadata, also attach the orchestrator run ID and code version.

Avoid matching solely by timestamp and normalized SQL. Retries can overlap, and identical SQL can run concurrently in different environments.

If exact correlation is impossible, match using a constrained tuple:

```text
engine account + database + principal + normalized query hash
+ bounded start-time interval + destination + application identity
```

Label the result probabilistic and measure ambiguous matches.

## Turn differences into regression tests

Store a minimized, sanitized query for each parser defect. Add the expected table and column edges as a fixture. On every parser upgrade, run the full corpus and compare:

```text
precision = confirmed parser edges / parser edges eligible for confirmation
recall    = confirmed parser edges / observed edges the parser could represent
```

These metrics require an eligibility definition because warehouse evidence has known blind spots. Publish raw counts beside percentages.

Monitor production by dialect, statement family, connector, and parser version. A global 99 percent score can hide a severe regression in stored procedures or one business-critical warehouse.

## Stage corrections safely

Do not mutate the production graph automatically from a single mismatch. Use this flow:

1. Preserve both source records.
2. Classify the mismatch.
3. Reproduce it with a fixture when possible.
4. Correct parsing, name resolution, or collector configuration.
5. Reprocess the affected evidence window idempotently.
6. Compare the new graph before promoting it.

Keep parser version and source evidence on every edge so a bad release can be rolled back or rebuilt.

## Conclusion

SQL-derived lineage becomes trustworthy when it is continuously challenged by successful production evidence. Normalize identities, compare edge direction and grain, distinguish direct from base objects, respect history blind spots, and convert every confirmed mismatch into a regression fixture. Validation is not a one-time certification; it is an observability loop for the lineage system itself.

## Official Documentation

- [BigQuery `INFORMATION_SCHEMA.JOBS` view](https://cloud.google.com/bigquery/docs/information-schema-jobs)
- [BigQuery jobs REST resource](https://cloud.google.com/bigquery/docs/reference/rest/v2/Job)
- [BigQuery `INFORMATION_SCHEMA` troubleshooting](https://cloud.google.com/bigquery/docs/info-schema-troubleshoot)
- [Snowflake `ACCESS_HISTORY` view](https://docs.snowflake.com/en/sql-reference/account-usage/access_history)
- [OpenMetadata lineage ingestion](https://docs.open-metadata.org/latest/connectors/ingestion/lineage)
- [OpenMetadata lineage workflow through query logs](https://docs.open-metadata.org/latest/connectors/ingestion/workflows/lineage/lineage-workflow-query-logs)
- [OpenLineage Column Level Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
