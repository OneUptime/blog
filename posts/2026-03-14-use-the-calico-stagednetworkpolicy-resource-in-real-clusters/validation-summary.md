# Validation Summary: Using the Calico StagedNetworkPolicy Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico StagedNetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico Felix, Typha, IPPool, and IPAM
- Kubernetes custom resources, labels, RBAC, events, and kubectl
- calicoctl

## Sources Consulted
- Calico StagedNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico staged network policies guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico RBAC guidance for Calico resources: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The small-cluster example suggested checking a node YAML for an effective StagedNetworkPolicy configuration. StagedNetworkPolicy is a policy resource, not node configuration, so this was changed to list staged policies through the Kubernetes API.
- The multi-environment section described node selectors for StagedNetworkPolicy. The official resource uses policy selectors for endpoints and is namespaced, so this was changed to use namespace/workload labels and `spec.selector`.
- The scale section recommended increasing reconciliation intervals, but StagedNetworkPolicy has no such field. This was replaced with guidance to use optimized Calico selector forms at scale.
- The Felix health endpoint note tied readiness/liveness checks to Prometheus metrics and used `<node-ip>`. Felix health is controlled by Felix health configuration and defaults to port 9099 on localhost, so the wording and commands were corrected.
- The troubleshooting section referred to configuration reloads and node selector mismatches. These were adjusted to policy update messages and workload or host endpoint label selectors.
- The RBAC check combined `kubectl auth can-i --list` with a specific verb/resource check. Kubernetes documents these as separate forms, so the command was split into a direct permission check and a separate list command.

## Review Notes
The post remains a high-level production operations guide rather than a manifest-authoring tutorial. Future improvements could include a concrete StagedNetworkPolicy YAML example and a note that staged policies preview policy impact without enforcing traffic.
