# Validation Summary: How to Scale the OpenTelemetry Collector for High-Throughput Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib components
- OTLP receiver and exporter
- Collector processors: memory limiter, batch, resource detection, attributes, probabilistic sampler, tail sampling, filter
- Collector extensions: file storage and health check
- Collector internal telemetry metrics
- Kubernetes Deployment, Service, and HorizontalPodAutoscaler
- NGINX gRPC and HTTP load balancing
- telemetrygen benchmarking tool
- Prometheus and Prometheus remote write

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector exporter helper queue documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector file storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- Kubernetes HorizontalPodAutoscaler v2 API documentation: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes HPA concepts documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- NGINX gRPC load balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/grpc-health-check/
- Live validation with `otel/opentelemetry-collector-contrib:latest validate`
- Live telemetrygen flag check with `ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest traces --help`

## Issues Found
- Replaced `service.telemetry.metrics.address` with the current `readers.pull.exporter.prometheus` configuration. The `address` field is invalid in the current Collector config schema and is documented as ignored/removed for Collector v0.123.0 and newer.
- Added `create_directory: true` to `file_storage` examples that use `/var/lib/otel-collector/storage`, because the file storage extension requires the directory to already exist unless directory creation is enabled.
- Changed the multi-replica Kubernetes Deployment storage example from one shared PVC to `emptyDir`, with a note to use a StatefulSet with per-pod PVCs for persistent queues. A single shared PVC is not a safe generic pattern for per-pod persistent queues.
- Fixed the NGINX gRPC example by moving `grpc_pass` and related directives into a `location /` block, matching NGINX directive usage for gRPC proxying.
- Changed the custom HPA incoming-span metric from the raw cumulative counter `otelcol_receiver_accepted_spans` to a per-second custom metric name, because HPA should scale on a rate/gauge exposed by the custom metrics adapter rather than directly on a cumulative counter.
- Added `tls.insecure: true` to the agent-to-gateway OTLP exporter example for the plain internal `:4317` endpoint.
- Quoted the load-balancing exporter's DNS resolver `port` value as `"4317"`, matching the current Collector config schema.
- Corrected the telemetrygen benchmark loop so `--rate` is divided by `--workers`. telemetrygen's `--rate` flag is per worker, so the original script generated far more spans than the displayed total.
- Softened the CPU-per-core throughput claim because Collector throughput varies substantially by processors, exporters, payload size, and backend behavior.

## Review Notes
Several throughput and memory sizing numbers remain useful as starting points, but they should be treated as workload-dependent planning guidance rather than universal capacity guarantees. The validated Collector snippets were checked against the current `otel/opentelemetry-collector-contrib:latest` image available on 2026-06-05.
