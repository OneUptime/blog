# Validation Summary: How to Set Up Kubernetes Gateway API HTTPRoute for Path-Based Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- HTTPRoute
- Gateway and GatewayClass
- Kong Ingress Controller
- Helm
- kubectl
- Kubernetes Services

## Sources Consulted
- Kubernetes Gateway API installation guide: https://gateway-api.sigs.k8s.io/guides/
- Kubernetes Gateway API v1.5.1 release notes: https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.5.1
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API HTTP request mirroring guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-request-mirroring/
- Kubernetes Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-header-modifier/
- Kong Ingress Controller Helm installation guide: https://developer.konghq.com/kubernetes-ingress-controller/install/
- Kong Ingress Controller Gateway API guide: https://developer.konghq.com/kubernetes-ingress-controller/gateway-api/

## Issues Found
- The Gateway API CRD install command used the old `v1.0.0` release and plain client-side apply. Updated it to `v1.5.1` with `--server-side=true`, matching the current Gateway API release guidance.
- The introduction implied regular expression path matching is generally supported by HTTPRoute. Updated the wording to clarify that regular expression support is implementation-specific.
- The Kong Helm command included an unnecessary `--set gateway.enabled=true` value that is not part of Kong's current documented quick install command. Removed it.
- The Gateway example referenced `gatewayClassName: kong` without creating a matching `GatewayClass`. Added the Kong `GatewayClass` with `controllerName: konghq.com/kic-gateway-controller` and the documented unmanaged GatewayClass annotation.
- The Gateway example included an HTTPS listener that referenced a `production-tls` Secret that the tutorial never created. Removed the HTTPS listener so the shown Gateway can be programmed for the HTTP examples as written.
- The path-prefix comments used `/users/*` style wording, which can obscure Gateway API's element-wise `PathPrefix` semantics. Updated the comments to say `/users and /users/...`.
- The backend section said to deploy backend services, but only Service objects were shown and no Pods or Deployments were created. Updated the wording to clarify these Services target existing backend Pods.
- The testing commands read the Gateway status address, which is not the path Kong documents for testing its proxy. Updated the commands to read the `kong-gateway-proxy` Service address.

## Review Notes
The YAML snippets parse successfully. `kubectl` and `helm` are not installed in the local workspace, so CLI validation was performed against official documentation rather than local command execution.
