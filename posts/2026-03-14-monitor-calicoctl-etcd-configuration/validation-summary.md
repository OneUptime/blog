# Validation Summary: Monitoring Calicoctl etcd Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico and calicoctl
- etcd / etcdv3 datastore
- Prometheus scrape configuration and PromQL alerting rules
- Prometheus Operator PrometheusRule resources
- node_exporter textfile collector
- Prometheus Pushgateway
- Bash, curl, OpenSSL, and GNU date

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- etcd documentation: Monitoring etcd - https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd documentation: Metrics - https://etcd.io/docs/v3.6/metrics/
- etcd documentation: Generated metrics list - https://etcd.io/docs/v3.7/metrics/etcd-metrics-latest/
- Prometheus documentation: Configuration - https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus documentation: Alerting rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus node_exporter README: Textfile collector - https://github.com/prometheus/node_exporter
- Prometheus Pushgateway README - https://github.com/prometheus/pushgateway

## Issues Found
- The certificate expiry script appended metrics to `${METRICS_FILE}.tmp` without first truncating or recreating it. If a previous temporary file remained, node_exporter could eventually receive duplicate samples for the same label set. Added `: > "${METRICS_FILE}.tmp"` before the loop so each run starts with a clean temporary file before the atomic rename.
- The metrics list described `etcd_debugging_mvcc_keys_total` and `etcd_mvcc_db_total_size_in_bytes` as "Calico-specific data metrics." These are etcd-wide metrics, and `etcd_debugging_*` metrics are documented as volatile debugging metrics. Updated the heading and comment to say they are etcd data size metrics and that the key count is a debugging metric that includes Calico data.

## Review Notes
- The Prometheus scrape configuration uses valid `scrape_configs`, `metrics_path`, and TLS client certificate fields.
- The PrometheusRule manifest shape and alerting rule fields are valid for Prometheus Operator.
- The Pushgateway example uses the documented `/metrics/job/<JOB_NAME>` path. In production, configure Prometheus to scrape the Pushgateway with `honor_labels: true` if preserving pushed `job` labels matters.
- The calicoctl health check relies on the existing calicoctl etcd configuration or environment variables such as `ETCD_ENDPOINTS`, `ETCD_CERT_FILE`, `ETCD_KEY_FILE`, and `ETCD_CA_CERT_FILE`; the post's prerequisites cover this by requiring calicoctl to already be configured for etcd.
