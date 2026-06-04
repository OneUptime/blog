# Validation Summary: How to Use Prometheus Pushgateway for Kubernetes Batch Job Metrics Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Prometheus Pushgateway
- Prometheus scrape configuration and PromQL
- Prometheus Operator PrometheusRule
- Kubernetes Deployment, Service, PersistentVolumeClaim, Job, and CronJob
- Bash and curl
- Python prometheus-client

## Sources Consulted
- Prometheus Pushgateway documentation: https://github.com/prometheus/pushgateway
- Prometheus Pushgateway best practices: https://prometheus.io/docs/practices/pushing/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Python client Pushgateway documentation: https://prometheus.github.io/client_python/exporting/pushgateway/
- Prometheus Python client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/
- Prometheus alert template reference: https://prometheus.io/docs/prometheus/3.4/configuration/template_reference/
- Prometheus metric naming best practices: https://prometheus.io/docs/practices/naming/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Prometheus Pushgateway latest release information: https://prometheus.io/download/
- prometheus-client PyPI release information: https://pypi.org/project/prometheus-client/

## Issues Found
- The introduction overstated Pushgateway as ensuring data from every job execution. Updated it to describe Pushgateway as preserving pushed final state for later scraping, consistent with Pushgateway being a cache rather than an event store.
- The Pushgateway pattern section said it works perfectly for broad Kubernetes job categories. Updated the wording to match official guidance that Pushgateway is mainly appropriate for service-level batch jobs and that stale per-instance series require cleanup.
- The Pushgateway image was pinned to `prom/pushgateway:v1.6.2`, which is outdated as of 2026-06-04. Updated it to `prom/pushgateway:v1.11.3`.
- The Prometheus scrape config used `metric_relabel_configs` to copy `__address__` into `pushgateway_instance`. Internal `__*` labels are removed before metric relabeling, so this would not work. Changed it to `relabel_configs`.
- The Bash counter metrics omitted the conventional `_total` suffix, while the Python client exposes counters with `_total`. Updated the Bash metric names and the alert/query examples to use `backup_records_processed_total` and `backup_records_failed_total`.
- The Python dependency pin was outdated and the Kubernetes Job installed an unpinned latest package. Updated both to `prometheus-client==0.25.0`.
- The "time since last successful run" PromQL selector attempted to filter a metric by another metric's value using `{backup_job_success="1"}`, which is a label matcher and would not work. Replaced it with an `and` expression that filters completion timestamps to matching successful series.
- The cleanup CronJob comment claimed it deleted metrics older than seven days, but the command deletes a named grouping key without any age check. Updated the comment to describe deletion of a known stale group.

## Review Notes
- Python code blocks compile after treating the `requirements.txt` line as dependency content rather than Python code.
- All YAML code blocks parse as YAML locally.
- The examples still assume supporting Kubernetes resources exist, including the `monitoring` and `production` namespaces and the referenced script ConfigMaps.
