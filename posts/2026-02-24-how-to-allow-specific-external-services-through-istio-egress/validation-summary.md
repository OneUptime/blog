# Validation Summary: How to Allow Specific External Services Through Istio Egress

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry
- Istio egress traffic control
- Istio outboundTrafficPolicy REGISTRY_ONLY
- Kubernetes kubectl exec
- istioctl proxy-config
- TLS and HTTPS egress configuration

## Sources Consulted
- Istio ServiceEntry API reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio egress control task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio configuration scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post repeatedly said to use `protocol: TLS` instead of `protocol: HTTPS` for ordinary HTTPS API calls. Istio's current protocol selection docs define `HTTPS` as the protocol for HTTP over TLS, while `TLS` is for raw TLS encrypted data. Updated the HTTPS API, cloud provider, messaging, observability, and namespace examples to use `protocol: HTTPS`.
- The explanation claimed `protocol: HTTPS` should only be used for sidecar TLS origination. Istio's TLS origination documentation shows origination as a DestinationRule TLS setting where the application sends plaintext HTTP and Istio opens HTTPS upstream connections. Updated the explanation to distinguish HTTPS pass-through handling from raw TLS and TLS origination.
- The MongoDB Atlas ServiceEntry used a `tcp-mongo` port name with `protocol: TLS`. Updated the port name to `tls-mongo` so the name aligns with the declared protocol.
- The `istioctl proxy-config clusters deploy/my-app` example used a deployment-style target. The istioctl command reference documents proxy-config clusters against a proxy workload such as a pod name. Updated the example to use `<my-app-pod>`.

## Review Notes
- The wildcard examples using `resolution: NONE` are still consistent with Istio wildcard egress documentation. Current Istio also supports `resolution: DYNAMIC_DNS` for wildcard hosts in newer releases, which may be worth mentioning in a future update if the post targets Istio 1.30 and later specifically.
