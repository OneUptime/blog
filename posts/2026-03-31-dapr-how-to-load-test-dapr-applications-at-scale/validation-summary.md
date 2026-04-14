# Validation Summary: How to Load Test Dapr Applications at Scale

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar, service invocation, state store, pub/sub APIs)
- k6 (load testing tool)
- Locust (Python-based load testing framework)
- Go (test application language)
- Kubernetes (deployment target)
- InfluxDB + Grafana (results analysis)

## Sources Consulted
- Dapr HTTP API reference for state management: https://docs.dapr.io/reference/api/state_api/
- Dapr HTTP API reference for service invocation: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr HTTP API reference for pub/sub: https://docs.dapr.io/reference/api/pubsub_api/
- k6 documentation for HTTP requests, metrics, thresholds, and options: https://grafana.com/docs/k6/latest/
- k6 custom metrics (Rate, Trend, Counter): https://grafana.com/docs/k6/latest/using-k6/metrics/
- Locust documentation for HttpUser, tasks, and events: https://docs.locust.io/en/stable/
- Go standard library documentation for `net/http`, `encoding/json`, `strings`: https://pkg.go.dev/std

## Issues Found
1. **Go code: Missing `"strings"` import, unused `"time"` import** — The Go code uses `strings.NewReader()` but did not import the `"strings"` package. Additionally, the `"time"` package was imported but never used anywhere in the code. Both issues would cause Go compilation errors (`imported and not used` and `undefined: strings`). **Fix:** Replaced `"time"` with `"strings"` in the import block.

## Review Notes
- The Go code uses `strings.NewReader(string(stateBody))` where `bytes.NewReader(stateBody)` would be more idiomatic (avoids an unnecessary `[]byte` to `string` conversion). This is a style preference, not a bug, so it was left as-is.
- The k6 service invocation script imports `Counter` from `k6/metrics` but never uses it. This does not cause a runtime error in k6's JavaScript runtime.
- The Python Locust script has unused imports (`json`, `time`, `MasterRunner`). These do not cause runtime errors in Python.
- The `k6 run --out influxdb=...` command uses the legacy built-in InfluxDB v1 output, which was removed in k6 v0.47+ and replaced by the xk6-output-influxdb extension. The syntax is valid if the extension is installed or an older k6 version is used. The post does not specify a k6 version, so this was left as-is but is worth noting for future updates.
- All Dapr API endpoints (`/v1.0/state/`, `/v1.0/invoke/`, `/v1.0/publish/`) use the correct URL format and expected HTTP status codes per the Dapr v1.0+ HTTP API specification.
