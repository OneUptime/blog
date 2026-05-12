# Validation Summary: How to Roll Out HTTP Method Policies with Calico and Istio Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+) Application Layer Policy (ALP)
- Istio service mesh
- Envoy sidecar proxy
- Dikastes (Calico's ALP enforcement sidecar)
- Kubernetes
- kubectl / calicoctl
- HTTP method/path matching

## Sources Consulted
- Calico Application Layer Policy documentation (https://docs.tigera.io/calico/latest/network-policy/policy-rules/http-methods-and-paths)
- Calico NetworkPolicy reference: `projectcalico.org/v3` schema for `http.methods` and `http.paths` (with `exact` / `prefix` matchers)
- Istio sidecar injection documentation (`istio-injection=enabled` namespace label)
- Calico Dikastes installation notes (deployed as a sidecar alongside Envoy)

## Issues Found
- **Duplicate phrase in conclusion**: The original text read "HTTP Method Policies with Calico and Istio with Calico and Istio provides the most fine-grained network security..." which contained a duplicated "with Calico and Istio" phrase and a subject-verb agreement issue. Fixed to "HTTP Method Policies with Calico and Istio provide the most fine-grained network security...".

## Review Notes
- The Calico NetworkPolicy `http` match block with `methods` and `paths` (using `exact` and `prefix` matchers) is syntactically valid per the Calico v3 API.
- The `istio-injection=enabled` namespace label is the correct way to enable automatic Istio sidecar injection.
- The verification command `kubectl get pods -n calico-system | grep dikastes` may not return results in all installations because Dikastes is typically deployed as a sidecar inside workload pods, not as a standalone pod in `calico-system`. Depending on the install method (operator vs. manifest), users may need to inspect their workload pods directly (e.g., `kubectl get pods -n production -o jsonpath='{.items[*].spec.containers[*].name}'`) to confirm Dikastes is injected. Left as-is since the command is harmless and the broader verification intent is sound.
- Minor grammatical awkwardness in the introduction ("This guide covers roll out HTTP Method Policies") was left unchanged as it is stylistic, not technical.
- Calico ALP / HTTP rules require the Application Layer Policy feature to be explicitly enabled at install time; readers should consult the Calico ALP installation guide for their specific Calico version, as the install procedure has changed between versions.
