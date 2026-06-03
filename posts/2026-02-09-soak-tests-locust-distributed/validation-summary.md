# Validation Summary: How to Use Soak Tests for Kubernetes Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Services, ConfigMaps, and CronJobs
- Locust distributed load testing
- Python requests, pandas, and NumPy
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor
- Grafana dashboard JSON

## Sources Consulted
- Locust stable configuration documentation: https://docs.locust.io/en/stable/configuration.html
- Locust distributed load generation documentation: https://docs.locust.io/en/stable/running-distributed.html
- Locust web UI source documentation for `/swarm`, `/stop`, and `/stats/requests`: https://docs.locust.io/en/stable/_modules/locust/web.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference for ServiceMonitor namespace selection: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Locust Kubernetes manifests used the old `locustio/locust:2.15.1` image. Updated the examples to `locustio/locust:2.44.1`, matching the current stable Locust documentation.
- The manifests included `LOCUST_MODE`, which is not a documented Locust environment variable, and `LOCUST_EXPECT_WORKERS`, which only affects `--headless` or `--autostart` runs. Removed those environment variables because the commands already pass the documented `--master` and `--worker` flags.
- The `start_soak_test.py` example said it read the Locust master URL from the environment but used a hard-coded placeholder. Updated it to read `LOCUST_MASTER_URL` with a working in-cluster default.
- The starter script monitored forever, which meant the CronJob's later `sleep` and analysis commands would never run. Added a `MONITOR_TEST` environment switch and set it to `false` in the CronJob.
- The run-time comment suggested `7d`, but Locust's documented examples use second, minute, and hour formats such as `300s`, `20m`, `3h`, and `1h30m`. Kept the example on `168h`/`10080m`.
- The ServiceMonitor example was defined in the `monitoring` namespace but did not set `namespaceSelector`, so by default it would only discover Services in the same namespace as the ServiceMonitor. Added `namespaceSelector.matchNames: [default]` to match the application service namespace used elsewhere in the post.
- The PromQL p95 examples used `histogram_quantile()` directly over `rate(..._bucket[5m])`. For an aggregate percentile over classic histograms, Prometheus requires aggregation that preserves the `le` label. Updated the queries to `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))`.
- The `analyze_soak_test.py` script called `json.dumps()` without importing `json`. Added the missing import.
- The memory leak detection code wrapped a generator expression in a one-element list instead of building a list of floats. Changed it to a list comprehension so pandas and NumPy receive numeric samples.
- The analysis script's Prometheus URL was hard-coded even though the CronJob sets `PROMETHEUS_URL`. Updated it to read the environment variable with the previous URL as the default.

## Review Notes
- The Locust web UI endpoints used by the controller are internal web UI routes rather than a separately versioned public REST API. They match the checked Locust source, but a CLI-driven headless run may be more stable for long-term automation.
- The CronJob example can overlap weekly runs if a prior seven-day soak test has not finished before the next schedule fires. Kubernetes supports `concurrencyPolicy: Forbid` if overlap should be prevented.
- The Grafana dashboard ConfigMap is illustrative; actual dashboard provisioning depends on the Grafana deployment's sidecar or provisioning configuration.
