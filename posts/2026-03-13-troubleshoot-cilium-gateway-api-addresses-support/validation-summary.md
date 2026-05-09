# Validation Summary: How to Troubleshoot Cilium Gateway API Addresses Support

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes Gateway API
- Kubernetes Services
- Cilium LB IPAM
- Gateway and HTTPRoute status conditions

## Sources Consulted
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium latest Gateway API Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gateway-api/
- Cilium LoadBalancer IP Address Management documentation: https://docs.cilium.io/en/latest/network/lb-ipam/
- Kubernetes Gateway API specification reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Cilium Gateway API controller source labels: https://raw.githubusercontent.com/cilium/cilium/main/operator/pkg/gateway-api/gateway.go

## Issues Found
- The prerequisites only said Cilium 1.14+ and did not call out the Cilium features required for this troubleshooting path. Updated the prerequisites to require Gateway API being enabled and Cilium LB IPAM for Gateway `spec.addresses` support.
- The Gateway `Programmed` condition was described as only indicating whether the address was applied. Updated the wording because Cilium and Gateway API use `Programmed` for the broader gateway configuration state; the condition message and reason identify the specific failure.
- The Service lookup command used the incorrect selector `cilium.io/gateway-name`. Updated it to `gateway.networking.k8s.io/gateway-name`, which is the Gateway API label used on generated Gateway Services.
- The architecture diagram implied Cilium Gateway address support handles Hostname addresses via DNS resolution. Updated the diagram because Cilium's documented Gateway address support only supports `IPAddress` addresses with LB IPAM.
- The architecture diagram referred specifically to cloud providers or MetalLB for assignment. Updated it to the more accurate generic load balancer implementation, because Cilium LB IPAM allocates IPs but does not provide load balancing by itself.

## Review Notes
The guide is technically relevant and the commands are valid Kubernetes commands. Future improvements could include examples for checking Service status conditions such as `io.cilium/lb-ipam-request-satisfied` and noting that host-network Gateway API mode is mutually exclusive with the default LoadBalancer Service exposure mode.
