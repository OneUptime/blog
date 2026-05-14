# Validation Summary: Common Mistakes to Avoid with Calico GlobalNetworkPolicy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- kubectl
- Felix Prometheus metrics
- YAML

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics

## Issues Found
- The verification snippet described "policy hit counters" and grepped for `felix_denied`, but current Calico Open Source Felix metrics documentation does not list a `felix_denied` metric. I changed the snippet to check documented active policy metrics with `felix_active_local_policies`, which verifies that Felix metrics are enabled and reporting active local policies.

## Review Notes
- The GlobalNetworkPolicy YAML uses the current `projectcalico.org/v3` API and valid fields for Calico v3.26+.
- `calicoctl get globalnetworkpolicies -o wide` is acceptable because Calico resource types are case-insensitive and may be pluralized.
- The metrics commands assume an operator-style installation using the `calico-system` namespace. Manifest-based installations commonly use `kube-system`, so readers may need to adjust the namespace for their cluster.
