# Validation Summary: How to Feed Cloudability Data to Power BI and Grafana Within API Limits

## Status
validated

## Post Type
Technical integration and architecture guide with SQL and implementation pseudocode.

## Technologies Covered
- IBM Cloudability V3 cost reporting API and FinOps reporting
- HTTP rate limiting, retries, and shared request scheduling
- PostgreSQL, SQL schemas, and transactional publishing
- Microsoft Power BI and Power Query
- Grafana PostgreSQL datasource

## Sources Consulted
- [IBM: About the Cloudability API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-about-cloudability) — organization/endpoint rate-limit scope, HTTP 429, and reporting views.
- [IBM: Cost Reporting End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point) — synchronous and asynchronous endpoints, measures, multiple metrics/dimensions, pagination, and report metadata.
- [IBM: Getting started with Cloudability API V3](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=api-getting-started-cloudability-v3) — regional hosts, authentication, and permissions.
- [IBM: Data Reprocess](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=setup-data-reprocess) — retrospective refresh after mapping, account-group, and tag changes.
- [Microsoft: PostgreSQL connector](https://learn.microsoft.com/en-us/power-query/connectors/postgresql) — Power BI support, Import, authentication, and connectivity/gateway options.
- [Grafana: PostgreSQL query editor](https://grafana.com/docs/grafana/latest/datasources/postgres/query-editor/) — SQL queries, time-series format, time column requirements, and sorting.
- [Grafana: Configure the PostgreSQL data source](https://grafana.com/docs/grafana/latest/datasources/postgres/configure/) — database connectivity and restricted database-user permissions.
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html) — column declarations, NOT NULL, and composite primary keys.
- [PostgreSQL: Numeric Types](https://www.postgresql.org/docs/current/datatype-numeric.html) — numeric precision and scale.
- [PostgreSQL: Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html) — date and timestamptz types.
- [PostgreSQL: Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html) — atomic publication and visibility of committed changes.
- [RFC 6585, section 4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) — HTTP 429 and optional Retry-After.
- [RFC 9110, section 10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3) — Retry-After semantics.

## Issues Found
- **Append-only behavior with the supplied primary key:** The original wording stated that repeated append-only ingestion duplicates costs. With this schema, identical keys instead cause a uniqueness violation. Updated the sentence to distinguish duplicate costs without uniqueness enforcement from insert failures with the supplied primary key. Transactional replacement remains appropriate for corrections.
- **Grafana time-series query requirements:** The original description mentioned only a time column and numeric amount. Clarified that the timestamp column must be named `time`, results must be sorted by it, and the query must use Time series format. Added the required date-to-timestamp conversion for the example table's `usage_date` column.

## Review Notes
- Confirmed the current IBM API overview specifies 300 requests per minute per V3 endpoint per organization. Older IBM Community material describes a per-user limit; the review follows the current product documentation.
- Confirmed the example arithmetic: 40 × (1 submission + 3 polls + 2 result requests) = 240 attempts. A sequential worker spacing attempts by at least 0.5 seconds has a nominal ceiling of 120 attempts per minute. This is a local operating target, not a guarantee against throttling from other integrations.
- The request-budget and retry blocks are explicitly pseudocode, not executable client implementations. Their shared permits, bounded retries, checkpoint retention, and conditional Retry-After handling are appropriate. Production Retry-After parsing must support both an HTTP date and a delay in seconds.
- Confirmed the reporting documentation lists run, measures, enqueue, state, and results endpoints, supports multiple dimensions/metrics, and documents pagination. The same page includes a separate, ambiguously worded 20-request-per-user note for `reporting/util/enqueue`; it does not establish a 20-per-minute limit for the cost enqueue endpoint, so no such claim was added.
- Reviewed the SQL declaration against PostgreSQL documentation: the types, numeric(24, 8), NOT NULL constraints, and composite primary key are valid. No live PostgreSQL execution or authenticated Cloudability/Power BI/Grafana integration test was performed; this is a documentation and static review.
- Shared extraction, metadata caching, staged validation, preserved successful snapshots, least-privilege dashboard access, and freshness monitoring are sound design recommendations. A report definition and its uniqueness key must continue to reflect the complete selected grain.
- Referenced technical links identify the intended official resources. Direct IBM page fetches returned HTTP 403 through the browsing tool; the relevant official page content was available through search-indexed documentation and was checked there.
- No terminal commands, deployable configuration snippets, deprecated API calls, or pinned software-version claims appear in the post. Changes were limited to the two technical corrections above.
