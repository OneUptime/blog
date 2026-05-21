# Validation Summary: How to Handle Application Incompatibilities with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Kubernetes Deployments, DaemonSets, Services, init containers, and pod labels/annotations
- Envoy sidecar proxy and iptables traffic capture
- Istio DestinationRule and VirtualService resources
- gRPC, WebSocket, and server-first TCP protocols

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio CNI compatibility with application init containers: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- gRPC custom load balancing guide: https://grpc.io/docs/guides/custom-load-balancing/
- gRPC service config guide: https://grpc.io/docs/guides/service-config/

## Issues Found
- The sidecar injection examples used the deprecated `sidecar.istio.io/inject` pod annotation. Updated those examples to use the current pod label form.
- The init-container section stated that init containers always fail when they need network access and showed a regular-container workaround that did not actually gate application startup. Clarified the standard sidecar mode behavior, mentioned native sidecar startup ordering, and changed the example so the application waits for a shared completion marker.
- The second init-container option claimed to exclude init container traffic but did not configure an exclusion. Updated the example to use `runAsUser: 1337`, matching Istio's documented bypass for init-container traffic captured by sidecar iptables rules.
- The Istio sidecar port list was incomplete. Added current Istio sidecar ports 15002, 15004, 15008, and 15053, and adjusted the descriptions to match the official application requirements.
- The gRPC guidance recommended a single connection per call, which is not the right framing for gRPC load balancing. Updated it to recommend normal service discovery when Istio handles load balancing, or proxyless gRPC with xDS when the client handles it.
- The WebSocket section conflated route timeout with idle timeout. Clarified that `timeout: 0s` disables the route timeout and that idle timeout tuning is separate.

## Review Notes
The remaining examples are intentionally illustrative and use placeholder images, commands, and hosts. The post is accurate for current Istio sidecar mode, but some behaviors can vary with Kubernetes native sidecars, Istio CNI, DNS capture, and platform-specific sidecar user IDs.
