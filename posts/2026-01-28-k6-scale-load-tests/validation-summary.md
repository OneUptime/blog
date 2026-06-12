# Validation Summary: How to Scale k6 Load Tests

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- k6
- Grafana Cloud k6
- k6 Operator
- Kubernetes
- Helm
- Prometheus remote write
- Grafana dashboards
- JavaScript
- Python

## Sources Consulted
- Grafana k6 options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 SharedArray API: https://grafana.com/docs/k6/latest/javascript-api/k6-data/sharedarray/
- Grafana k6 running distributed tests guide: https://grafana.com/docs/k6/latest/testing-guides/running-distributed-tests/
- Grafana k6 TestRun CRD guide: https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/usage/executing-k6-scripts-with-testrun-crd/
- Grafana k6 TestRun CRD configuration: https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/usage/configure-testrun-crd/
- Grafana k6 Operator installation guide: https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/install-k6-operator/
- Grafana k6 Prometheus remote write output: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
- Grafana k6 JSON output: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 cloud CLI documentation: https://grafana.com/docs/k6/latest/using-k6/run-k6-test-script/
- Grafana k6 v2 migration guide: https://grafana.com/docs/k6/latest/get-started/migrating-to-v2/
- Grafana Cloud k6 cloud options: https://grafana.com/docs/grafana-cloud/testing/k6/author-run/cloud-scripting-extras/cloud-options/
- Grafana Cloud k6 load zones: https://grafana.com/docs/grafana-cloud/testing/k6/author-run/use-load-zones/

## Issues Found
- The memory-management example said SharedArray data could be accessed "without copying." Official docs state SharedArray shares the underlying memory, but element access returns a copy. Updated the comment to say it avoids copying the full data set for every VU.
- The memory-management example described `batch` and `batchPerHost` as general memory controls. Official docs define them as concurrency limits for `http.batch()` calls. Updated the comment to scope the setting to `http.batch()`.
- The k6 Operator constant-arrival-rate example claimed the configured rate was "per pod." Official k6 Operator docs state `parallelism` assigns equal execution segments to runner instances. Updated the comment to describe the rate as total and split by the operator.
- The k6 Operator JSON output example wrote to `/results/output.json` without defining a volume or ensuring that directory exists in the runner container. Updated it to write to `/tmp/output.json`.
- The Grafana Cloud k6 login and run commands used removed/old CLI forms: `k6 login cloud` and `k6 cloud cloud-test.js`. Updated them to `k6 cloud login --token ... --stack ...` and `k6 cloud run cloud-test.js`, matching current k6 CLI docs and the v2 migration guide.
- The Prometheus dashboard queried `_bucket` series while the example enables native histograms with `K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true`. Updated the query to use the native histogram metric form with `histogram_quantile()`.

## Review Notes
k6 was not installed in the local environment, so CLI examples were verified against official documentation rather than local `--help` output. Resource sizing numbers in the post are approximate and workload-dependent; official k6 large-test guidance recommends measuring the specific script and monitoring CPU, memory, and network saturation.
