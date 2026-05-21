# Validation Summary: How to Set Up Prometheus Recording Rules for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Prometheus
- PromQL
- Prometheus recording rules
- Kubernetes ConfigMaps
- Grafana dashboards
- Prometheus alerting rules

## Sources Consulted
- Prometheus documentation: Defining recording rules - https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus documentation: Recording rule naming practices - https://prometheus.io/docs/practices/rules/
- Prometheus documentation: Querying basics and metric selectors - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Istio documentation: Istio Standard Metrics - https://istio.io/latest/docs/reference/config/metrics/
- Istio documentation: istioctl command reference, including Istiod/Pilot metrics list - https://istio.io/latest/docs/reference/commands/istioctl/
- Prometheus Operator API reference: PrometheusRule and rule group fields - https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation: kubectl port-forward - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The setup section said Kubernetes-based Prometheus installations typically use a ConfigMap, but did not state that Prometheus must load the mounted rule file through `rule_files`. Updated the wording to clarify that the ConfigMap stores the rule file and must be mounted into the Prometheus pod.
- The control-plane recording rules used `pilot_proxy_convergence_time_bucket`, which is not listed in the current Istio control-plane metrics reference. Replaced it with the current `pilot_xds_push_time_bucket` histogram and renamed the recording rule accordingly.
- The control-plane recording rules used `pilot_xds_push_errors`, which is not listed in the current Istio control-plane metrics reference. Replaced it with `pilot_total_xds_internal_errors` and adjusted the recorded metric name.

## Review Notes
The PromQL examples use current Istio standard metrics and labels such as `istio_requests_total`, `istio_request_duration_milliseconds_bucket`, `reporter`, `destination_service`, `destination_workload`, `destination_workload_namespace`, `destination_version`, `source_workload`, `source_workload_namespace`, and `response_code`. Prometheus rule group syntax, `interval`, `record`, and alert rule examples match the official Prometheus rule file format. Local `promtool` and `kubectl` binaries were not installed in the review environment, so syntax validation was performed by documentation cross-check and manual inspection rather than local command execution.
