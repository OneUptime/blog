# Validation Summary: How to Use the dapr list Command to View Running Apps

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr CLI (`dapr list` command)
- Dapr self-hosted mode
- Dapr on Kubernetes
- Bash scripting with jq for health checks

## Sources Consulted
- Dapr CLI reference documentation: https://docs.dapr.io/reference/cli/dapr-list/
- Dapr CLI source code (`cmd/list.go`, `pkg/standalone/list.go`, `pkg/kubernetes/list.go`): https://github.com/dapr/cli

## Issues Found

1. **Self-hosted table output showed incorrect PID column**: The sample output listed a single `PID` column, but the actual `dapr list` output uses separate `DAPRD PID` and `APP PID` columns (and `CLI PID` when applicable). Also, the `CREATED` column was missing from the sample. Fixed the sample table to show the correct column names.

2. **Kubernetes table output showed incorrect columns**: The sample showed `HTTP PORT` and `GRPC PORT` columns, but in Kubernetes mode, `dapr list -k` only shows `APP PORT` (not HTTP/gRPC ports separately). The `NAMESPACE`, `APP ID`, `APP PORT`, `AGE`, and `CREATED` columns are the correct Kubernetes output columns. Fixed the sample table accordingly.

3. **JSON sample used non-existent `pid` field**: The sample JSON output included a `"pid"` field which does not exist. The actual JSON output uses `"daprdPid"`, `"cliPid"`, and `"appPid"` as separate fields. Fixed the sample JSON to use the correct field names.

4. **`--output wide` does not exist**: The post included a section about `dapr list --output wide` claiming it adds columns like "component count." This output format does not exist — the only valid values for `--output` are `json`, `yaml`, and `table`. Running `--output wide` would produce an error. The "component count" column was also fabricated. Removed the entire section.

5. **Overview text updated**: Changed "process IDs" to "Dapr sidecar and app process IDs" for accuracy, reflecting the multiple PID columns in the output.

## Review Notes
- The health check script using `jq -r '.[].appId'` is correct since `appId` is a valid field in the JSON output.
- The `--namespace` flag usage is correct.
- The grep workaround for filtering by app ID is a valid approach since no filter flag exists.
- The actual JSON output includes additional fields not shown in the sample (e.g., `metricsEnabled`, `maxRequestBodySize`, `httpReadBufferSize`, `runTemplatePath`). The sample is simplified for clarity, which is acceptable for a tutorial.
- The self-hosted table may also show `CLI PID`, `RUN_TEMPLATE_PATH`, `APP_LOG_PATH`, and `DAPRD_LOG_PATH` columns when those values are populated; the table utility auto-hides columns that are entirely empty.
