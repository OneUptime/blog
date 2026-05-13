# Validation Summary: How to Monitor Cilium Gateway API Addresses Support

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Cilium
- Kubernetes Gateway API
- Cilium LB-IPAM
- Prometheus
- Alertmanager
- Grafana
- Hubble CLI
- Helm
- kubectl

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Kubernetes Gateway API troubleshooting and status documentation: https://gateway-api.sigs.k8s.io/concepts/troubleshooting/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics
- Cilium v1.19.3 metrics source documentation: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/Documentation/observability/metrics.rst
- Cilium v1.19.3 Helm chart templates and values: https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium

## Issues Found
- The metric `cilium_operator_gateway_api_addresses_total` is not a documented Cilium metric. Replaced it with documented Cilium operator feature and LB-IPAM metrics relevant to Gateway API address allocation: `cilium_operator_feature_adv_connect_and_lb_gateway_api_enabled`, `cilium_operator_lbipam_ips_used`, `cilium_operator_lbipam_ips_available`, and `cilium_operator_lbipam_services_unsatisfied`.
- The PromQL query filtered `cilium_k8s_client_api_calls_total` by an `api_call` label, but Cilium documents that metric with `host`, `method`, and `return_code` labels. Replaced the query with a valid `sum by (method, return_code)` rate query.
- The alert rule was described as an Alertmanager rule, but Prometheus-compatible alerting rules are created in Prometheus and then sent to Alertmanager. Updated the wording to say Prometheus.
- The alert expression used `kube_gateway_status_conditions`, which is not a standard Cilium metric and is not exposed by default kube-state-metrics documentation. Replaced it with the documented Cilium LB-IPAM metric `cilium_operator_lbipam_services_unsatisfied`.

## Review Notes
Cilium Gateway API address support relies on Gateway API `spec.addresses` and, for IPAddress addresses, Cilium LB-IPAM. Gateway `status.conditions` remains the best object-level troubleshooting source, while Prometheus metrics provide aggregate operator and LB-IPAM signals.
