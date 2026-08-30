# Validation Summary: Beyla Metrics but No Traces? Debugging the OTLP Pipeline

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Grafana Alloy and its `beyla.ebpf` component
- Grafana Beyla and eBPF auto-instrumentation
- OpenTelemetry tracing and sampling
- OTLP over gRPC and HTTP
- Alloy batch processing, OTLP exporters, queues, retries, and debug metrics
- Grafana Tempo ingestion, storage, search, and multitenancy
- Prometheus scraping and RED metrics
- Grafana trace search, service graphs, and span metrics

## Sources Consulted

- Grafana Alloy `beyla.ebpf` component reference: https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/
- Grafana Alloy v1.19.2 `beyla.ebpf` argument schema, including the optional `output` block: https://github.com/grafana/alloy/blob/v1.19.2/internal/component/beyla/ebpf/internal/config/args.go
- Grafana Alloy v1.19.2 Beyla configuration builder, including trace-export behavior without a consumer: https://github.com/grafana/alloy/blob/v1.19.2/internal/component/beyla/ebpf/internal/config/config.go
- Grafana Beyla trace sampling: https://grafana.com/docs/beyla/latest/configure/sample-traces/
- Grafana Beyla global options and trace-printer formats: https://grafana.com/docs/beyla/latest/configure/options/
- Grafana Beyla service discovery, per-service exports, and service-name precedence: https://grafana.com/docs/beyla/latest/configure/service-discovery/
- Grafana Beyla telemetry export: https://grafana.com/docs/beyla/latest/configure/export-data/
- Grafana Alloy batch processor: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.batch/
- Grafana Alloy OTLP/gRPC exporter, queue/retry defaults, and debug metrics: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlp/
- Grafana Alloy OTLP/HTTP exporter: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlphttp/
- Grafana Alloy component configuration and references: https://grafana.com/docs/alloy/latest/get-started/components/configure-components/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry SDK environment-variable specification for sampler defaults: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- Grafana Tempo configuration and distributor receiver binding: https://grafana.com/docs/tempo/latest/configuration/#distributor
- Grafana Tempo distributor architecture and ingestion metrics: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/distributor/
- Grafana Tempo tenant IDs and `X-Scope-OrgID`: https://grafana.com/docs/tempo/latest/configuration/tenant-ids/
- Grafana Tempo authentication guidance: https://grafana.com/docs/tempo/latest/operations/authentication/
- Grafana Tempo trace-ingestion limits and downstream discards: https://grafana.com/docs/tempo/latest/operations/manage-trace-ingestion/
- Grafana Tempo missing-trace troubleshooting, live-store lag, and block-builder checks: https://grafana.com/docs/tempo/latest/troubleshooting/querying/unable-to-see-trace/
- Grafana Tempo metrics-generator: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/
- Grafana service-graph requirements: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/
- Grafana Tempo troubleshooting with Alloy: https://grafana.com/docs/tempo/latest/troubleshooting/send-traces/alloy/
- Official `grafana/alloy:latest` container, which resolved to Alloy v1.19.2, used to load a composed version of the post's Alloy configuration: https://hub.docker.com/r/grafana/alloy

## Issues Found

- The post said that Alloy requires an `output` block for `beyla.ebpf`. Current Alloy v1.19.2 declares the block optional and runs the component without it; traces are simply not exported when no trace consumer is configured. Updated the explanation to cover both an omitted block and `output {}` while retaining the separate Prometheus `targets` path.
- Printed spans without exporter activity were attributed only to a disconnected consumer graph. Beyla can also suppress OTLP trace export through `discovery.instrument.exports`, `traces.instrumentations`, or sampling. Added those controls, changed the categorical diagnosis, and clarified that the component graph shows loaded connections while startup or reload errors reveal unresolved references.
- The sampling advice said to remove explicit samplers for diagnosis. Removing them restores the `parentbased_always_on` default, which still drops spans that have an unsampled parent. Updated the guide and conclusion to use an explicit `always_on` sampler and limited downstream sampling checks to Alloy or OpenTelemetry Collector stages.
- The exporter section described `otelcol_exporter_send_failed_spans_total` as counting failed send attempts. It counts spans in failed attempts, and those spans may later succeed on retry. Corrected the unit and interpretation, limited the retry/queue statement to the two OTLP exporters under discussion, and made queue growth a sustained condition rather than treating any transient queue use as failure.
- The Tempo section grouped authentication, oversized traces or attributes, and a localhost-only receiver as distributor rejection causes. Tempo itself has no authentication layer, oversized attributes are truncated, per-trace and live-trace limits are enforced asynchronously downstream in Tempo 3.x, and a receiver binding problem causes connection failure. Replaced that list with the correct proxy, tenant, rate-limit, reachability, truncation, and downstream-discard behavior.
- The pipeline treated Tempo acceptance and storage/queryability as one boundary. In Tempo 3.x microservices mode, the distributor acknowledges after Kafka accepts the write, while live-stores and block-builders consume asynchronously. Split those boundaries and added downstream limits, consumer health, storage, and lag to the missing-search diagnosis.

## Review Notes

- The corrected Alloy configuration loaded successfully with the official Alloy v1.19.2 container. The container started its embedded Beyla v3.28.0 subprocess and the complete `beyla.ebpf -> batch -> OTLP/gRPC` graph; live eBPF capture was not attempted because the validation container intentionally lacked host kernel capabilities.
- The rendered Alloy component reference currently says the `output` block is required, but the v1.19.2 source schema and runtime both show that it is optional. The correction follows the shipped implementation.
- Standalone Beyla documentation is newer than the Beyla v3.28.0 embedded in current Alloy. The post appropriately advises readers to use settings supported by their deployed component version.
- All seven links in the post's Official Documentation section returned HTTP 200 during validation.
