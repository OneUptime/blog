# Validation Summary: How to Troubleshoot Cilium Gateway API Support

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes Gateway API
- Kubernetes Services and Secrets
- HTTPRoute and GatewayClass resources
- Envoy

## Sources Consulted
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium latest Gateway API Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gateway-api/
- Kubernetes Gateway API GatewayClass documentation: https://gateway-api.sigs.k8s.io/api-types/gatewayclass/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes Gateway API infrastructure labels guidance: https://gateway-api.sigs.k8s.io/guides/infrastructure/
- Kubernetes Secret documentation for TLS Secrets: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The introduction described eBPF programs as directly routing Gateway API traffic based on route configuration. Cilium's documentation states that the operator translates Gateway API resources into Cilium Envoy Configuration resources, the agent supplies those to Envoy, and Envoy handles the Gateway traffic. Updated the text and diagram to refer to Envoy configuration.
- The prerequisites only mentioned Gateway API being enabled. Cilium's Gateway API documentation also requires the Gateway API CRDs, kube-proxy replacement, and the L7 proxy. Added those prerequisites.
- The Service lookup used `cilium.io/gateway-name=<gateway-name>`. Gateway API generated infrastructure uses the standard `gateway.networking.k8s.io/gateway-name` label. Updated the command to use the standard label.
- The HTTPRoute troubleshooting note named `NoMatchingParent` as the reason for a missing parent. Cilium's troubleshooting documentation shows `InvalidHTTPRoute` with a message that the Gateway was not found. Reworded the guidance to match Cilium while still focusing on the parent reference problem.

## Review Notes
The post remains intentionally concise. Future improvements could mention host network mode, where Cilium does not expose the Gateway through the default LoadBalancer Service path.
