# Validation Summary: How to Validate HTTP Method Policies with Calico and Istio Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Istio service mesh
- Envoy sidecars
- Dikastes
- HTTP method and path matching
- kubectl
- curl

## Sources Consulted
- Calico Open Source documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico Open Source documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico Open Source documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration

## Issues Found
- The introduction referred to a Calico `ApplicationPolicy` kind. Current Calico Open Source documentation describes HTTP method/path matching on `NetworkPolicy` and `GlobalNetworkPolicy`, so the text was corrected to reference those resources.
- The post claimed Calico-Istio policy could match HTTP headers. The current Calico Istio HTTP policy documentation describes method and path matching, so header references were removed.
- The prerequisite version line was too loose and potentially outdated. It was updated to reflect current documented requirements for Kubernetes native sidecars: Kubernetes v1.29+ and Istio v1.22+.
- The sample policy used an `action: Deny` rule with an `http` match. Calico's NetworkPolicy reference states application-layer HTTP match clauses must use `action: Allow`, so the invalid deny rule was removed. The denied DELETE request is now denied because it is not explicitly allowed.
- The setup checks looked for Dikastes as a pod in `calico-system`, but Dikastes is injected as a sidecar into workloads. The commands were changed to verify Felix policy sync, the CSI node driver, the pod-template injection annotation, and the resulting `dikastes` container.
- The test commands echoed curl's process exit code, which does not reliably indicate HTTP denial because curl can exit successfully for HTTP 403 responses. The commands now print the HTTP status code with `curl -w "%{http_code}"`.
- The conclusion duplicated "with Calico and Istio" and overstated the claim as "the most fine-grained network security available." The sentence was corrected while preserving the technical point.

## Review Notes
The post is now technically valid as a focused example, but a production-ready guide would normally also show the exact Calico/Istio installation path, policy application command, and expected HTTP status codes for the specific demo service.
