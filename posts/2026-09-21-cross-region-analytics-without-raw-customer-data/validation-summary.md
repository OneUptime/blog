# Validation Summary: How to Run Cross-Region Analytics Without Copying Raw Customer Data

## Status
validated

## Post Type
Technical guide with GoogleSQL and command-line examples.

## Technologies Covered
- Google BigQuery datasets, regional query jobs, and global queries.
- GoogleSQL aggregation, date and timestamp functions, and table creation.
- The `bq` command-line tool.
- IAM and separate service identities for computation and import.
- Differential privacy, disclosure controls, and cross-region aggregate reconciliation.

## Sources Consulted
- [BigQuery locations](https://docs.cloud.google.com/bigquery/docs/locations): regional dataset and job placement, London location, and multi-region boundaries.
- [BigQuery global queries](https://docs.cloud.google.com/bigquery/docs/global-queries): Preview status, cross-location transfers, enablement settings, and execution permissions.
- [bq command-line tool reference](https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference): global location flag, GoogleSQL selection, and SQL-file input redirection.
- [GoogleSQL DDL statements](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language#create_table_statement): `CREATE OR REPLACE TABLE ... AS SELECT`.
- [GoogleSQL date functions](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/date_functions): timestamp-to-date conversion and Monday-based week truncation.
- [GoogleSQL timestamp functions](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions): timestamp construction with explicit UTC offsets.
- [GoogleSQL aggregate functions](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions): row counts, distinct counts, null handling, and averages.
- [GoogleSQL query syntax](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax): ordinal grouping and aggregate filtering with `HAVING`.
- [GoogleSQL conditional expressions](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/conditional_expressions): searched `CASE` and fallback values.
- [BigQuery IAM roles and permissions](https://docs.cloud.google.com/bigquery/docs/access-control): separation of job execution, table reads, and table writes.
- [Introduction to federated queries](https://docs.cloud.google.com/bigquery/docs/federated-queries-intro): remote execution, returned temporary results, and pushdown behavior.
- [Use differential privacy](https://docs.cloud.google.com/bigquery/docs/differential-privacy): privacy units, contribution limits, privacy parameters, and vulnerabilities.
- [Author profile](https://github.com/nawazdhandala): verified the post's GitHub author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. This was a documentation-based technical review; no query was executed against a live BigQuery project, and no production access or residency controls were tested.
- The SQL correctly groups the half-open UTC interval from September 7 through September 14, 2026 into the week beginning Monday, September 7. Its `CASE` expression restricts output product families, and its `HAVING` clause suppresses groups with fewer than 50 distinct non-null account IDs.
- The fictional project and table names must be replaced for deployment. The example assumes a TIMESTAMP event_time column, suitable product_family and account_id columns, existing regional datasets, and credentials with query and table permissions. COUNT(*) includes events with null account IDs, whereas COUNT(DISTINCT account_id) excludes nulls; real source-data rules should account for this distinction.
- The CLI command uses documented flags and file-input syntax. Both datasets should be in europe-west2 for the illustrated local execution.
- Global queries are documented as Preview. Execution and source-data access are enabled separately by region in the relevant projects or inherited organization configuration. The feature also requires bigquery.jobs.createGlobalQuery permission; enablement alone does not grant execution or table access. Recheck this evolving feature before deployment.
- The privacy guidance correctly avoids treating a group-size threshold as anonymity. Privacy parameters and repeated releases require an analysis-specific policy; the sample query itself does not implement differential privacy.
- The merge guidance is mathematically sound: counts are additive over disjoint populations, overlapping distinct-account counts are not, and averages require matching numerator and denominator definitions. Totals derived from the example cover released groups; suppressed groups must not silently be interpreted as zero activity.
- Release manifests, review gates, correction handling, and synthetic tests are architectural recommendations rather than implemented components in this short example. Production validation should distinguish intentionally suppressed or empty results from missing regional releases and verify release-ID deduplication.
- All three linked BigQuery documentation pages resolved to the intended resources. No deprecated syntax or flags were identified.
