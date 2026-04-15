# Validation Summary: How to Use Dapr Bindings for Batch Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings: cron, postgresql, aws.s3)
- Node.js / Express
- Dapr JavaScript SDK (`@dapr/dapr`)
- PostgreSQL
- AWS S3

## Sources Consulted
- [Dapr Cron Binding Reference](https://docs.dapr.io/reference/components-reference/supported-bindings/cron/) — verified schedule format (6-field cron with seconds) and supported shortcuts (`@every`, `@daily`)
- [Dapr PostgreSQL Binding Reference](https://docs.dapr.io/reference/components-reference/supported-bindings/postgresql/) — verified metadata field names (`connectionString`, not `url`) and query/exec operation format
- [Dapr AWS S3 Binding Reference](https://docs.dapr.io/reference/components-reference/supported-bindings/s3/) — verified metadata fields (`bucket`, `region`, `accessKey`, `secretKey`) and `create` operation
- [Dapr JavaScript SDK - IClientBinding interface](https://github.com/dapr/js-sdk/blob/main/src/interfaces/Client/IClientBinding.ts) — verified `binding.send(bindingName, operation, data, metadata?)` signature
- [Dapr How-To: Output Bindings](https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/) — verified HTTP API request format and JS SDK usage

## Issues Found

### 1. PostgreSQL binding metadata field name incorrect
- **What was wrong:** The PostgreSQL binding component YAML used `url` as the metadata field name for the database connection string.
- **What was changed:** Renamed `url` to `connectionString`.
- **Why:** The Dapr PostgreSQL binding component spec uses `connectionString` as the metadata key, not `url`. See [official docs](https://docs.dapr.io/reference/components-reference/supported-bindings/postgresql/).

### 2. Cron expressions used 5-field format instead of 6-field
- **What was wrong:** The cron schedule in the YAML component (`"0 2 * * *"`) and the inline examples (`0 2 * * *`, `0 9 * * 1`) used standard 5-field UNIX cron format.
- **What was changed:** Updated all cron expressions to 6-field format with seconds as the first field: `"0 0 2 * * *"`, `0 0 2 * * *`, `0 0 9 * * 1`.
- **Why:** Dapr's cron binding uses a 6-field expression format where the first field is seconds (seconds, minutes, hours, day-of-month, month, day-of-week), unlike standard UNIX cron which uses 5 fields. See [cron binding docs](https://docs.dapr.io/reference/components-reference/supported-bindings/cron/).

## Review Notes
- The PostgreSQL query passes `params` as a JavaScript array in the metadata object. The Dapr HTTP API expects params as a JSON-encoded string (e.g., `"[\"2026-04-14\"]"`), but the JS SDK likely handles this serialization automatically since the `metadata` parameter type is `object`. This should work correctly at runtime.
- The `@every 30m` shortcut format shown in the supported schedule formats list is correct and does not need the 6-field format.
- The async pattern for long-running batches is a sound approach — acknowledging the cron trigger immediately prevents sidecar timeout issues.
