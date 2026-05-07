# Validation Summary: How to Use Podman with Istio Service Mesh

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Envoy Proxy
- Istio concepts and the Bookinfo sample application
- Compose / `podman compose`
- OpenSSL
- Prometheus
- Grafana
- Jaeger

## Sources Consulted
- Podman `podman compose` documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman `podman pod create` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Docker Compose services reference, including `network_mode: service:{name}`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose top-level `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Istio Bookinfo documentation: https://istio.io/latest/docs/examples/bookinfo/
- Istio Virtual Machine Architecture: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Istio Virtual Machine Installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Official Istio Bookinfo manifest: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/bookinfo/platform/kube/bookinfo.yaml
- Official Istio Bookinfo `productpage` source: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/bookinfo/src/productpage/productpage.py
- Envoy HTTP filters overview, including route-level filter config: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_filters.html
- Envoy fault injection filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter
- Envoy TLS transport socket API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto.html
- Envoy TLS quick start and certificate validation guidance: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/securing.html
- Envoy HTTP connection manager tracing reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy tracing API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/http_tracer.proto.html
- Envoy OpenTelemetry tracer reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy Zipkin tracer reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/zipkin.proto
- Envoy local rate limit filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Jaeger getting started guide: https://www.jaegertracing.io/docs/latest/getting-started/

## Issues Found
- The post originally implied that Istio control-plane components such as `istiod` could directly manage manually launched Podman sidecars. I corrected the framing so the post now accurately describes applying Istio patterns with manually managed Envoy sidecars rather than running a full Istio control plane directly on Podman.
- The initial Podman sidecar example would not work because both the application and Envoy shared the same pod network namespace while both were effectively positioned on port `9080`. I changed the proxy-facing porting model to expose Envoy on `8080` inside the pod and mapped host `9080` to that proxy port.
- The `productpage` example was not configured to send outbound calls through Envoy, so the `15001` outbound listener would never be used. I added the official Bookinfo `DETAILS_*` and `REVIEWS_*` environment variables so outbound requests are sent to `127.0.0.1:15001`.
- The Envoy upstream hostnames and ports in `productpage.yaml` did not match the Compose service topology. I updated them to target `reviews-proxy` and `details-proxy` on port `8080`, which aligns with the proxy-based routing model shown in the post.
- The Compose example used floating `latest` Bookinfo image tags, which were not the official sample references used by current Istio docs. I replaced them with the pinned sample image tags from the official Bookinfo manifest and removed the obsolete top-level Compose `version` key.
- The mTLS section only showed upstream TLS origination and did not include the downstream listener configuration required for actual mutual TLS. I expanded the snippet to include `DownstreamTlsContext` with client-certificate enforcement.
- The fault-injection example omitted a required condition: Envoy's HTTP fault filter must be present in the filter chain before the router filter. I added that requirement in the text immediately above the route-level example.
- The tracing section placed tracing configuration at the wrong level and used Envoy's OpenTelemetry tracer even though Envoy documents that extension as work-in-progress. I replaced it with a correctly placed Zipkin tracer example sending spans to Jaeger on port `9411`, and I updated the Jaeger image and published ports accordingly.
- The section titled "Rate Limiting Across Services" used Envoy's local rate limit filter, which enforces limits per proxy instance rather than mesh-wide. I renamed the section and description to reflect that it is local per-proxy rate limiting.
- The health-checking example used port values that no longer matched the corrected proxy topology and a path that was not tied to the shown Bookinfo service flow. I updated it to check `reviews-proxy:8080` with `/reviews/0`.
- The management script assumed raw container names when querying published admin ports. Because Compose providers commonly prefix container names with the project name, I changed the lookup to use `podman compose ... port` against stable Compose service names.

## Review Notes
- The post is now technically valid as a guide for running Envoy sidecars with Podman using Istio-inspired service-mesh patterns. It is not a guide for running a full Istio control plane directly on Podman.
- Istio's current Bookinfo docs are versioned as Istio 1.29.2, but the official sample manifest they publish still references `docker.io/istio/examples-bookinfo-*:1.20.3`. The post now follows the official sample manifest instead of using floating `latest` tags.
- Several YAML snippets are still partial configuration excerpts rather than a complete repo-ready bundle. They are technically correct in context, but a working setup still depends on the corresponding `reviews.yaml`, `details.yaml`, and `ratings.yaml` files being implemented consistently with the corrected proxy port model.
