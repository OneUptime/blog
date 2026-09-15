# Validation Summary: How to Estimate Peak API Requests per Second from User Sessions

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Python
- Prometheus and PromQL
- Grafana k6
- HTTP/API capacity planning
- Load testing and workload modeling

## Sources Consulted

- Grafana k6, "Calculate concurrent users for load tests": https://grafana.com/docs/k6/latest/testing-guides/calculate-concurrent-users/
- Grafana k6, "Open and closed models": https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/
- Prometheus, "Query functions: rate()": https://prometheus.io/docs/prometheus/latest/querying/functions/#rate

## Issues Found
No technical issues found.

## Review Notes
The Python calculator was executed successfully and produced the documented values of 416.0 RPS and 1187.2 RPS. The arithmetic, concurrency calculations, discrete convolution explanation, k6 workload-model description, and PromQL query are technically consistent with the stated assumptions. No version-specific or deprecated APIs are used.
