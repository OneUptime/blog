# Validation Summary: How to Ingest CloudWatch Logs into ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudWatch Logs (subscription filters, `awslogs` event format)
- AWS Lambda (Python runtime)
- AWS CLI (`aws logs put-subscription-filter`)
- ClickHouse (HTTP interface, `JSONEachRow` format, `MergeTree` engine, TTL)
- OpenTelemetry Collector Contrib (`awscloudwatch` receiver, `clickhouse` exporter)
- Python standard library (`base64`, `gzip`, `json`, `urllib.request`)

## Sources Consulted
- AWS CloudWatch Logs subscription filter event format (`awslogs.data` = base64+gzip JSON with `logEvents`, `logGroup`, `logStream`): https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- `aws logs put-subscription-filter` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/logs/put-subscription-filter.html
- ClickHouse HTTP interface auth headers (`X-ClickHouse-User`, `X-ClickHouse-Key`) and `FORMAT JSONEachRow` INSERT: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse `MergeTree` / `LowCardinality` / TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- OTel Contrib `awscloudwatch` receiver source and README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/awscloudwatchreceiver (verified `config.go` — empty `StreamConfig` under `groups.named.<name>` passes validation; `poll_interval` field is valid)
- OTel Contrib `clickhouse` exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter (verified `endpoint` accepts `tcp://` scheme, `database` and `logs_table_name` fields exist)

## Issues Found
No technical issues found.

I initially suspected the OTel `awscloudwatch` receiver's `named` group block required a `names:` or `prefixes:` sub-field under each log group entry. Checking the receiver's `config.go` validator directly confirmed that `NamedConfigs` is a `map[string]StreamConfig` where `StreamConfig` has no required fields and the `GroupConfig.validate()` function does not reject empty entries. The post's config (`/aws/lambda/my-function:` with an empty value) is therefore valid and results in collecting all streams in that log group.

## Review Notes
- The Python Lambda imports `boto3` but never uses it. Harmless (the Lambda Python runtime includes `boto3` by default, so no extra package size), but could be removed for cleanliness in a future pass.
- The Lambda uses `urllib.request.urlopen` with no timeout and no error handling on the ClickHouse response; for production, a timeout and response status check would be prudent. This is outside the scope of "technical correctness" — the code works as written for the happy path.
- `log_event['timestamp'] // 1000` converts CloudWatch's millisecond epoch into seconds, which ClickHouse `DateTime` accepts via `JSONEachRow` as an integer Unix timestamp. Correct.
- The `awscloudwatch` receiver is still marked `alpha` stability in the OTel Contrib distribution as of the validation date — worth noting for readers planning production use.
- The ClickHouse exporter's `logs_table_name` field controls a single destination table; the post reuses the Lambda-path table name `cloudwatch_logs`, but the exporter creates/expects its own OTel-shaped schema (different columns than the hand-rolled `cloudwatch_logs` in the SQL block). Readers using Option 2 should let the exporter create its table (or align schemas) rather than reuse the Option 1 table as-is. Not a technical error in the post (the two options are presented independently), but a practical caveat.
