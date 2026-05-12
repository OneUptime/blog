# Validation Summary: How to Test Application-Layer Policy with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+) Application Layer Policy
- Istio service mesh + Envoy sidecar
- Calico Dikastes (per-pod policy enforcement sidecar)
- Kubernetes NetworkPolicy (projectcalico.org/v3)
- `calicoctl` / `kubectl`
- Mermaid (diagram syntax)

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico "Enforce network policy for Istio service mesh" guide: https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico Istio integration (hardway): https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration

## Issues Found

1. **Incorrect CRD reference ("ApplicationPolicy")** — The introduction described `projectcalico.org/v3 ApplicationPolicy` as the policy type used with Istio. There is no such CRD in Calico; application-layer rules are configured on the standard `NetworkPolicy` (or `GlobalNetworkPolicy`) resource via the `http` match field. Updated the wording to "NetworkPolicy (with the `http` match field enabled via Istio integration)".

2. **Grammar in introduction** — "This guide covers test App-Layer Policy..." was ungrammatical. Changed to "This guide covers testing App-Layer Policy...".

3. **Incorrect Dikastes verification command** — The post ran `kubectl get pods -n calico-system | grep dikastes` to check Dikastes. Dikastes is injected as a per-pod sidecar in workload pods (via Istio sidecar injection with the `inject.istio.io/templates: sidecar,dikastes` template), not as a pod in `calico-system`. Replaced with a command that inspects a workload pod's container list for `dikastes`.

4. **Inconsistent path in Mermaid diagram** — The architecture diagram referenced `DELETE /api/admin`, while the policy denies `/api/v1/admin`. Aligned the diagram to `/api/v1/admin`.

5. **Duplicated phrase in conclusion** — "Application-Layer Policy with Calico and Istio with Calico and Istio provides..." contained a repeated clause. Removed the duplication.

## Review Notes
- The `http` match field is only supported on **ingress** rules in Calico NetworkPolicy; the example correctly uses `types: [Ingress]` and ingress rules only. Worth being explicit about this constraint in a future revision.
- Application Layer Policy is an opt-in feature that requires Calico's Istio integration to be installed (Dikastes sidecar + Felix configuration). The post mentions this in prerequisites but does not show the enablement steps; readers may need to consult the Calico ALP install guide before the YAML in the post will be enforced.
- `calicoctl` is listed as a prerequisite but is not actually used in the commands shown — `kubectl` alone suffices for applying the `projectcalico.org/v3` NetworkPolicy when the Calico API server is installed. Not an error, but slightly misleading.
- The `curl` exit code check (`$?`) reflects whether `curl` itself succeeded, not the HTTP status — a denied request returning 403 still gives `curl` exit code 0. For a stricter check, `curl -f` or inspecting the HTTP response code (e.g. `-o /dev/null -w '%{http_code}'`) would be more accurate. Left as-is since the post's intent is illustrative.
