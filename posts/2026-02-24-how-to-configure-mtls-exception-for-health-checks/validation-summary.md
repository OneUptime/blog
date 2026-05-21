# Validation Summary: How to Configure mTLS Exception for Health Checks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- mutual TLS (mTLS)
- PeerAuthentication
- Kubernetes liveness, readiness, startup, HTTP, TCP, gRPC, and exec probes

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio 1.12 upgrade notes for TCP probe rewriting: https://istio.io/latest/news/releases/1.12.x/announcing-1.12/upgrade-notes/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The post said rewritten probes use port 15021. Current Istio documentation shows application probe rewrite paths using the sidecar status port 15020, so the examples and debug command were updated to use 15020.
- The command for checking whether probe rewriting is enabled grepped for `holdApplicationUntilProxyStarts`, which is unrelated to probe rewriting. It now checks the sidecar injector config for `rewriteAppHTTPProbe`.
- The post said Istio only rewrites HTTP and gRPC probes and that TCP probes are passed through. Current Istio documentation says HTTP, TCP, and gRPC probes are rewritten by default, and Istio 1.12 fixed TCP probes by using the same mechanism as HTTP probes. The TCP section and failure-case list were corrected.
- The post tied automatic probe rewriting to Istio 1.10 without a current official source for that version-specific claim. The version-specific wording was removed.
- The gRPC section mentioned the `grpc-health-probe` binary alongside Kubernetes native gRPC probes. Since the binary is commonly used as an exec probe and Istio's rewrite applies to Kubernetes gRPC probes, the wording was narrowed to Kubernetes native gRPC probes.
- The Deployment manifest omitted the required `.spec.selector` and matching pod template labels for an `apps/v1` Deployment. The selector and labels were added.
- The `portLevelMtls` explanation did not mention that Istio expects the workload/container port and that the port must be bound to a Kubernetes Service. That clarification was added.

## Review Notes
The PeerAuthentication API version and mTLS modes are current. The exec probe and Kubernetes native gRPC probe examples match Kubernetes probe syntax. Future revisions could add a complete Service manifest for the separate health-check port so the `portLevelMtls` prerequisite is explicit in the runnable example.
