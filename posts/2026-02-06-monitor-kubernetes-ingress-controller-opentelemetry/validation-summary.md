# Validation Summary: How to Monitor Kubernetes Ingress Controller Performance with OpenTelemetry

## Status
validated

## Post Type
Technical tutorial / monitoring guide

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx / NGINX Ingress Controller
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Prometheus metrics and PromQL
- Kubernetes container logs and OpenTelemetry filelog receiver
- Traefik
- HAProxy Ingress

## Sources Consulted
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- ingress-nginx OpenTelemetry documentation: https://kubernetes.github.io/ingress-nginx/user-guide/third-party-addons/opentelemetry/
- ingress-nginx ConfigMap reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx log format documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/log-format/
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- Traefik OpenTelemetry metrics documentation: https://doc.traefik.io/traefik/v3.3/observability/metrics/opentelemetry/
- Traefik OpenTelemetry tracing documentation: https://doc.traefik.io/traefik/v3.4/observability/tracing/opentelemetry/
- HAProxy Kubernetes Ingress Controller metrics documentation: https://www.haproxy.com/documentation/kubernetes-ingress/administration/metrics/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The post said ingress-nginx exposes Prometheus metrics by default. The official ingress-nginx docs require enabling metrics, so the text now says metrics are exposed on port 10254 when metrics are enabled.
- The Prometheus receiver relabeling used `__meta_kubernetes_pod_annotation_prometheus_io_port` as the source for `__address__`, which would produce an invalid address such as `10254:10254`. The snippet now uses `__meta_kubernetes_pod_ip` and appends `:10254`.
- The metric `nginx_ingress_controller_upstream_latency_seconds` is not listed in the current ingress-nginx metric docs. It was replaced with `nginx_ingress_controller_response_duration_seconds`.
- The OpenTelemetry ConfigMap example pointed `opentelemetry-config` at `/etc/nginx/opentelemetry.toml`, while ingress-nginx documents the default path as `/etc/ingress-controller/telemetry/opentelemetry.toml`. The snippet now uses the documented path.
- The log parsing comment said the severity parser converts numeric fields from strings. It actually maps status codes to severity, so the comment was corrected.
- The connection saturation PromQL divided active connections by `nginx_ingress_controller_nginx_process_connections_total`, which is a total accepted/handled connection counter, not a maximum connection limit. The panel was changed to show active and waiting connection gauges.
- The HAProxy tracing note claimed newer releases support OpenTelemetry natively. Official HAProxy Kubernetes Ingress Controller docs clearly document Prometheus metrics, but native tracing support is version/controller-specific, so the text now directs readers to their controller/version docs and treats Prometheus metrics as the portable baseline.

## Review Notes
- The article focuses on the community ingress-nginx controller. F5 NGINX Ingress Controller uses different metric ports and OpenTelemetry ConfigMap keys, so future revisions should keep the product distinction explicit.
- ingress-nginx was in best-effort maintenance through March 2026 per the project documentation. Readers planning new deployments should check the current project status and migration options.
