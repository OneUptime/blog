# Validation Summary: How to Configure RBAC for Istio Multi-Tenancy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes RBAC
- Kubernetes namespaces
- Istio AuthorizationPolicy
- Istio traffic management resources
- Kubernetes ResourceQuota
- kubectl

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio deployment models and namespace tenancy documentation: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio configuration scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio security model: https://istio.io/latest/docs/ops/deployment/security-model/
- Istio security considerations for namespace-based multi-tenancy: https://istio.io/latest/blog/2026/security-considerations-on-namespace-based-multi-tenancy/

## Issues Found
- The post implied that Kubernetes RBAC prevents a tenant's Istio `VirtualService` from affecting other teams' traffic. Istio documentation notes that `VirtualService` routing rules can affect traffic across the mesh, and Istio's 2026 namespace-based multi-tenancy guidance recommends additional safeguards. I changed the wording to explain that RBAC is only one layer and that configuration scoping, admission controls, and runtime authorization policies are also needed.
- The post stated that `team-alpha` could not touch anything in other namespaces. With the provided RoleBinding, the team cannot modify resources stored in other namespaces, but Istio resource contents such as `hosts`, `gateways`, and `exportTo` can still influence cross-namespace routing. I narrowed the statement and added a caveat recommending admission policies or Istio scoping for tenant-safe settings.
- The post described `gateways`, `envoyfilters`, and `peerauthentications` as always mesh-wide. These resources can be namespace-scoped or workload-scoped depending on configuration, but they can affect shared or mesh-wide behavior. I adjusted the language to be technically accurate while preserving the recommendation to reserve them for the platform team.
- The AuthorizationPolicy examples use namespace-based source matching. Istio documents that source namespace matching is derived from peer identity and requires mTLS. I added a note to enforce mutual TLS for workloads that rely on those policies.
- The mesh-level default-deny example assumes `istio-system` is the Istio root namespace. Istio commonly uses `istio-system` as the default root namespace, but it is configurable. I updated the wording to say this applies in a default installation where `istio-system` is the root namespace.

## Review Notes
The YAML snippets use current Kubernetes RBAC and ResourceQuota APIs and current Istio `security.istio.io/v1`, `networking.istio.io`, and `telemetry.istio.io` API groups. The `kubectl auth can-i` impersonation flags are current according to the generated Kubernetes CLI reference. For stronger production guidance, a future revision could add concrete admission policy examples for restricting tenant `VirtualService` hosts, `gateways`, and `exportTo` values.
