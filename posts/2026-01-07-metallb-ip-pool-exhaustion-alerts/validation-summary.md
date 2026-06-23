# Validation Summary: How to Set Up Alerts for MetalLB IP Pool Exhaustion

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- MetalLB
- Kubernetes Services and kubectl
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule
- Alertmanager
- Grafana
- kube-state-metrics

## Sources Consulted
- MetalLB Prometheus metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB installation and Prometheus integration notes: https://metallb.io/installation/
- MetalLB usage documentation for LoadBalancer services and annotations: https://metallb.io/usage/
- MetalLB release notes for metrics HTTPS changes, FRR-K8s defaults, and annotation deprecation: https://metallb.io/release-notes/
- MetalLB v0.16.1 source and Helm rules for allocator metric labels and alert expressions: https://github.com/metallb/metallb
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule resources: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus query function documentation for `rate`, `increase`, `delta`, and `deriv`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- kube-state-metrics service metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/service-metrics.md

## Issues Found
- The post described MetalLB metrics as being exposed by speaker pods on HTTP port 7472. Current MetalLB releases expose HTTPS metrics on the `metricshttps` port, typically 9120 in the official Prometheus manifests, and allocator metrics are controller metrics. Updated the metrics explanation, pod selector, bearer-token curl example, ServiceMonitor, manual scrape config, and troubleshooting command.
- The ServiceMonitor example selected a service label and port that were not defined in the snippet. Added a matching controller metrics Service and updated the ServiceMonitor to select that Service and scrape `metricshttps` over HTTPS.
- Several PromQL examples divided or subtracted allocator metrics without explicit `on(pool)` matching. Updated usage, availability, alert, Grafana, and multi-pool queries to match MetalLB's own rule pattern.
- Alert annotation template queries used single quotes in PromQL label matchers. Changed them to escaped double quotes so the generated PromQL is valid.
- The BGP metric table implied `metallb_bgp_session_up` applies generally. Updated it to note that current default FRR-K8s deployments expose equivalent metrics with the `frrk8s_` prefix.
- Alertmanager routes used deprecated `match` and `match_re` syntax. Replaced them with current `matchers` syntax.
- The pending LoadBalancer service alert used `kube_service_status_load_balancer_ingress == 0`, but kube-state-metrics emits ingress series only when ingress entries exist. Replaced the expression with `kube_service_spec_type{type="LoadBalancer"} unless on(namespace, service) kube_service_status_load_balancer_ingress`.
- Capacity planning examples used `rate` and `increase` on allocator gauge metrics. Replaced those with gauge-appropriate `deriv` and `delta` examples.
- The test service creation command used an unsupported `kubectl expose --annotation` flag and the deprecated `metallb.universe.tf/address-pool` annotation. Split the operation into `kubectl expose` plus `kubectl annotate service` and changed the annotation to `metallb.io/address-pool`.
- A troubleshooting command attempted to run `wget` inside the MetalLB controller container. Current MetalLB images may not include shell tools, so the example now uses `kubectl port-forward` and local `curl`.
- Adjusted wording that implied IP exhaustion is completely silent. MetalLB records service events, but it does not create proactive notifications by default.

## Review Notes
The examples are now aligned with current MetalLB documentation and v0.16.x behavior. Users on older MetalLB releases may still need to adapt the metrics port and scheme if their installation exposes HTTP metrics on port 7472.
