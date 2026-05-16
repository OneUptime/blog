# Validation Summary: How to Set Up Uptime Monitoring for Services on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Prometheus
- Prometheus Operator CRDs
- Prometheus Blackbox Exporter
- prometheus-community Helm charts
- Grafana / PromQL
- Docker Compose
- Python / Flask

## Sources Consulted
- Prometheus Blackbox Exporter configuration documentation: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus Operator API reference for Probe, PrometheusRule, ServiceMonitor, and additional scrape configuration fields: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus scrape configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator additional scrape configuration documentation: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/additional-scrape-config.md
- prometheus-community prometheus-blackbox-exporter Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-blackbox-exporter/values.yaml
- Docker Compose file reference for the obsolete top-level version property: https://docs.docker.com/reference/compose-file/version-and-name/
- Python 3.12 datetime documentation and deprecation notes for datetime.utcnow(): https://docs.python.org/3.12/whatsnew/3.12.html

## Issues Found
- The Helm install command used `--namespace monitoring` but did not create the namespace. Added `--create-namespace` so the command works on clusters where the namespace does not already exist.
- The Prometheus Operator example was introduced as a ServiceMonitor even though the manifest uses the Probe CRD. Updated the wording to refer to Probe.
- The additional scrape configuration Secret was applied but not referenced by Prometheus. Added a kube-prometheus-stack `additionalScrapeConfigsSecret` values snippet so the extra scrape jobs are actually loaded.
- The external Blackbox Exporter section said the exporter "reports back" to Prometheus. Prometheus scrapes exporters, so the wording was corrected.
- The Docker Compose example used the obsolete top-level `version: '3'` property. Removed it to match the current Compose Specification.
- The Flask health check snippet used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated it to `datetime.now(timezone.utc)` and added the required imports.

## Review Notes
The local review environment did not have `helm` or `kubectl` installed, so command verification was performed against official documentation rather than local CLI help output. The Probe and PrometheusRule examples are structurally consistent with Prometheus Operator documentation, but users still need their Prometheus instance selectors to match the labels used in the examples.
