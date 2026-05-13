# Validation Summary: How to Log and Audit HTTP Method Policies with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico application layer policy
- Istio service mesh
- Envoy sidecars
- Dikastes sidecar
- Kubernetes
- kubectl
- curl

## Sources Consulted
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration

## Issues Found
- The introduction referred to a `projectcalico.org/v3` `ApplicationPolicy`. Official Calico documentation describes HTTP matching under Calico `NetworkPolicy` and `GlobalNetworkPolicy`, not an `ApplicationPolicy` kind. Updated the wording to reference NetworkPolicy and GlobalNetworkPolicy with application layer policy enabled.
- The post claimed Calico HTTP policy can reference headers. Current Calico HTTP match documentation lists HTTP methods and paths only. Removed header references from the introduction and conclusion.
- The sample policy used `action: Deny` with an `http` match clause. Calico's NetworkPolicy reference states application layer match clauses are supported only for ingress rules and rules with `action: Allow`. Removed the invalid deny rule and added a note that unmatched methods and paths are denied by application layer policy default-deny behavior.
- The setup command checked for Dikastes pods in `calico-system`, but Dikastes is injected as a sidecar into workload pods. Updated the verification commands to check workload pods and Dikastes container logs in the application namespace.
- The curl tests used shell exit status to infer allow/deny. curl returns exit code 0 for HTTP 403 unless configured otherwise, so this could report a denied request as successful. Updated the commands to print HTTP status codes.
- The conclusion repeated "with Calico and Istio" and overstated "the most fine-grained network security available in Kubernetes." Tightened this to a technically safer statement while preserving the author's intent.

## Review Notes
- The post is now technically aligned with current Calico documentation for Istio application layer policy. Future improvements could add the full IstioOperator and `inject.istio.io/templates: sidecar,dikastes` configuration, but that would expand the guide beyond the existing scope.
