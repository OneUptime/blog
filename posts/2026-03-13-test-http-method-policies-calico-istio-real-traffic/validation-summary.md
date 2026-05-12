# Validation Summary: How to Test HTTP Method Policies with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 NetworkPolicy)
- Calico Application Layer Policy (ALP)
- Istio service mesh
- Envoy sidecar proxy
- Dikastes (Calico's policy enforcement sidecar)
- Kubernetes
- kubectl / calicoctl

## Sources Consulted
- Calico docs: Use HTTP methods and paths in policy rules — https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico docs: Network policy resource reference — https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico docs: Enforce Calico network policy for Istio service mesh — https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy

## Issues Found
1. **Incorrect Dikastes verification command.** The original setup section ran `kubectl get pods -n calico-system | grep dikastes`. Dikastes is not deployed as a standalone pod in `calico-system`; it is injected as a sidecar container inside each application pod alongside Envoy. Replaced with a check that inspects the container list of a backend pod (`kubectl get pod -l app=backend-api -n production -o jsonpath='{.items[0].spec.containers[*].name}'`), which is the documented way to confirm Dikastes injection.
2. **Imprecise terminology around "ApplicationPolicy".** The post referred to "Calico's `projectcalico.org/v3` ApplicationPolicy". There is no `ApplicationPolicy` kind in Calico; the feature is named "Application Layer Policy" and is implemented via the existing `NetworkPolicy`/`GlobalNetworkPolicy` resources using the `http` match clause. Updated the wording to reflect this and to mention Dikastes as the enforcer working alongside Envoy.

## Review Notes
- The YAML policy (`apiVersion`, `kind`, `spec.ingress[].http.methods`, and `spec.ingress[].http.paths` with `exact:` / `prefix:` entries) matches the Calico v3 reference schema and is syntactically valid.
- The mermaid diagram references `/api/admin` while the policy uses `/api/v1/admin`; this is a minor illustrative inconsistency rather than a technical error and was left unchanged per the "only fix technical errors" guidance.
- The conclusion contains a duplicated phrase ("HTTP Method Policies with Calico and Istio with Calico and Istio") — a stylistic issue, not a technical one, so it was left untouched.
- Application Layer Policy requires extra installation steps (enabling ALP, installing the Dikastes mutating webhook). Readers should consult the Calico ALP installation guide before applying the policies in this post.
