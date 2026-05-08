# Validation Summary: How to Validate Cilium Gateway API Addresses Support

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Cilium Gateway API
- Kubernetes Gateway API
- Kubernetes Services
- HTTPRoute
- kubectl JSONPath
- Cilium CLI and operator diagnostics

## Sources Consulted
- Cilium Gateway API documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium HTTP Gateway API documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/http/
- Kubernetes Gateway API reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Cilium source for generated Gateway Service labels: https://github.com/cilium/cilium/blob/v1.19.3/operator/pkg/model/translation/gateway-api/translator.go

## Issues Found
- The LoadBalancer Service selector used `cilium.io/gateway-name`, which is not the label Cilium applies to generated Gateway Services. Changed it to `gateway.networking.k8s.io/gateway-name`, matching the current Cilium implementation.
- The Service status JSONPath only returned `.ip`, but Kubernetes LoadBalancer ingress entries can expose either `ip` or `hostname`. Updated the command and surrounding text to validate either value.
- The HTTP connectivity test assumed all routes can be reached by direct address alone. Added a Host header example for HTTPRoutes that match a specific hostname.
- The final Cilium diagnostic section checked `ciliumendpoints`, which validates workload endpoint state but does not directly validate the Gateway controller or generated Gateway datapath. Replaced it with `cilium status` and Cilium operator log inspection for Gateway-related diagnostics.

## Review Notes
The post is technically relevant and contains runnable validation commands. The checks remain version-neutral, but Cilium label behavior was verified against the current stable Cilium documentation and Cilium v1.19.3 source.
