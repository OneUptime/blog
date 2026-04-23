# Validation Summary: How to Set Up Rancher for Manufacturing - Setup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- RKE2
- K3s
- Kubernetes
- Fleet
- Prometheus Operator
- Longhorn
- OPC-UA
- Kafka
- NVIDIA GPU workloads
- NetworkPolicy

## Sources Consulted
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s agent CLI reference: https://docs.k3s.io/cli/agent
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Fleet GitRepo Resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Rancher Monitoring chart package (`rancher-monitoring-109.0.0+up80.9.1-rancher.5.tgz`): https://charts.rancher.io/assets/rancher-monitoring/rancher-monitoring-109.0.0+up80.9.1-rancher.5.tgz
- Longhorn StorageClass parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- RKE2 GPU Operators: https://docs.rke2.io/add-ons/gpu_operators
- RFC 9210, DNS Transport over TCP - Operational Requirements: https://www.rfc-editor.org/rfc/rfc9210

## Issues Found
- The K3s install example passed arguments using `sh -` and placed inline comments after line-continuation backslashes, which makes the shell example invalid. Updated it to `sh -s -` and moved the comments above the command to match current K3s installation guidance for passing arguments.
- All three `apps/v1` Deployment examples omitted the required `spec.selector` and matching pod template labels. Added selectors and matching `app` labels so the manifests are valid against the current Kubernetes Deployment API.
- The NetworkPolicy comments described only OT-to-IT egress restrictions, but the manifest also set `policyTypes: [Egress, Ingress]` with no ingress rules, which creates default-deny ingress isolation. Updated the comments to describe the actual behavior.
- The DNS egress rule said “Allow DNS” but only allowed UDP/53. Added TCP/53 as well, since current DNS operational guidance requires support for DNS over TCP in addition to UDP.
- The Fleet `GitRepo` comments implied a staged rollout (“after test passes”), but `spec.targets` only matches clusters; it does not by itself provide gated phase promotion. Reworded the comments to describe target selection without implying rollout sequencing.
- The Longhorn StorageClass comment said `reclaimPolicy: Retain` preserves data on pod deletion, which is incorrect. Corrected it to describe the actual reclaim behavior: retaining the PV and backing volume after PVC deletion for recovery.

## Review Notes
- The GPU workload example assumes GPU support is already enabled on the downstream cluster, such as via the NVIDIA device plugin or the RKE2 GPU Operator.
- The PrometheusRule example is valid with current Rancher Monitoring defaults in `cattle-monitoring-system`; clusters that override `ruleSelector` or `ruleNamespaceSelector` may need additional labels or different placement.
- Internal endpoints such as `registry.factory.internal`, `git.factory.internal`, and OT hostnames are illustrative placeholders and were not externally resolvable during review.
