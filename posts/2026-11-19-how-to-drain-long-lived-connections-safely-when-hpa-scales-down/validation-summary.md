# Validation Summary: How to Drain Long-Lived Connections Safely When HPA Scales Down

## Status

validated

## Post Type

Technical guide with Kubernetes configuration fragments and diagnostic commands.

## Technologies Covered

- Kubernetes Deployments, Pod lifecycle hooks, termination grace periods, and readiness probes
- Horizontal Pod Autoscaler (HPA), autoscaling/v2 scaling policies, and stabilization
- PodDisruptionBudgets and the Eviction API
- EndpointSlices, Services, ingress, and load-balancer routing
- kubectl
- HTTP/2, gRPC, and WebSockets
- Application draining, client reconnection, backoff, and resumable work

## Sources Consulted

- [Kubernetes v1.35 Pod lifecycle and termination](https://v1-35.docs.kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination): termination sequence, hook budget, signals, and concurrent endpoint updates.
- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/): desired replicas, scaling policies, stabilization, and HPA CLI support.
- [HorizontalPodAutoscaler autoscaling/v2 API reference](https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/): behavior fields and allowed policy values.
- [Kubernetes Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/): lifecycle hooks, readiness probes, and termination settings.
- [Kubernetes disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/): eviction budgets and direct deletion limitations.
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/): endpoint conditions and Service label selection.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): resource queries, label selectors, watches, namespaces, and YAML output.
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/): resource descriptions and namespace selection.
- [gRPC graceful shutdown](https://grpc.io/docs/guides/server-graceful-stop/): stopping new RPCs while allowing in-flight RPCs to finish within a bounded shutdown interval.
- [RFC 9113, section 6.8](https://www.rfc-editor.org/rfc/rfc9113.html#section-6.8): HTTP/2 GOAWAY and graceful connection shutdown.
- [RFC 6455, sections 7.2.3 and 7.3](https://www.rfc-editor.org/rfc/rfc6455.html#section-7.2.3): WebSocket closure, randomized reconnect delays, and increasing retry backoff.
- [Author GitHub profile](https://github.com/nawazdhandala): verified the linked author URL resolves to the expected profile.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The article is technically relevant and contains implementation details that warrant validation.
- The termination explanation correctly places preStop inside the grace period and avoids implying that endpoint propagation completes before shutdown begins. The example allocates 45 seconds to draining, 30 seconds to cleanup, and 15 seconds to margin within 90 seconds. These are illustrative budgets, not measured guarantees.
- The Deployment YAML is explicitly a fragment. Its lifecycle and readiness fields are valid; a complete Deployment still needs its usual metadata, selector, and matching template labels. The image is intentionally a placeholder, and /app/drain is explicitly an application-provided executable. Its behavior cannot be verified without the implementation.
- The HPA fragment belongs under spec in an autoscaling/v2 HorizontalPodAutoscaler. The one-Pod policy, 120-second policy period, and 300-second stabilization window use valid fields and values. Stabilization uses historical recommendations rather than promising an exact delay after every termination. HPA behavior does not coordinate unrelated lifecycle events.
- PDB protection is correctly limited to supported eviction operations. Ordinary workload scale-down and direct Pod deletion do not require approval from the Eviction API.
- The EndpointSlice conditions and kubernetes.io/service-name selector are valid. Serving and terminating conditions are stable from Kubernetes v1.26. Routing consumers can differ, so testing the actual ingress path is appropriate.
- The three kubectl commands use documented resources, flags, and argument forms. The first command watches continuously; stop it or use another terminal to run the remaining commands.
- HTTP/2 and gRPC support graceful shutdown mechanisms, but arbitrary long-lived sessions still require application-specific recovery. The article correctly avoids promising seamless natural completion within a short termination budget.
- The version-pinned v1.35 lifecycle link and the disruptions link resolve to the relevant official resources. No deprecated API usage was identified in the examples.
- Validation is based on documentation and static inspection. No live cluster downscale, ingress behavior, application shutdown, or client recovery test was performed; the article correctly recommends these environment-specific tests.
