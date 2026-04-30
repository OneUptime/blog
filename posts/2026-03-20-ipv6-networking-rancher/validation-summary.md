# Validation Summary: How to Configure IPv6 Networking in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- IPv6 networking
- Dual-stack networking
- CNI plugins
- Prometheus Operator

## Sources Consulted
- Rancher IPv4/IPv6 Dual-stack: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/dual-stack
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- Kubernetes IPv4/IPv6 dual-stack: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus node exporter guide: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The prerequisite version was too broad. Rancher documents dual-stack support for RKE2/K3s as available in Rancher v2.7.2 and later, so the post was corrected from `v2.7+` to `v2.7.2+`.
- The original architecture and configuration guidance was inaccurate for Rancher-managed IPv6. It suggested editing a generic CNI `ConfigMap`, but Rancher documents IPv6 and dual-stack configuration through Cluster CIDR, Service CIDR, and Stack Preference at cluster creation time. The post was updated to show the Rancher/RKE2-equivalent configuration instead.
- The original Step 2 example used a placeholder CNI JSON snippet with an IPv4-only subnet and no Rancher-specific settings. It was replaced with an RKE2 dual-stack example using documented `cluster-cidr` and `service-cidr` keys, plus a note for the IPv6-only variant.
- The original Step 3 network policy did not configure or validate IPv6 behavior. It was replaced with a deployable test workload and Service using `ipFamilyPolicy: PreferDualStack`, which is the documented Kubernetes Service API for dual-stack behavior.
- The original `kubectl run` examples supplied custom commands without the documented `--command` flag. They were corrected to use current `kubectl run` syntax.
- The original monitoring and troubleshooting commands used `calico-node -show-status`, which is not the documented Rancher/Calico validation path and was not portable across supported CNIs. These commands were replaced with generic CNI health checks and RKE2/kubelet log inspection.
- The original Prometheus example referenced `up{job="network-probe"}`, but the post never created or documented such a scrape target. It was replaced with valid `PrometheusRule` examples based on standard node exporter network error metrics.

## Review Notes
The corrected post now uses an RKE2-based example because Rancher’s documented YAML-equivalent configuration is clearest there. Rancher also supports IPv6-only and dual-stack provisioning for K3s, but the underlying cluster configuration details differ and would be better covered in a K3s-specific guide if deeper coverage is needed.
