# Validation Summary: How to Monitor IPv6 Traffic in Service Meshes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio (service mesh, EnvoyFilter, Telemetry API, istioctl)
- Envoy (sidecar proxy, Prometheus stats endpoint on port 15090)
- Linkerd (linkerd viz CLI: stat, edges, top, tap, httproutes)
- Prometheus (PromQL queries, AlertManager rules)
- Grafana (dashboard JSON panels)
- Jaeger (distributed tracing for Istio)
- Kiali (service graph visualization)
- node_exporter (sockstat metrics for IPv4/IPv6 connections)
- Kubernetes (kubectl exec, kubectl debug node, HTTPRoute)
- IPv6 networking (ULA prefix fd00::/8, SLAAC, dual-stack)

## Sources Consulted
- Istio metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio application requirements (port 15090): https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Telemetry API customization: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio 1.20 release addons: https://github.com/istio/istio/tree/release-1.20/samples/addons (URLs verified HTTP 200)
- Istio EnvoyFilter API reference (networking.istio.io/v1alpha3)
- Linkerd viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Linkerd proxy metrics: https://linkerd.io/2/reference/proxy-metrics/
- Prometheus node_exporter sockstat collector source
- Envoy attributes reference (source.address, etc.)

## Issues Found

1. **EnvoyFilter section did not actually add source IP labels.** The original example used `apiVersion: networking.istio.io/v1alpha3` with a `HttpConnectionManager` MERGE patch that only set `generate_request_id: true`. That field controls UUID generation for the `x-request-id` header — it has no effect on Prometheus metric labels, so the example contradicted the section heading and intro text. **Fix:** replaced the EnvoyFilter with the correct Istio Telemetry API (`telemetry.istio.io/v1`) using `tagOverrides` with the CEL expression `string(source.address)` on `REQUEST_COUNT`, matching the canonical pattern documented in Istio's "Customizing Istio Metrics" task. Added a brief note that custom tags must be allow-listed in `extraStatTags` and that raw IPs are high cardinality.

2. **Linkerd tap `--from-ip` flag does not exist.** The post used `linkerd viz tap deploy/my-app --from-ip "fd00::5"`. `linkerd viz tap` does not accept an IP-based filter; documented flags are `--from` (resource), `--to`, `--namespace`, `--authority`, `--method`, `--path`, `--scheme`, `--max-rps`, `--output`, `--selector`, `--to-namespace`. **Fix:** changed the example to `linkerd viz tap deploy/my-app --from deploy/client-app` (resource-based filter) and updated the surrounding comment.

## Review Notes

- All other Istio metric names (`istio_requests_total`, `istio_request_duration_milliseconds_bucket`, `istio_tcp_connections_opened_total`) are valid Istio standard metrics.
- Envoy sidecar Prometheus port 15090 with `/stats/prometheus` path is correct.
- All four Istio 1.20 addon URLs (prometheus, grafana, kiali, jaeger) return HTTP 200.
- `EnvoyFilter` apiVersion `networking.istio.io/v1alpha3` is still the canonical version per the official reference (though `v1` is now an alias for many networking CRDs in Istio 1.22+).
- node_exporter metrics `node_sockstat_TCP_inuse` and `node_sockstat_TCP6_inuse` are correct.
- Linkerd `response_total` and `response_latency_ms_bucket` remain current proxy metrics in Linkerd 2.14/edge — not deprecated.
- `linkerd viz stat httproutes` is supported (HTTPRoute resource type).
- `kubectl debug node/<node> -it --image=nicolaka/netshoot -- chroot /host …` syntax is valid. Caveat: recent kubectl/Kubernetes versions may require `--profile=sysadmin` for `chroot` to succeed depending on the node's security context — worth mentioning if a reader hits permission errors, but not strictly an error in the post.
- Future improvement: the Grafana panel uses `node_sockstat_*` metrics as a node-level proxy for IP version split; if the reader wants a true mesh-level split they'd have to combine the new `source_ip` tag from the Telemetry API example with regex matchers in PromQL.
