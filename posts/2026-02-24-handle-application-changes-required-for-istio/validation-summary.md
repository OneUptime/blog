# Validation Summary: How to Handle Application Changes Required for Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- Kubernetes health probes
- Istio protocol selection and port naming
- Distributed tracing headers
- Istio ServiceEntry
- Node.js with Axios
- Java Spring Boot with RestTemplate

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Distributed Tracing Overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Global Mesh Options: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Accessing External Services: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The health-check section incorrectly said Istio rewrites only HTTP probes and that TCP or exec probes bypass the sidecar. Updated it to reflect current Istio behavior: HTTP, TCP, and gRPC probes are rewritten by default, while exec probes run inside the container without Istio-specific rewrite.
- Several Deployment examples were missing required Kubernetes `selector`, pod labels, and container `image` fields. Added minimal fields so the manifests are structurally valid examples.
- The protocol sniffing section claimed automatic protocol detection adds latency to the first request. Removed the unsupported latency claim and kept the verified limitation around protocols without a clear client-first signature.
- The tracing section overstated that sidecars add trace headers to requests. Reworded it to say Istio participates in distributed tracing using trace context headers, while applications must propagate those headers for multi-service traces.
- The server-first protocol example used `name: mysql`. Istio documents server-first protocol handling as explicit TCP protocol selection, so the example now uses `name: tcp-mysql`.
- The graceful shutdown section said `preStop: sleep 5` gives the sidecar time to drain before the application starts shutting down. Reworded it to explain that the sleep gives Kubernetes time to remove the pod from service endpoints, and noted Istio's proxy drain behavior through `terminationDrainDuration`.
- The ServiceEntry example used `name: https` with `protocol: TLS`. Updated the port name to `tls` to match Istio's protocol naming convention for opaque TLS egress.
- The outbound traffic section described `REGISTRY_ONLY` as recommended for security. Istio explicitly notes outbound traffic policy is not an outbound security policy, so the wording now says it is useful for egress visibility and control.

## Review Notes
The Node.js and Java examples are illustrative snippets rather than complete runnable applications; the trace-header propagation logic shown is consistent with Istio's documented requirement to forward trace context headers.
