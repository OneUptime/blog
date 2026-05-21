# Validation Summary: How to Configure Protocol Selection in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Services
- Envoy sidecar proxies
- Istio Gateway
- Istio DestinationRule
- gRPC, HTTP/1.1, HTTP/2, TLS, TCP

## Sources Consulted
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio MeshConfig API source for `protocolDetectionTimeout`: https://raw.githubusercontent.com/istio/api/master/mesh/v1alpha1/config.proto
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service application protocol documentation: https://kubernetes.io/docs/concepts/services-networking/service/#application-protocol

## Issues Found
- Corrected the `appProtocol` version note. The post said Kubernetes 1.19 and Istio 1.18+; Istio's current protocol selection docs describe use with Kubernetes 1.18+, and Kubernetes documents the field as stable in 1.20.
- Corrected the `protocolDetectionTimeout` section. The post said `0s` disables sniffing and treats unnamed ports as raw TCP. Current Istio API source says `0s` means no timeout, and setting a timeout is generally not recommended. The section now explains timeout tuning and recommends explicit Service protocol declaration to avoid sniffing.
- Added the official caveat that `mongo`, `mysql`, and `redis` protocol support is experimental and requires the corresponding Istio protocol filter to be enabled.
- Corrected the Gateway protocol list to include `GRPC-WEB`, which is accepted by the Istio Gateway `protocol` field.
- Tightened the mixed HTTP/gRPC same-port guidance so it only claims compatibility for HTTP/2 and gRPC on the same port, rather than implying HTTP/1.1 and gRPC should always be labeled as `grpc`.

## Review Notes
The remaining YAML examples use current Kubernetes core Service fields and Istio `networking.istio.io/v1` APIs. The `istioctl x describe service` command is experimental, but it is still documented in the current Istio command reference.
