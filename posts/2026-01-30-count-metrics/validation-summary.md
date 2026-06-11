# Validation Summary: How to Implement Count Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus metrics and PromQL
- Prometheus Python client
- Go `sync/atomic`
- Python threading and context managers
- Flask metrics endpoint exposure
- Mermaid diagrams

## Sources Consulted
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus metric and label naming best practices: https://prometheus.io/docs/practices/naming/
- Prometheus Python client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/
- Prometheus Python client custom collector / registry collision documentation: https://prometheus.github.io/client_python/collector/custom/
- Go `sync/atomic` package documentation: https://pkg.go.dev/sync/atomic
- Python `threading` documentation: https://docs.python.org/3/library/threading.html
- Flask `Response` API documentation: https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- The custom `LabeledCounter` example said it validated required labels but silently substituted missing labels with empty strings and ignored extra labels. I changed it to reject missing or extra labels so the implementation matches the description.
- The custom `LabeledCounterChild.inc()` path accepted negative increments, which would break monotonic counter behavior. I added a non-negative increment check.
- The counter reset explanation implied Prometheus scrapes store a reset marker. Prometheus stores samples, while PromQL counter functions such as `rate()` and `increase()` account for monotonicity breaks at query time. I corrected the prose and sequence diagram.
- The Go reset-detection method was named `GetRate()` but returned an increase since the previous reading, not a per-second rate. I renamed it to `GetIncrease()` and updated the comments.
- The Prometheus Python example described module-level counters as singletons. The Python client registers collectors and rejects duplicate time series in the same registry; it does not make counters singleton objects by name. I changed the wording to "registered only once."
- The unit test example reused the default `REGISTRY` in `setUp()`, which would raise duplicate time series errors across tests. I changed it to use an isolated `CollectorRegistry` per test and read sample values through the registry instead of the private `_value` attribute.

## Review Notes
- The request duration counter pattern is technically valid for calculating average duration, but histograms or summaries are usually more useful when latency percentiles or distributions are needed.
- The examples intentionally omit production details such as authentication around `/metrics`, label allowlists for route templates, and multiprocess-mode setup for Python web servers.
