# Validation Summary: How to Write AuthorizationPolicy YAML (Cheat Sheet)

## Status
validated

## Post Type
Reference

## Technologies Covered
- Istio AuthorizationPolicy
- Kubernetes YAML
- Istio security and RBAC
- Istio external authorization providers
- JWT claim-based authorization

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio authorization tasks: https://istio.io/latest/docs/tasks/security/authorization/

## Issues Found
- The AUDIT section described AUDIT as "Dry Run". Istio's AUDIT action marks matching requests for audit and does not affect allow/deny decisions, while dry-run is configured separately with the `istio.io/dry-run` annotation. I changed the heading and description to avoid conflating the two.
- The list of source negation fields was incomplete for current Istio. I added `notServiceAccounts`, `notRemoteIpBlocks`, and `notTrustDomains`.
- The mesh-wide policy section assumed `istio-system` is always the root namespace. Istio applies root-namespace policies mesh-wide, and `istio-system` is only correct when it is configured as the root namespace. I updated the wording to make that assumption explicit.

## Review Notes
- The examples use `apiVersion: security.istio.io/v1`, which is current in Istio 1.30.
- Namespace, principal, service account, and trust-domain source matches depend on peer certificate identity and require mTLS-derived source attributes to be available.
- For DENY policies using HTTP-only attributes such as methods or paths, Istio treats missing attributes as matches on TCP traffic, so production DENY policies should generally be scoped to ports when mixed HTTP/TCP traffic is possible.
