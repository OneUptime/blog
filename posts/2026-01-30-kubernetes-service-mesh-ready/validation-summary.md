# Validation Summary: How to Build Kubernetes Service Mesh Ready Apps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, probes, lifecycle hooks, and Services
- Istio sidecar injection, health probe rewriting, VirtualService timeouts, retries, and tracing
- Linkerd proxy injection, ServiceProfiles, proxy annotations, retries, and timeouts
- Node.js HTTP server and Express applications
- Axios HTTP client middleware
- Python Flask request hooks
- Redis-backed idempotency storage
- W3C Trace Context and B3 tracing headers

## Sources Consulted
- Kubernetes: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes: Container Lifecycle Hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes: Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Istio: Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio: Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio: Distributed Tracing Overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio: Distributed Tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio: VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Linkerd: Service Profiles reference: https://linkerd.io/2-edge/reference/service-profiles/
- Linkerd: Retries and Timeouts: https://linkerd.io/2-edge/features/retries-and-timeouts/
- Linkerd: Proxy Configuration: https://linkerd.io/2-edge/reference/proxy-configuration/
- Linkerd: Automatic Proxy Injection: https://linkerd.io/2-edge/features/proxy-injection/
- Linkerd: Protocol Detection and opaque/skip ports: https://linkerd.io/2-edge/features/protocol-detection/
- Linkerd: HTTP Access Logging: https://linkerd.io/2-edge/features/access-logging/
- Node.js HTTP server documentation: https://nodejs.org/api/http.html
- Express 4.x API reference: https://expressjs.com/en/4x/api/
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis node client guide: https://redis.io/docs/latest/develop/clients/nodejs/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The first Kubernetes Deployment snippet omitted the required `.spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added selector and labels.
- The Istio probe rewrite example placed `sidecar.istio.io/rewriteAppHTTPProbers` on Deployment metadata and described it as bypassing Envoy with a dedicated probe port. Official Istio docs require the annotation on the pod template and describe rewriting probes to the sidecar agent. Moved the annotation and corrected the explanation/comments.
- The header propagation section listed Envoy retry-control headers as routing headers to propagate. Changed this to warn against blindly propagating retry-control headers, since tracing context propagation should focus on trusted trace headers and retry behavior should normally be governed by mesh policy.
- The Express header propagation route referenced `req.params.userId` and `req.params.productId`, but the route only defined `:id`. Changed the downstream examples to read `userId` and `productId` from query parameters.
- The Kubernetes shutdown sequence showed `SIGTERM` before `preStop`. Official Kubernetes docs state `preStop` runs before TERM is sent and counts against `terminationGracePeriodSeconds`. Updated the text and diagram.
- The graceful shutdown examples configured `shutdownTimeout` but did not use it while waiting for `server.close()`, which can wait for active connections. Added timeout handling around server close.
- The idempotency example used `x-request-id` and a non-atomic get/execute/set sequence, which could execute duplicate concurrent retries. Changed it to require `x-idempotency-key`, use Redis `SET` with `NX` and `EX` as a lock, use node-redis `setEx`, and return explicit error responses for missing or in-progress duplicate requests.
- The final Deployment manifest enabled both Istio and Linkerd sidecar injection annotations. Updated the comments and left Linkerd injection commented so the example does not inject both meshes into the same pod.

## Review Notes
Linkerd ServiceProfiles are still documented and supported, but current Linkerd guidance notes that HTTPRoute/GRPCRoute are the newer retry and timeout configuration path in recent Linkerd versions. The ServiceProfile example remains valid, but a future post update could show the newer route API alongside it.
