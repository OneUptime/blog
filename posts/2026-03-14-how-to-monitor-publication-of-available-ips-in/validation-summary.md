# Validation Summary: Monitoring IP Availability Publication in Cilium IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium IPAM
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Bash, kubectl, and jq

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/eni/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium v1.19.3 IPAM metrics source: https://github.com/cilium/cilium/blob/v1.19.3/pkg/ipam/metrics/metrics.go
- Cilium v1.19.3 Helm values for operator Prometheus metrics: https://github.com/cilium/cilium/blob/v1.19.3/install/kubernetes/cilium/values.yaml

## Issues Found
1. The PromQL examples used non-current metric names such as `cilium_ipam_available`, `cilium_ipam_used`, `cilium_ipam_allocation_ops_total`, and `cilium_ipam_release_ops_total`. Cilium documents these as operator metrics under the `cilium_operator_` namespace, and the source defines them as `cilium_operator_ipam_available_ips`, `cilium_operator_ipam_used_ips`, `cilium_operator_ipam_ip_allocation_ops_total`, and `cilium_operator_ipam_ip_release_ops_total`. Updated the examples accordingly.
2. The post implied the IPAM metrics are generic Cilium agent metrics. Cilium documents these IPAM metrics under `cilium-operator` and notes they are enabled only for AWS, Alibaba Cloud, and Azure IPAM plugins. Added that caveat.
3. The alert used `$labels.node`, but the available/used/needed IP metrics label the node as `target_node`. Updated the alert summary to use `$labels.target_node`.
4. The allocation failure alert filtered `cilium_ipam_allocation_ops_total{status="failure"}`, but the allocation operation counter only has the `subnet_id` label. The status label exists on the allocation duration histogram, so the alert now uses `cilium_operator_ipam_allocation_duration_seconds_count{status!="success"}`.
5. The verification command port-forwarded `svc/cilium-agent` on port `9962`, which is for agent metrics. The relevant IPAM metrics are served by `cilium-operator` on port `9963`, so the command now port-forwards `deployment/cilium-operator` and greps for `cilium_operator_ipam`.
6. The monitoring script uses `jq`, but `jq` was not listed as a prerequisite. Added it to the prerequisites.

## Review Notes
The `kubectl get ciliumnodes` script is consistent with the documented `CiliumNode` IPAM fields: `spec.ipam.pool` contains the allocation pool and `status.ipam.used` contains allocated addresses. The metric availability caveat is important because clusters using other Cilium IPAM modes may not expose these operator IPAM metrics.
