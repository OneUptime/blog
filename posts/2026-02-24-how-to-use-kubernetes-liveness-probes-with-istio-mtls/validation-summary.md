# Validation Summary: How to Use Kubernetes Liveness Probes with Istio mTLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probes
- Kubernetes HTTP, TCP, gRPC, and exec probe mechanisms
- Istio sidecar injection
- Istio mTLS
- Istio probe rewriting
- Istio pod annotations and IstioOperator configuration
- kubectl

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Istio documentation: Health Checking of Istio Services - https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: Application Requirements / ports used by Istio - https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio documentation: Sidecar Injection Problems / holdApplicationUntilProxyStarts - https://preliminary.istio.io/latest/docs/ops/common-problems/injection/

## Issues Found
- The rewritten probe example used port 15021. Istio's health-check rewrite documentation shows application probe rewrites using `/app-health/...` on port 15020, so the example, explanation, verification text, and debug command were updated to use port 15020.
- The post said probe rewriting only works for HTTP probes. Istio documents that probe rewrite is used for HTTP, TCP, and gRPC probes by default, so the TCP/gRPC section was corrected.
- The TCP probe explanation said TCP probes generally work fine because the sidecar accepts the connection. Istio documents this as a false-positive problem: all TCP ports can appear open while the sidecar is running. The explanation was changed to describe Istio's TCP probe rewrite behavior.
- The gRPC probe explanation was updated to state that Istio handles gRPC probes through the same default rewrite mechanism.
- Two full `apps/v1` Deployment examples were missing required `spec.selector` and matching pod template labels. These were added so the manifests are structurally valid Kubernetes Deployment examples.
- The exec probe section said exec probes bypass the network entirely, but the curl/wget examples still use loopback networking inside the container. The wording was corrected to say they bypass the kubelet-to-pod network probe path.

## Review Notes
- The Kubernetes gRPC probe example is current for Kubernetes v1.27 and later, where native gRPC probes are stable. Kubernetes also notes that gRPC probes require a numeric port and do not support named ports or custom hostnames.
- The Istio annotation `sidecar.istio.io/rewriteAppHTTPProbers` is marked Alpha in the Istio annotation reference even though the rewrite behavior is enabled by default in built-in Istio profiles.
