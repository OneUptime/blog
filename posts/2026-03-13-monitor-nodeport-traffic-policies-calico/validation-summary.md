# Validation Summary: How to Monitor Calico NodePort Traffic Policy Impact

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes NodePort services
- GlobalNetworkPolicy resource
- calicoctl CLI
- kubectl CLI
- pre-DNAT network policy

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico EntityRule / port range syntax docs
- Kubernetes NodePort service documentation (default range 30000-32767)
- Calico host endpoint and pre-DNAT policy documentation

## Issues Found
- **Port range syntax was incorrect.** The original YAML used `ports: [30000-32767]`, which is not valid Calico syntax. Calico requires port ranges to use a colon separator and be expressed as a quoted string (so YAML does not misinterpret the range). Changed both occurrences to `ports: ["30000:32767"]`.

## Review Notes
- `preDNAT: true` combined with `applyOnForward: true` is correct — Calico requires `applyOnForward` to be true whenever `preDNAT` is true, and pre-DNAT policies may only contain ingress rules (matching the post's `types: [Ingress]`).
- `selector: has(kubernetes.io/hostname)` is a valid Calico selector and will match host endpoints carrying that label.
- The NodePort default range of 30000-32767 is the Kubernetes default and matches the `--service-node-port-range` flag default.
- A few minor grammatical issues exist (e.g., "covers monitor", "NodePort Traffic Policies policies") but these are stylistic, not technical, and were left unchanged per review scope.
- The verification step uses `kubectl exec` to curl from inside the cluster; since this is a preDNAT policy applied at host endpoints, testing from outside the cluster (against a node IP:nodePort) would more directly exercise the policy. The in-cluster curl example still works as a connectivity sanity check.
