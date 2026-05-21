# Validation Summary: How to Set Up Jaeger Sampling Strategies for Istio

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Istio
- Envoy
- Jaeger
- Kubernetes
- Distributed tracing
- B3 trace propagation
- Prometheus / PromQL

## Sources Consulted
- Istio documentation: Configure tracing using MeshConfig and pod annotations: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Istio documentation: Distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio documentation: Distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio MeshConfig / ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy documentation: Tracing: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html
- Jaeger 1.76 documentation: Sampling: https://www.jaegertracing.io/docs/1.76/architecture/sampling/
- Jaeger 1.76 documentation: Deployment: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger latest documentation: Sampling: https://www.jaegertracing.io/docs/2.18/architecture/sampling/

## Issues Found
- The post said Jaeger collector sampling can apply additional sampling strategies beyond Istio's client-side sampling. This was misleading for Istio sidecar-generated spans. Jaeger's `--sampling.strategies-file` serves remote sampling strategies to clients/SDKs configured for Jaeger remote sampling; it does not resample spans already emitted by Istio sidecars. Updated the section to explain this distinction.
- The post implied `x-b3-traceid` alone carries a sampling decision. Updated the explanation to refer to sampling-decision headers such as `x-b3-sampled`.
- The post said sampled requests would have all spans captured without mentioning application header propagation. Updated the text to state that applications must propagate trace headers to downstream calls.
- The per-workload annotation explanation did not mention Istio's replacement semantics for the `tracing` field. Updated the note to say provider-specific global tracing settings should be copied into the annotation when needed.
- The Jaeger collector image tag was old (`1.53`). Updated it to `1.76.0`, matching the current Jaeger 1.x documentation used for the `--sampling.strategies-file` example.
- The adaptive sampling JSON example was not a valid adaptive sampling configuration. Replaced it with a Jaeger 1.x Kubernetes-style environment/args snippet using `SAMPLING_CONFIG_TYPE=adaptive`, `SAMPLING_STORAGE_TYPE`, `--sampling.initial-sampling-probability`, and `--sampling.target-samples-per-second`, and noted that Jaeger 2.x uses the `remote_sampling` extension.
- The Python example referenced undefined `generate_trace_id()` and `generate_span_id()` helper functions. Updated it to use `secrets.token_hex()` to generate valid B3 trace and span IDs.

## Review Notes
Istio's current documentation encourages users to transition tracing configuration to the Telemetry API, but the MeshConfig and `proxy.istio.io/config` examples in this post remain documented and valid. Jaeger 2.x changes deployment and configuration style, so the Jaeger collector examples are best read as Jaeger 1.x examples.
