# Validation Summary: How to Set Up Alerts Based on MongoDB Profiler Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Admin API (v1.0)
- MongoDB Database Profiler (`system.profile`)
- MongoDB Aggregation Framework (`$regexMatch`, `$cond`, `$group`)
- MongoDB Atlas CLI (`atlas performanceAdvisor`)
- Node.js (MongoDB driver, `fetch` API)
- Slack Webhooks
- Cron (Linux scheduling)

## Sources Consulted
- MongoDB Atlas Admin API v2 OpenAPI Specification (https://github.com/mongodb/openapi)
- MongoDB Atlas Alert Host Metrics Reference (https://www.mongodb.com/docs/atlas/reference/alert-host-metrics/)
- MongoDB Atlas Alert Conditions Reference (https://www.mongodb.com/docs/atlas/reference/alert-conditions/)
- MongoDB Atlas CLI: performanceAdvisor suggestedIndexes list (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-performanceAdvisor-suggestedIndexes-list/)
- MongoDB Database Profiler documentation (https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/)
- MongoDB $regexMatch aggregation operator documentation (https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/)

## Issues Found

1. **Incorrect metric name `QUERY_TARGETING_SCANNED_KEYS_PER_RETURNED`**: The correct Atlas metric name for index keys scanned per document returned is `QUERY_TARGETING_SCANNED_PER_RETURNED` (no "KEYS" in the name). Fixed in the "Available Metric Names" reference table.

2. **Incorrect metric name `OPCOUNTERS_QUERY`**: The correct Atlas metric name uses the singular prefix: `OPCOUNTER_QUERY` (no trailing "S"). The full family uses `OPCOUNTER_` not `OPCOUNTERS_`. Fixed in the "Available Metric Names" reference table.

3. **Invalid Atlas CLI flag `--clusterName` on `performanceAdvisor suggestedIndexes list`**: The `atlas performanceAdvisor suggestedIndexes list` command requires `--processName` (hostname:port format), not `--clusterName`. Fixed to use `--processName` with a representative example value.

## Review Notes
- The post uses the Atlas Admin API v1.0 (`/api/atlas/v1.0/`), which is deprecated. The current version is v2.0 (`/api/atlas/v2/`), which also requires a versioned `Accept` header (e.g., `application/vnd.atlas.2023-02-01+json`). The v1.0 examples still work but readers building new integrations should use v2.0.
- The monitoring script in Step 2 uses `setInterval` for recurring execution, while Step 4 shows running the same script via cron. If both are applied together, each cron invocation starts a new persistent Node.js process with its own interval, causing resource leaks and duplicate alerts. Readers should choose one approach: either run as a long-lived daemon (with `setInterval`) or as a cron job (removing `setInterval` and `checkSlowQueries()` call at the bottom).
- The `fetch` API used in the Slack webhook function requires Node.js 18+, which is a reasonable assumption for 2026 but worth noting for readers on older runtimes.
