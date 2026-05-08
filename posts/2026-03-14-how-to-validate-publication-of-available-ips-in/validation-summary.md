# Validation Summary: Validating IP Availability Publication in Cilium IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNode CRD
- CiliumEndpoint CRD
- Cilium IPAM
- kubectl
- jq
- Bash

## Sources Consulted
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/kubernetes/ipam-crd/
- Cilium IPAM overview: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- jq 1.7 local CLI syntax validation

## Issues Found
- The post described CiliumNode publication as available IP counts, but CRD-backed CiliumNode IPAM publishes an allocation map in `spec.ipam.pool` and used addresses in `status.ipam.used`. The description, introduction, and prerequisites were updated to state that scope and field model accurately.
- The data consistency example wrote per-node `status.ipam.used` counts to one file and a single cluster-wide endpoint count to another, without deriving comparable totals. The command now outputs both per-node published counts and a `total_published_used` value, then compares it with a structured `actual_endpoint_ips` count.
- The verification section used `cilium status | grep IPAM`, which is not the command shown in current Cilium IPAM validation documentation and may not expose the IPAM details readers need. It now verifies the relevant CiliumNode IPAM fields directly with `kubectl`.

## Review Notes
The endpoint count is still an approximation because CiliumNode `status.ipam.used` can include infrastructure addresses such as router and health IPs, while CiliumEndpoint output reflects endpoint objects. The troubleshooting section already notes that small differences are expected.
