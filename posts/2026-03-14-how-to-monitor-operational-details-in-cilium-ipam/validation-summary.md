# Validation Summary: Monitoring Cilium IPAM Operational Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium IPAM
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana
- Bash, kubectl, jq, and Cilium CLI

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium IP Address Management documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/crd/
- Cilium v1.19.3 source for IPAM Prometheus metrics: https://github.com/cilium/cilium/blob/v1.19.3/pkg/ipam/metrics/metrics.go
- Cilium v1.19.3 Helm chart values: https://github.com/cilium/cilium/blob/v1.19.3/install/kubernetes/cilium/values.yaml
- Cilium v1.19.3 Helm service templates for metrics services: https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium/templates

## Issues Found
- The post used non-current metric names such as `cilium_ipam_available`, `cilium_ipam_used`, `cilium_ipam_allocation_ops_total`, and `cilium_ipam_release_ops_total`. I replaced them with the current Cilium operator metric names: `cilium_operator_ipam_available_ips`, `cilium_operator_ipam_used_ips`, `cilium_operator_ipam_ip_allocation_ops_total`, and `cilium_operator_ipam_ip_release_ops_total`.
- The allocation failure query filtered `cilium_ipam_allocation_ops_total` by `status="failure"`, but Cilium's allocation operation counter does not have a `status` label. I changed it to use the allocation duration histogram count with `status="failed"`: `cilium_operator_ipam_allocation_duration_seconds_count{status="failed"}`.
- The near-exhaustion alert referenced `$labels.node`, but the Cilium operator per-node IPAM metric uses the `target_node` label. I updated the alert annotation to `$labels.target_node`.
- The verification commands only port-forwarded the `cilium-agent` service, but the corrected per-node IPAM metrics are exposed by `cilium-operator`. I added a `cilium-operator` port-forward on port `9963` and kept an agent metrics check for agent-side IPAM metrics.
- The post implied the per-node Cilium operator IPAM metrics apply to all IPAM modes. I added the Cilium documentation caveat that these operator IPAM metrics are enabled for AWS, AlibabaCloud, and Azure IPAM plugins, and noted that other modes should be monitored with agent metrics plus `CiliumNode` and Kubernetes `Node` data.
- The troubleshooting advice said to "Expand CIDRs immediately," which is not universally correct across Cilium IPAM modes. I changed it to "Add capacity for your IPAM mode immediately."

## Review Notes
Cilium metric availability and labels depend on the selected IPAM mode and Cilium version. The post is now accurate for current Cilium 1.19 documentation, but users should confirm the exact metrics exposed by their installed version with `/metrics` or their Prometheus target before copying alert rules into production.
