# Validation Summary: How to Create Prometheus Alerts for Kubernetes Certificate Expiration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL and Prometheus alerting rules
- Prometheus Operator `PrometheusRule`
- Kubernetes Deployments, Services, Secrets, and kubeconfig files
- enix x509-certificate-exporter
- Grafana dashboard queries
- cert-manager `Certificate` resources

## Sources Consulted
- enix x509-certificate-exporter v3.6.0 README: https://github.com/enix/x509-certificate-exporter/blob/v3.6.0/README.md
- enix x509-certificate-exporter current metrics documentation: https://github.com/enix/x509-certificate-exporter/blob/main/docs/metrics.md
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus unit testing for rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The post said Prometheus scrapes every 30 seconds by default. Prometheus' documented default `global.scrape_interval` is 1 minute, so the wording was corrected.
- The deployment used `--port=9793`, but x509-certificate-exporter v3.6.0 documents `--listen-address` / `-b` for the metrics bind address. The argument was corrected to `--listen-address=:9793`.
- The Prometheus scrape configuration used `metric_relabel_configs` to add a fixed `cluster` label from `__address__`. For a static target label, Prometheus documents `static_configs.labels`, so the snippet now uses that field.
- Alert annotations used `humanizeDuration` on an expression whose value is in days. `humanizeDuration` expects seconds, so the annotations now use `humanize` and explicitly say "days."
- The expired-certificate alert referenced `$labels.not_after`, which is not part of the x509 exporter label schema. The annotation was changed to avoid the nonexistent label.
- The dashboard "Group certificates by expiration window" query attempted to group by an `le` label that the expression did not create. It was replaced with a working PromQL pattern that assigns a `window` label with `label_replace`.
- The post implied ingress and service mesh certificates would be monitored without extra exporter configuration. The wording now clarifies that the exporter must be configured to watch the relevant TLS Secrets or mounted certificate paths.
- The cert-manager section said cert-manager integrates with the x509 exporter. This was corrected to explain that cert-manager stores issued certificates in Kubernetes Secrets, which the exporter can monitor when configured to watch them.
- The `curl` command now quotes the URL to avoid shell globbing surprises.
- The `promtool test rules` command was replaced with `promtool check rules` for syntax validation. `promtool test rules` requires a separate unit test file that references rule files.
- The post pins x509-certificate-exporter v3.6.0 while current exporter documentation describes v4 behavior. A caveat was added noting the v3/v4 metric and configuration differences.

## Review Notes
- The Kubernetes Deployment and Service manifests use current stable API versions and are syntactically plausible, assuming the `monitoring` namespace and `kubeconfig` Secret already exist.
- The x509 exporter v3.6.0 image and CLI flags used in the example match the v3.6.0 documentation, but new deployments should evaluate the current v4 Helm chart and YAML configuration model.
- `PrometheusRule` is a Prometheus Operator CRD, so it only works in clusters where the Prometheus Operator CRDs are installed.
