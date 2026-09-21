# How to Run Cross-Region Analytics Without Copying Raw Customer Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, Data Analytics, BigQuery, Data Privacy, Data Aggregation

Description: Compute regional aggregates, review their disclosure risk, and export a versioned result contract instead of giving global analytics access to raw customer tables.

---

A dashboard can compare regions without centralizing their underlying customer records. The useful boundary is between regional computation over raw data and a reviewed set of results that the organization permits to move.

This requires more than replacing a database copy with a federated query. A remote query can still transfer raw records, intermediate results, or sensitive output. Treat the physical execution plan and export destination as part of the design.

## Define what may leave

Create an output contract before implementing the query. Specify allowed dimensions, measures, time granularity, minimum group size, release frequency, and correction policy.

For example, a product-usage dashboard might accept one row per week and product family, containing an event count and a contributing-account count. It should not accept account IDs, free-form product names, URLs, device identifiers, or arbitrary query fragments.

The permitted result remains subject to the organization's data classification. Aggregation alone does not establish anonymity. Small groups, repeated queries, and comparisons between releases can reveal information about contributors.

## Run the raw-data query in the approved location

For BigQuery, use an explicitly located dataset and job. Google documents how dataset and query locations are selected in [BigQuery locations](https://docs.cloud.google.com/bigquery/docs/locations). Do not assume a broad location label has the same boundary as an individual country.

The following GoogleSQL query runs against a fictional regional events table. It writes a regional staging table, so the result can be reviewed before export:

```sql
CREATE OR REPLACE TABLE
  regional_project.approved_exports.weekly_product_usage AS
SELECT
  DATE_TRUNC(DATE(event_time, 'UTC'), WEEK(MONDAY)) AS week_start,
  CASE
    WHEN product_family IN ('core', 'reports', 'automation')
      THEN product_family
    ELSE 'other'
  END AS product_family,
  COUNT(*) AS event_count,
  COUNT(DISTINCT account_id) AS contributing_accounts
FROM regional_project.raw.events
WHERE event_time >= TIMESTAMP('2026-09-07 00:00:00+00')
  AND event_time < TIMESTAMP('2026-09-14 00:00:00+00')
GROUP BY 1, 2
HAVING COUNT(DISTINCT account_id) >= 50;
```

Use an explicitly located job:

```bash
bq --location=europe-west2 query \
  --use_legacy_sql=false < weekly_usage.sql
```

Here `weekly_usage.sql` contains the preceding query, and both datasets must already exist in the approved location. The threshold of 50 is an illustrative policy choice, not a privacy guarantee. Do not export the suppressed groups through a second "debug" result.

## Keep the global system away from raw tables

Use separate service identities for regional computation and global import. The regional job may read raw tables and write the staging dataset. The global job should read only the approved release artifact, never the raw dataset or a general-purpose query endpoint.

Do not grant a global dashboard identity permission to replace the regional SQL. Otherwise, the apparent aggregate boundary becomes an arbitrary query interface.

BigQuery also documents [global queries](https://docs.cloud.google.com/bigquery/docs/global-queries), currently a Preview feature that can operate across locations and transfer data during execution. It requires explicit execution and data-access enablement through the `enable_global_queries_execution` and `enable_global_queries_data_access` settings. Audit those project and organization settings instead of relying on older assumptions that a cross-location query will always fail. Feature enablement is not authorization to move a residency-constrained dataset.

## Review privacy and consistency separately

A release gate should reject unexpected columns, unapproved dimension values, missing dates, invalid counts, and results outside the approved reporting interval. Keep a manifest with query version, source watermark, release ID, and producing region.

For higher-risk analytics, evaluate mechanisms such as BigQuery's [differential privacy support](https://docs.cloud.google.com/bigquery/docs/differential-privacy). Configure privacy units, contribution bounds, and privacy budgets for the actual analysis. Adding noise without controlling repeated releases does not provide a complete privacy design.

Also define how late-arriving events and corrections work. Releasing a tiny delta for a previously published small group can disclose more than publishing a scheduled replacement under a reviewed policy.

## Merge only compatible regional results

Global sums can combine event counts from disjoint regional populations when the metric definition and time window match. Distinct account counts generally cannot be summed if an account can appear in several regions. Document whether the figure means distinct accounts globally or the sum of regional account counts.

Do not average regional averages directly. Export approved numerator and denominator measures when the definition permits it, then compute a weighted result. Treat cross-region identifiers used for deduplication as a separate data-transfer decision.

Test with synthetic sparse groups, overlapping accounts, delayed events, and repeated release IDs. Verify that a missing region produces an explicit incomplete-data state instead of an apparently complete total.

The final evidence should show that raw tables stayed under regional execution and access controls, and that only the reviewed result contract crossed the boundary. Recheck that contract whenever a dashboard adds a dimension or a drill-down feature.
