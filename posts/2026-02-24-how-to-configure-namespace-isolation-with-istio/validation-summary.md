# Validation Summary: How to Configure Namespace Isolation with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mutual TLS
- Kubernetes namespaces and pod networking
- Kubernetes service accounts
- Kustomize overlays and patches
- kubectl and istioctl CLI usage

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio explicit deny authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Kubernetes multi-tenancy documentation: https://kubernetes.io/docs/concepts/security/multi-tenancy/
- kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The Kustomize example used `$(NAMESPACE)` inside `source.namespaces`, but setting `namespace: production` in a Kustomize overlay only sets resource metadata and does not substitute arbitrary strings inside resource fields. Changed the example to use a placeholder and an overlay JSON patch that replaces `/spec/rules/0/from/0/source/namespaces/0` with the target namespace.
- The validation section said blocked traffic should return "connection refused or a 403 Forbidden response." Istio HTTP authorization denial returns 403, while raw TCP behavior can appear as a failed or closed connection. Updated the wording to distinguish HTTP from TCP behavior.
- The sidecar injection pitfall said pods without sidecars are not subject to authorization policies. Clarified that sidecarless workloads do not enforce authorization policies on their own inbound traffic and do not present an Istio identity as clients, while strict mTLS can still reject plaintext connections to meshed workloads.

## Review Notes
The Istio `security.istio.io/v1` snippets for `PeerAuthentication` and `AuthorizationPolicy` use current API versions and valid fields. The post assumes the Istio root namespace is `istio-system`, which is the common default but can be configured differently during installation.
