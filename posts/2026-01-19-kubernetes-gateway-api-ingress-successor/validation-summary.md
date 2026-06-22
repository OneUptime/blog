# Validation Summary: How to Implement Kubernetes Gateway API

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes Gateway API
- GatewayClass, Gateway, HTTPRoute, GRPCRoute, TCPRoute, UDPRoute, TLSRoute
- ReferenceGrant
- BackendTLSPolicy
- Envoy Gateway
- NGINX Gateway Fabric
- Istio Gateway API support
- Prometheus ServiceMonitor and PromQL

## Sources Consulted
- Kubernetes Gateway API official API reference: https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/
- Kubernetes Gateway API official repository status and releases: https://github.com/kubernetes-sigs/gateway-api
- Kubernetes Gateway API getting started guide: https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/
- Kubernetes blog, Gateway API v1.4 feature announcement: https://kubernetes.io/blog/2025/11/06/gateway-api-v1-4/
- Envoy Gateway Helm installation docs: https://gateway.envoyproxy.io/v1.4/install/install-helm/
- NGINX Gateway Fabric Helm installation docs: https://docs.nginx.com/nginx-gateway-fabric/install/helm/
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/

## Issues Found
- Updated Gateway API CRD installation from v1.0.0 to v1.5.1 and added server-side apply, matching the current Gateway API release and installation guidance.
- Updated Envoy Gateway Helm install version from v1.0.0 to v1.4.6, matching the current Envoy Gateway Helm installation documentation consulted.
- Replaced outdated NGINX Gateway Fabric v1.1.0 GitHub YAML install commands with the current NGINX Gateway Fabric Helm-based install flow and v2.6.5 Gateway API CRD kustomize path.
- Replaced the outdated Istio `PILOT_ENABLE_GATEWAY_API` install flag with the current documented Istio flow: install Gateway API CRDs first, then install Istio with the minimal profile.
- Corrected the header routing comment that described a header value match as a header-presence match.
- Updated GRPCRoute, TCPRoute, UDPRoute, TLSRoute, ReferenceGrant, and BackendTLSPolicy examples to use the current `gateway.networking.k8s.io/v1` APIs where they are GA.
- Corrected the ReferenceGrant examples so they demonstrate the target-namespace grant model for cross-namespace Secret and Service references.
- Updated BackendTLSPolicy fields from the old alpha shape to the current v1 schema: `targetRefs`, `validation`, `caCertificateRefs`, and a core-supported ConfigMap CA reference.
- Updated the summary table to reflect current GA status for GRPCRoute, TCPRoute, UDPRoute, TLSRoute, ReferenceGrant, and BackendTLSPolicy.

## Review Notes
The examples remain controller-dependent in practice: specific filters, metrics, and protocol routes require support from the selected Gateway controller. The post is technically relevant and was corrected for current Gateway API versions as of 2026-06-22.
