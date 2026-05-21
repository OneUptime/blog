# Validation Summary: How to Control Access Based on Source Namespace in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mutual TLS
- Kubernetes namespaces
- Kubernetes kubectl
- SPIFFE workload identities

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts: https://istio.io/latest/docs/concepts/security/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio mutual TLS migration guide: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described mTLS as enabled by default in most installations. Istio does use automatic mTLS between meshed workloads by default, but destination workloads are commonly in `PERMISSIVE` mode until strict mTLS is configured. Updated the wording to distinguish automatic mTLS from strict mTLS.
- The `notNamespaces` ALLOW example said it allows every namespace except `sandbox` without a strict-mTLS caveat. Istio's own guidance recommends using mTLS-derived fields such as `namespaces` and `notNamespaces` with strict mTLS to avoid unexpected behavior with plaintext traffic. Updated the explanation to make the statement conditional on strict mTLS.
- The external traffic note said traffic with no namespace will not match any `namespaces` condition. Clarified that this applies to positive `namespaces` conditions, because negative namespace matching has different implications.

## Review Notes
The AuthorizationPolicy and PeerAuthentication snippets use current `security.istio.io/v1` APIs and valid fields. The `kubectl run` and `kubectl exec` command forms match the current Kubernetes command references, though the examples assume the namespaces already exist and that the test pods are injected into the mesh or otherwise enrolled as appropriate for the Istio data plane mode.
