# Validation Summary: Configuring Available IP Publication in Cilium IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium IPAM
- Kubernetes CiliumNode custom resources
- Cilium Helm configuration
- kubectl
- jq
- Prometheus and Prometheus Operator rules

## Sources Consulted
- Cilium IPAM overview: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium CRD-backed IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-crd/
- Cilium Azure IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/azure/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium metrics reference: https://docs.cilium.io/en/stable/observability/metrics/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post originally configured `ipam.mode=cluster-pool` but then read per-IP pool fields from `spec.ipam.pool`. Cilium cluster-pool IPAM assigns per-node CIDRs in `spec.ipam.podCIDRs`, not per-IP pool maps. I changed the guide to scope the examples to CRD-backed and cloud-provider IPAM modes where per-IP availability is published through CiliumNode fields.
- The CiliumNode examples only checked `spec.ipam.pool`, which applies to CRD-backed and some cloud-provider contexts but does not cover Azure's documented `spec.ipam.available` publication field. I updated the jq expressions to read `spec.ipam.pool` or `spec.ipam.available`.
- The operator configuration used cluster-pool CIDR values, which did not match the publication behavior described in the rest of the post. I replaced it with Azure IPAM Helm values, including `azure.enabled`, `ipam.mode=azure`, and `ipam.nodeSpec.ipamPreAllocate`.
- The Prometheus examples used the non-current metric name `cilium_ipam_available`. Cilium documents operator IPAM metrics under the `cilium_operator_` namespace, so I changed the examples and alert rule to `cilium_operator_ipam_available_ips`.
- The alert annotation referenced `$labels.node`, but the documented Cilium operator IPAM availability metric uses `target_node`. I updated the annotation to use `$labels.target_node`.
- The prerequisites claimed Cilium `v1.14+` broadly. I narrowed this to `v1.18+` to match the currently documented operator IPAM metric reference used by the monitoring examples.

## Review Notes
Cluster-pool IPAM is still valid Cilium IPAM, but it should be documented separately because its CiliumNode representation is CIDR-based rather than a per-IP availability map. The operator IPAM Prometheus metrics are documented as enabled for AWS, Alibaba Cloud, and Azure IPAM plugins, so CRD-backed users should rely on CiliumNode inspection unless they expose equivalent custom metrics.
