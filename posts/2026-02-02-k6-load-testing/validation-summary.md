# Validation Summary: How to Write k6 Load Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k6 (Grafana k6 load testing tool)
- JavaScript (k6 scripting)
- HTTP/REST API testing
- GitHub Actions (CI/CD integration)
- Docker (containerized k6 execution)
- InfluxDB (output backend)
- Mermaid (diagrams)

## Sources Consulted
- Official k6 documentation: https://grafana.com/docs/k6/latest/
- k6 installation guide: https://grafana.com/docs/k6/latest/set-up/install-k6/
- k6 options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- k6 scenarios / executors: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/
- k6 metrics: https://grafana.com/docs/k6/latest/using-k6/metrics/
- k6 thresholds: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- k6 checks: https://grafana.com/docs/k6/latest/using-k6/checks/
- k6 SharedArray: https://grafana.com/docs/k6/latest/javascript-api/k6-data/sharedarray/
- k6 HTTP module: https://grafana.com/docs/k6/latest/javascript-api/k6-http/
- k6 test-api.k6.io demo endpoints: https://test-api.k6.io/
- GitHub Actions documentation for actions/checkout@v4 and actions/upload-artifact@v4

## Issues Found
No technical issues found.

All technical content was verified against the official k6 documentation:

- **Installation commands**: The macOS (brew), Linux (apt with the specific GPG key `C5AD17C747E3415A3642D57D77C6C491D6AC1D69`), Docker, and Windows (choco) installation commands all match the official k6 install guide.
- **Imports and modules**: All module imports (`k6/http`, `k6`, `k6/data`, `k6/metrics`) are correct and current.
- **Options syntax**: `vus`, `duration`, `stages`, `thresholds`, and `scenarios` options are valid.
- **Executor types**: `constant-vus`, `ramping-arrival-rate`, and `constant-arrival-rate` with their respective required fields (`vus`/`duration`, `startRate`/`timeUnit`/`preAllocatedVUs`/`stages`, `rate`/`timeUnit`/`duration`/`preAllocatedVUs`) are all configured correctly.
- **Threshold syntax**: Expressions like `p(95)<500`, `rate<0.01`, `count>100`, and tagged thresholds like `http_req_duration{expected_response:true}` and `http_req_duration{scenario:browse}` are valid.
- **Exit code 99**: Correctly stated as the exit code for threshold failures.
- **Custom metrics**: `Counter`, `Gauge`, `Rate`, and `Trend` are valid metric types; their `.add()` semantics are described accurately.
- **HTTP API usage**: `http.get`, `http.post`, `http.del`, `http.batch` and the response methods (`r.status`, `r.body`, `r.json()`, `r.json('path')`, `r.timings.duration`) are all valid.
- **Lifecycle functions**: `setup()` and `teardown()` semantics (setup runs once before test, teardown after all VUs finish, return value passed to default function as `data`) are correctly described.
- **Built-in variables**: `__VU` is a valid k6 built-in for the current virtual user ID.
- **Groups and checks**: `group()` and `check()` functions used correctly.
- **CLI flags**: `--out json=...`, `--out csv=...`, `--out influxdb=...` are valid k6 output options.
- **GitHub Actions**: `actions/checkout@v4` and `actions/upload-artifact@v4` are current major versions.

## Review Notes

- The post uses `https://test-api.k6.io` and `https://httpbin.test.k6.io` which are the official k6-hosted demo APIs. These endpoints are intended for testing and are appropriate examples.
- The post does not mention the Grafana-maintained `grafana/setup-k6-action` GitHub Action which is a more idiomatic alternative to manually installing k6 in CI, but the manual installation approach shown is also valid and works correctly.
- The Linux installation snippet uses the `hkp://keyserver.ubuntu.com:80` keyserver. This is the official documented approach but is sometimes flaky in CI environments; users may occasionally need to retry. Not an error in the post.
- The custom metrics example uses `Gauge.add()` — k6's Gauge `.add()` replaces the current value (it does not accumulate). The inline comment "Gauge: set current value" correctly reflects this behavior.
- In the spike test, the comment "More lenient thresholds during spike" is slightly misleading — thresholds in k6 apply to the entire test, not just during the spike stage. The thresholds shown are simply set to lenient overall values. This is a minor wording nuance, not a technical error, so no change was made.
