# Validation Summary: How to Handle Legacy Applications That Don't Support mTLS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Istio mutual TLS
- Istio PeerAuthentication
- Istio DestinationRule
- Istio Gateway and VirtualService
- Istio Sidecar resource
- Kubernetes Deployments
- kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio protocol selection guide: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes Deployment reference: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post described application-level TLS plus sidecar mTLS as a general "double encryption problem." Istio can proxy TLS as opaque TCP, so this was narrowed to cases where Istio or another proxy is also configured to terminate or originate TLS for the same connection.
- The post said Envoy cannot parse custom or server-first protocols. Istio can proxy opaque TCP, but automatic protocol detection has limitations, so the wording now says these protocols may need explicit TCP protocol configuration.
- The Deployment snippets omitted `spec.selector` and pod labels required for complete `apps/v1` Deployment examples. Added `selector.matchLabels` and matching `template.metadata.labels`.
- The sidecar injection example used `sidecar.istio.io/inject` as an annotation. Current Istio documentation lists it as a pod label, so the snippet now uses it under `template.metadata.labels`.
- The mesh-excluded workload example included a `PeerAuthentication` for a pod with no sidecar. `PeerAuthentication` applies to incoming connections at an Envoy sidecar in sidecar mode, so the ineffective policy was removed and the text now focuses on `DestinationRule` plaintext configuration for clients with explicit mTLS policies.
- The "sidecar without mTLS" section implied `PeerAuthentication` disables TLS negotiation for all traffic from the workload. `PeerAuthentication` controls inbound mTLS, so the explanation now says it affects inbound connections and that outbound policy must use plaintext for clients to reach the host without mTLS.
- The interception-mode example used `sidecar.istio.io/interceptionMode: NONE` and pointed `HTTP_PROXY` at `127.0.0.1:15001`. Istio documents that annotation for `REDIRECT` or `TPROXY`, while explicit no-capture configurations use the `Sidecar` resource's `captureMode: NONE`. The example was replaced with a `Sidecar` resource using `captureMode: NONE`.

## Review Notes
- The post is now accurate for Istio sidecar mode as documented in Istio 1.30-era documentation. Ambient mode has different mTLS behavior, including no support for `DISABLE` in `PeerAuthentication`, but the post is framed around sidecars and does not need to cover ambient mode.
