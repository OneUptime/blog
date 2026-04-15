# Validation Summary: How to Use Dapr Bindings for ETL Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr bindings (cron, MySQL, AWS S3)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr CLI (`dapr run`)
- Node.js / Express
- MySQL
- AWS S3

## Sources Consulted
- Dapr cron binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/cron/
- Dapr MySQL binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/mysql/
- Dapr AWS S3 binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr JavaScript SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr CLI run command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Cross-referenced with validated Dapr posts in this repo: `dapr-binding-mysql`, `dapr-how-to-use-dapr-mysql-output-binding`, `dapr-how-to-use-dapr-redis-binding-for-cache-operations`, `dapr-docker-compose-integration-testing`, `dapr-test-event-driven-systems`, `dapr-bindings-webhook-integration`

## Issues Found
1. **Deprecated `--components-path` CLI flag**: The `dapr run` command used `--components-path`, which has been deprecated in favor of `--resources-path`. Updated to `--resources-path` to match current Dapr CLI documentation and avoid deprecation warnings. This same fix has been applied consistently across other validated Dapr posts in this repo.

## Review Notes
- The cron binding component uses a standard 5-field cron expression `"0 * * * *"` (every hour at minute 0), which is valid — the Dapr cron binding (backed by robfig/cron) supports both 5-field and 6-field formats.
- The MySQL binding `query` operation with SQL passed in the metadata `{ sql: "..." }` matches the documented Dapr MySQL binding API.
- The AWS S3 binding `create` operation with `key` and `contentType` metadata is correct per the S3 binding spec.
- The `client.binding.send(name, operation, data, metadata)` 4-parameter form is the correct signature for the `@dapr/dapr` JavaScript SDK, confirmed by multiple validated posts in this repo.
- The `secretKeyRef` pattern for AWS credentials in the S3 component is a valid Dapr secret store reference pattern.
- The batching helper function is logically correct and a reasonable pattern for handling large datasets.
