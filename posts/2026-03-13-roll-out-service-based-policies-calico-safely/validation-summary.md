# Validation Summary: How to Roll Out Service-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes Services and Endpoints
- calicoctl CLI
- kubectl CLI
- Calico NetworkPolicy (service-based egress rules)

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service-based policy docs: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico release notes (service match GA in v3.21+): https://docs.tigera.io/calico/latest/release-notes/
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/

## Issues Found
No technical issues found.

- The `projectcalico.org/v3` API group is correct for Calico NetworkPolicy.
- The YAML structure with `spec.egress[].destination.services.name` and `.namespace` matches the documented Calico service match syntax.
- The Calico v3.26+ prerequisite is conservative and accurate (service match has been GA since v3.21).
- All `kubectl` and `calicoctl` commands shown (`get service`, `get endpoints`, `get networkpolicy`, `get networkpolicies -o wide`, `exec`, `-o jsonpath`, `-o yaml`) are valid current syntax.
- The mermaid flowchart syntax is valid.
- The conceptual explanation that service-based policies dynamically resolve to backing pod endpoints (so they survive scaling/restarts) is accurate.

## Review Notes
- The legacy `Endpoints` API (`kubectl get endpoints`) is still supported but Kubernetes is gradually shifting toward `EndpointSlice` (`kubectl get endpointslices`). The example commands continue to work, but a future revision could mention EndpointSlices for clusters where the Endpoints API is eventually removed.
- Calico also supports a `selector` form under `services` (matching by label) in addition to `name`/`namespace`. The post intentionally focuses on the name/namespace form, which is fine and is the most common usage.
- Minor grammar ("for roll out") in the intro paragraph does not affect technical correctness and was not modified per the "do not make stylistic changes" instruction.
