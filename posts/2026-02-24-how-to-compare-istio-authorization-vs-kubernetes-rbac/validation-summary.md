# Validation Summary: How to Compare Istio Authorization vs Kubernetes RBAC

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes API authorization
- Istio AuthorizationPolicy
- Envoy proxy
- kubectl
- istioctl

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio explicit deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The comparison table incorrectly stated that Kubernetes RBAC defaults to "Allow all" when no policies exist. Kubernetes RBAC permissions are additive and requests are denied when no applicable permission grants the action, aside from built-in default roles and bindings. Updated the table to reflect this.
- The post described Istio AuthorizationPolicy enforcement only as "the Envoy sidecar level." Current Istio can enforce authorization through Istio Envoy proxies including sidecars, gateways, and waypoints depending on the data plane mode. Updated the wording and comparison table to avoid sidecar-only framing.

## Review Notes
The YAML examples use current Kubernetes RBAC and Istio AuthorizationPolicy API versions and valid fields. The `kubectl auth can-i` and `istioctl x authz check` commands match current official command references. The Istio default-deny example using an empty `spec` is consistent with Istio's documented `allow-nothing` pattern.
