# Validation Summary: How to Fine-Tune Sidecar Proxy Ports and Protocols

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Envoy proxy configuration
- Kubernetes Services
- Istio Sidecar resources
- Istio MeshConfig
- istioctl

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio PortNameIsNotUnderNamingConvention analyzer: https://istio.io/latest/docs/reference/config/analysis/ist0118/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Istio API MeshConfig package documentation: https://pkg.go.dev/istio.io/api/mesh/v1alpha1

## Issues Found
- The introduction and default handling section said the sidecar intercepts all traffic. Istio's documentation states that non-TCP protocols such as UDP are not proxied, so the wording was narrowed to TCP traffic.
- The protocol table listed MongoDB, Redis, and MySQL without noting that Istio marks these as experimental application protocol support. Added that they require the corresponding protocol environment variables and otherwise behave as opaque TCP.
- The Sidecar examples used `networking.istio.io/v1beta1`. Updated them to the current `networking.istio.io/v1` API version used by Istio's current documentation.
- The egress example used `~/*` for an HTTPS external destination. In Sidecar host syntax, `~/*` trims outbound service configuration instead of selecting an external host. Replaced it with an example external host pattern and adjusted the explanation of egress listener ports and unknown outbound traffic.
- The `protocolDetectionTimeout` default was described as different for outbound and server-side detection. Current Istio API documentation says the default detection timeout is `0s`, disabling the timeout. Updated the statement.
- The troubleshooting text called Service port naming an annotation. Changed it to refer to the Service port name or `appProtocol` field.

## Review Notes
The `istioctl` listener commands and flags in the post match the current official command reference. `istioctl` was not installed locally, so command verification was done against official documentation rather than local `--help` output.
