# Validation Summary: How to Debug Collector Receiver Connection Drops

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP receivers
- OpenTelemetry Collector internal telemetry and Prometheus metrics
- Kubernetes Services, Deployments, and debugging commands
- Istio sidecar annotations and DestinationRule connection pools
- Go OpenTelemetry OTLP trace exporter
- gRPC keepalive
- bpftrace, tcpdump, and tshark

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector HTTP configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry logging exporter deprecation announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Go OTLP trace gRPC exporter API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- gRPC keepalive guide: https://grpc.io/docs/guides/keepalive/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes sysctl documentation: https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- Kubernetes labels and annotations reference for AWS load balancer annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Amazon EKS Network Load Balancer service annotation documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- bpftrace documentation: https://bpftrace.org/docs/

## Issues Found
- The Collector internal metrics example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current Prometheus `readers` configuration and set Prometheus naming options so the metric names used later in the post match the scrape output.
- The examples used the deprecated/removed `logging` exporter. Replaced it with the current `debug` exporter and added top-level `debug` exporter definitions where pipelines referenced it.
- The first Collector configuration referenced `batch` and `otlp` components without defining them. Added minimal `processors.batch` and `exporters.otlp` definitions.
- The receiver metrics section described `otelcol_receiver_accepted_spans` and `otelcol_receiver_refused_spans` as connection counts. Corrected the wording to spans/telemetry, and replaced nonexistent connection/error metrics with documented queue and send-failure metrics.
- The backpressure example used the obsolete `queued_retry` processor. Replaced it with exporter-level `sending_queue` and `retry_on_failure`, which is the current Collector pattern.
- The memory limiter comments did not match the configured soft limit. Adjusted `spike_limit_mib` and comments so the hard and soft limits align.
- The Kubernetes deployment comments implied that `GOMEMLIMIT` sets container ulimits. Reworded the comments to accurately describe Go heap limiting and resource-limit capability behavior.
- The examples pinned old `otel/opentelemetry-collector-contrib:0.93.0` images. Updated them to `0.153.0`, the current release line verified during review.
- The Istio example used `networking.istio.io/v1beta1` and mislabeled `maxRequestsPerConnection` and `maxRetries`. Updated the API version to `v1` and corrected the comments.
- The Istio annotations used separate duplicate inbound/outbound exclusion entries in a way that could be misleading for inbound metrics scraping. Consolidated the inbound health and metrics exclusions into one valid annotation.
- The AWS load balancer Service snippet used AWS load balancer annotations on a `ClusterIP` Service and described IP mode without setting the correct annotation. Changed the Service to `LoadBalancer` and added the current NLB pod IP target annotation.
- The Go snippets used `context.Context` without importing `context`. Added the missing imports.
- The bpftrace example referenced invalid kprobe arguments for `tcp_connect` and a questionable TCP reset tracepoint. Replaced it with a `sock:inet_sock_set_state` tracepoint example that traces TCP state changes for destination port 4317.
- The OTLP HTTP connectivity test could imply that a GET to `/v1/traces` is a valid telemetry request. Added a note that a 405/4xx response is expected and the command is only checking reachability.

## Review Notes
- The post is technically valid after the fixes. It still uses example infrastructure names and placeholder backend endpoints, which is appropriate for a troubleshooting guide.
- OpenTelemetry Collector internal telemetry configuration is still evolving, so future reviews should re-check `service.telemetry.metrics.readers` syntax and internal metric names against the current Collector documentation.
