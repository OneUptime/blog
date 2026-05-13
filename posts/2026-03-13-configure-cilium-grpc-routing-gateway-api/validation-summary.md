# Validation Summary: How to Configure gRPC Routing in the Cilium Gateway API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium Gateway API
- Kubernetes Gateway API
- GRPCRoute
- gRPC
- grpcurl
- Kubernetes Services

## Sources Consulted
- Cilium Gateway API support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Gateway API gRPC example: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/grpc/
- Cilium Helm reference for Gateway API ALPN and appProtocol options: https://docs.cilium.io/en/latest/helm-reference/
- Kubernetes Gateway API GRPCRoute documentation: https://gateway-api.sigs.k8s.io/api-types/grpcroute/
- grpcurl TLS usage documentation: https://grpcurl.com/

## Issues Found
- The post described GRPCRoute as experimental and installed Gateway API v1.1.0 experimental CRDs. Current Gateway API documentation states GRPCRoute has been in the Standard Channel since v1.1.0, and current Cilium documentation targets Gateway API v1.4.1 standard CRDs for GRPCRoute. I updated the wording and CRD install commands.
- The GRPCRoute manifest used `apiVersion: gateway.networking.k8s.io/v1alpha2`. Current Gateway API and Cilium examples use `gateway.networking.k8s.io/v1`, so I updated the manifest.
- The prerequisites omitted Cilium's documented ALPN requirement for TLS gRPC Gateway listeners. I added `gatewayAPI.enableAlpn=true` to the prerequisites and clarified the TLS Gateway note.
- The post did not mention Cilium's documented backend protocol selection requirement for plaintext HTTP/2 backends. I added a note to set the backend Service port `appProtocol` to `kubernetes.io/h2c`.
- The grpcurl command connected to a TLS Gateway by IP with an authority override but no trust configuration. For a self-signed or private demo certificate, grpcurl needs `-insecure` or `-cacert`; I added `-insecure` to keep the example runnable.
- The conclusion said the setup works without proxy dependencies. Cilium Gateway API traffic is handled through Cilium's Envoy integration, so I changed the wording to refer to Cilium's eBPF datapath and Envoy proxy without a separate ingress controller.

## Review Notes
The article remains a concise guide and does not include full backend Service or certificate setup. In a future expansion, adding the Service manifest with `appProtocol: kubernetes.io/h2c` and a TLS Secret creation step would make the example fully self-contained.
