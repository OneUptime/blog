# Validation Summary: How to Set Up Istio RBAC for Platform Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management APIs
- Istio security APIs
- Istio telemetry and extension APIs
- Kubernetes RBAC
- Kubernetes audit logging
- Helm templating
- kubectl impersonation checks

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Istio traffic management API reference: https://istio.io/latest/docs/reference/config/networking/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy API reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication API reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio in-cluster operator deprecation notice: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/

## Issues Found
- Kubernetes RBAC cannot enforce whether an Istio AuthorizationPolicy has a selector. Updated the low-risk categorization and Application Team Role section to explain that selector requirements need an admission control layer such as ValidatingAdmissionPolicy, Kyverno, or Gatekeeper.
- The Gateway Management Role included `resourceNames: []` and implied that `resourceNames` could limit Secret creation by name. Removed the empty `resourceNames` field and clarified that Kubernetes RBAC cannot restrict top-level `create` requests by resource name.
- The monitoring section suggested checking Kubernetes Events with `reason=Forbidden` for RBAC denials. Replaced it with a file-based audit-log example that filters for HTTP 403 responses against Istio API groups.
- The post treated `istio-system` as the universal mesh-wide configuration namespace. Updated wording to refer to the Istio root namespace, often `istio-system`, to match Istio documentation.
- The Platform Team ClusterRole description claimed full control over all Istio resources while granting only read access to IstioOperator objects. Updated the wording to distinguish runtime Istio resources from IstioOperator installation objects.

## Review Notes
The RBAC manifests use current Kubernetes RBAC API fields and valid Istio API groups/resource names for the covered resources. The `install.istio.io` IstioOperator API remains relevant for configuration files, but Istio's in-cluster operator workflow has been deprecated; keeping platform access read-only is appropriate for this RBAC-focused guide.
