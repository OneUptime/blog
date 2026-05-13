# Validation Summary: How to Monitor the Impact of Default Deny Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes NetworkPolicy / Calico policy monitoring
- Prometheus Operator
- Prometheus / PromQL
- Grafana

## Sources Consulted
- Calico Open Source documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source documentation: Visualizing metrics via Grafana: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-visual
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule resources: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Felix metrics were described as exposed by default on port 9091. Calico documentation states Felix Prometheus metrics are disabled by default and must be enabled with `prometheusMetricsEnabled`; port 9091 is the default port once enabled. Updated the text to reflect this.
- The post used non-documented Calico Open Source Felix metric names: `felix_denied_packets_total`, `felix_active_network_policies`, `felix_policy_evaluation_total`, and `felix_ipsets_total`. Replaced them with documented metrics: `felix_active_local_policies`, `felix_cluster_num_policies`, `felix_label_index_selector_evals`, and `felix_int_dataplane_failures`.
- The dashboard queries and alerting rule referenced the non-existent denied-packet metric. Replaced them with PromQL examples and an alert based on documented Felix metrics.
- The ServiceMonitor snippet did not create the Kubernetes Service it selected and used a named Service port without defining that Service port. Added a headless Service with a `metrics` port and aligned the ServiceMonitor selector with the Service labels.
- The description and introduction referenced flow log analysis, denied packet rates, policy evaluation counts, Typha, and endpoint connection states in a way that was not supported by the guide's Calico Open Source examples. Updated those claims to match the documented Felix metrics used in the post.

## Review Notes
Calico Enterprise and Calico Cloud expose additional policy metrics for denied packets, but those are separate from the Calico Open Source Felix metrics covered by this post. A future post could cover those product-specific policy metrics separately.
