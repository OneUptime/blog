# Validation Summary: How to Roll Out Application-Layer Policy with Calico and Istio Safely

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Calico (v3.26+) `projectcalico.org/v3` NetworkPolicy
- Calico Application Layer Policy (ALP)
- Calico Dikastes (Envoy ext_authz enforcement sidecar)
- Istio service mesh (Envoy sidecar proxies)
- Kubernetes (sidecar injection, kubectl)
- HTTP method and path-based access control

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Istio integration / Application Layer Policy guide: https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico component architecture overview: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found

1. **Incorrect resource kind name in introduction.** The post stated "Calico's `projectcalico.org/v3` ApplicationPolicy (available with Istio integration)". There is no `ApplicationPolicy` resource kind in the `projectcalico.org/v3` API — HTTP-aware policy is implemented via the standard `NetworkPolicy` (or `GlobalNetworkPolicy`) resource with an `http` match clause. This was inconsistent with the YAML example below it, which correctly uses `kind: NetworkPolicy`. Fixed by changing the prose to: "Calico's `projectcalico.org/v3` NetworkPolicy with an `http` match clause (available with Istio integration)".

2. **Misleading Dikastes verification command.** The post included `kubectl get pods -n calico-system | grep dikastes`. Dikastes is not a pod in the `calico-system` namespace — it is a sidecar container injected into individual workload pods alongside the Envoy proxy. The original command would return no results. Replaced with two more useful checks: inspecting the `ApplicationLayer` custom resource (`kubectl get applicationlayer default -o yaml`) and verifying the Dikastes sidecar is present in workload pods after injection (`kubectl get pod -n production -l app=backend-api -o jsonpath='{.items[0].spec.containers[*].name}'`). Also swapped the istio-system check for `istiod`, which is the actual control-plane pod.

## Review Notes

- The `NetworkPolicy` YAML schema is accurate: `http.methods` accepts a list of HTTP method strings, and `http.paths` accepts a list of `HTTPPath` objects with `exact` or `prefix` fields. Verified against the Calico NetworkPolicy reference.
- The `order: 100` field semantics (lower order = higher priority in Calico) are unchanged.
- Application Layer Policy in Calico OSS requires explicit enablement (Policy Sync API + IstioOperator configuration) and additional infrastructure (Felix policy sync, Dikastes injection webhook). The post's prerequisites mention this only briefly with "Calico-Istio integration configured (Dikastes sidecar)"; a more thorough version would link to the full ALP enablement guide.
- There is a non-technical writing duplication in the conclusion ("Application-Layer Policy with Calico and Istio with Calico and Istio provides..."). Left unchanged per review guidelines (stylistic, not technical).
- The conclusion also mentions filtering on "HTTP methods, paths, and headers" — Calico's `http` match clause currently supports methods and paths reliably; header matching is more limited compared to Istio's native AuthorizationPolicy. Not factually wrong but worth noting for readers who need header-level control.
