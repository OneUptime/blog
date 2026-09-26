# How to Feed Cloudability Data to Power BI and Grafana Within API Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Power BI, Grafana, Cost Management

Description: Build a shared Cloudability extraction pipeline with an explicit request budget, staged reporting data, bounded retries, and dashboard freshness controls.

Connecting every dashboard panel directly to a billing API makes request volume depend on the number of viewers. A more predictable design extracts Cloudability data once, stores a validated reporting dataset, and lets Power BI and Grafana read that dataset.

This also gives both tools the same cost metric, view, currency, and extraction timestamp. Rate limiting becomes a property of one ingestion service rather than a problem scattered across dashboards.

## Budget against the documented scope

The current Cloudability API overview describes a limit of 300 requests per minute **per V3 endpoint, per organization**, with HTTP 429 when that limit is reached. Budget across the integrations sharing that organization and endpoint. Do not assume that another API key creates an independent allowance. [IBM API overview](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-about-cloudability)

For an initial operating target, reserve headroom rather than planning exactly 300 calls each minute. A service capped at 120 attempts per minute leaves room for retries and other jobs, but it is only safe if their combined traffic also fits the budget.

Calculate normal and recovery traffic separately:

```text
requests per refresh
  = report submissions
  + status polls
  + result-page requests
  + metadata requests
  + retry attempts
```

For example, 40 reports with one submission, three polls, and two result requests each need 240 calls spread across their respective endpoints. Starting every report and polling aggressively can create a burst even if the hourly average looks small.

## Extract a useful reporting grain

Define the smallest dataset that serves the dashboards. A daily dataset grouped by vendor and a stable business dimension may support dozens of charts without extracting every resource ID.

Document the extraction contract:

- Regional API host and organization.
- Explicit reporting view.
- Metric identifier and currency.
- Date range and allocation setting.
- Dimensions and expected uniqueness key.

Avoid downloading the same data once per widget. Combine compatible metrics into a shared report within the endpoint's supported limits, and reuse the result across consumers.

Cloudability provides synchronous reporting and an asynchronous enqueue/state/results workflow. Use asynchronous reports when query duration makes a long-lived request unreliable, and retrieve results only after completion. Handle all pages for the selected endpoint; a first-page success is not a complete export. [Cost reporting API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)

Cache measure metadata separately from billing results. There is no need to rediscover metric names before each dashboard refresh.

## Centralize pacing and retry state

Use one scheduler or a shared rate limiter keyed by organization and endpoint. Every attempt, including retries and status checks, consumes the budget.

The following is an implementation outline, not Cloudability-specific client code:

```text
for each pending request:
    wait for a shared rate-limit permit
    send with connection and response timeouts
    if successful:
        persist response and advance the job checkpoint
    else if response is 429:
        honor Retry-After if supplied
        otherwise schedule exponential backoff with jitter
        stop after the configured retry or time budget
    else if response is a retryable transient failure:
        schedule a bounded retry
    else:
        fail the job with the non-secret response details
```

Do not retry authentication and validation errors indefinitely. Fix the key, authorization, or request. Also avoid immediately re-enqueuing an expensive report when a status poll times out; retain its report identifier and continue checking that job.

For a single sequential worker, spacing attempts by at least half a second provides a conservative local ceiling near 120 per minute. Once multiple workers exist, independent half-second delays no longer enforce a shared limit. Move permit allocation into shared storage or route requests through one dispatcher.

## Publish complete snapshots

Load results into a staging area first. Validate the schema, row count, page completion, and total before replacing the published dataset. Keep the last successful snapshot available when a new extraction fails.

A simple PostgreSQL table for a deliberately limited daily-vendor report could be:

```sql
CREATE TABLE cloudability_daily_vendor (
    report_key text NOT NULL,
    usage_date date NOT NULL,
    vendor text NOT NULL,
    currency text NOT NULL,
    amount numeric(24, 8) NOT NULL,
    extracted_at timestamptz NOT NULL,
    PRIMARY KEY (report_key, usage_date, vendor, currency)
);
```

`report_key` identifies a versioned query definition, including metric, view, and allocation policy. If you add account or team dimensions, include them in the table's grain and uniqueness constraint. Do not collapse distinct rows just because their dates and vendors match.

Replace each refreshed partition transactionally. Append-only ingestion either duplicates costs when uniqueness is not enforced or fails on the primary key above when the same rows are inserted again; billing data often needs correction or reprocessing.

## Connect the dashboards to the published data

Power BI can read PostgreSQL through its Power Query connector. Configure its server, database, authentication, and the appropriate gateway or connectivity path for the deployment. Import the published table or a curated database view rather than the intermediate staging tables. [Microsoft PostgreSQL connector](https://learn.microsoft.com/en-us/power-query/connectors/postgresql)

Grafana's PostgreSQL datasource supports SQL queries and time-series output. A daily graph can query the same curated data, with a timestamp column named `time` and a numeric amount, sorted by `time`, while filtering to one report definition and currency. Cast `usage_date` to a timestamp for this output and select the Time series query format. [Grafana PostgreSQL query editor](https://grafana.com/docs/grafana/latest/datasources/postgres/query-editor/)

Give dashboard identities read access only to the published dataset. Keep the Cloudability key in the extractor's secret store. If the extracted view contains sensitive team costs, enforce equivalent access controls in the reporting store.

## Make freshness visible

Display the last successful extraction time and covered billing dates. Track request attempts, 429 responses, retry exhaustion, incomplete pages, and reconciliation failures in the ingestion service.

Choose refresh frequency from the business need and source freshness, then stagger jobs. Reload periods affected by a historical mapping reprocess rather than repeatedly downloading all history.

The result is a stable reporting service: dashboard usage grows independently of Cloudability API traffic, and failed refreshes remain visible without replacing complete data with a partial total.
