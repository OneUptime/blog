# Validation Summary: How to Set Up Multi-Cluster Observability with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Jaeger
- OpenTelemetry Protocol
- Grafana Loki
- Grafana Alloy
- Kiali
- Kubernetes / kubectl
- Prometheus / PromQL
- Grafana dashboards

## Sources Consulted
- Istio distributed tracing overview and FAQ: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/ and https://istio.io/latest/about/faq/distributed-tracing/
- Istio OpenTelemetry tracing provider documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio access logging with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kiali multi-cluster documentation: https://kiali.io/docs/configuration/multi-cluster/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Alloy Kubernetes log collection and Loki components: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/ and https://grafana.com/docs/alloy/latest/reference/components/loki.process/
- Kubernetes kubectl generated command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- Istio tracing header propagation was overstated. Updated the text to clarify that sidecars generate spans and forward headers, but applications must propagate trace context from inbound to outbound requests for complete traces.
- Jaeger image tag was outdated. Updated `jaegertracing/all-in-one` from `1.53` to `1.76`.
- Telemetry API examples used `telemetry.istio.io/v1alpha1`. Updated both examples to the current `telemetry.istio.io/v1` API version.
- The Jaeger verification command port-forwarded `svc/jaeger-query`, but the post only creates a Jaeger deployment and collector service. Changed the command to port-forward `deployment/jaeger`.
- The post claimed Jaeger spans automatically include a `cluster` tag. Updated the text to say a cluster tag such as `cluster_id` should be added if filtering by cluster is required.
- The logging example used Promtail, which is deprecated and reached end-of-life on March 2, 2026. Replaced the Promtail example with a Grafana Alloy configuration that collects Kubernetes pod logs, adds a static `cluster` label, and writes to Loki.
- The access logging section claimed Istio access logs automatically include source and destination cluster information. Updated the wording to explain that access logs include Envoy request metadata and cluster identification should be added through the log pipeline or a custom access log format.
- Kiali tracing configuration used the deprecated `external_services.tracing.url` field. Replaced it with `provider`, `use_grpc`, `internal_url`, and `external_url`.
- Kiali multi-cluster configuration included a local cluster entry with an empty secret and created a remote secret with separate `token` and `server` literals. Updated the example to configure the remote cluster only and create a secret containing a kubeconfig, as Kiali expects.

## Review Notes
The examples remain illustrative and assume supporting infrastructure such as Elasticsearch for Jaeger storage, a reachable cross-cluster tracing endpoint, Kiali RBAC, and a deployed Alloy workload. The PromQL examples use Istio's documented `source_cluster` and `destination_cluster` metric labels.
