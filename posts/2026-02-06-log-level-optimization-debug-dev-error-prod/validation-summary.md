# Validation Summary: How to Use Log Level Optimization with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Logs SDK
- OpenTelemetry Go SDK
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- Collector filter processor
- Collector transform processor
- Kubernetes ConfigMaps and Deployments
- Prometheus/PromQL

## Sources Consulted
- OpenTelemetry Go SDK log package: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/log
- OpenTelemetry Go minsev processor: https://pkg.go.dev/go.opentelemetry.io/contrib/processors/minsev
- OpenTelemetry Go OTLP log gRPC exporter: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc
- OpenTelemetry Python logging instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Logs SDK specification: https://opentelemetry.io/docs/specs/otel/logs/sdk/
- OpenTelemetry Logs Data Model severity mapping: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector extensions list: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The Go example used non-existent APIs, `sdklog.NewFilterProcessor` and `sdklog.WithMinSeverity`. Replaced them with the official `go.opentelemetry.io/contrib/processors/minsev` processor wrapped around `sdklog.NewBatchProcessor`.
- The Go example referenced an undefined `newOTLPExporter()` helper. Replaced it with the official OTLP logs gRPC exporter constructor, `otlploggrpc.New(ctx)`, and returned an error from `newLogProvider`.
- The Python example configured a `LoggerProvider` but did not attach a `LoggingHandler` or set the provider globally, so Python logging records would not be exported through OpenTelemetry. Added `set_logger_provider`, `LoggingHandler`, and `logging.basicConfig(handlers=[handler], level=min_level)`.
- The Collector filter example used deprecated `logs.log_record` configuration and unprefixed `severity_number` paths. Updated it to the current `log_conditions` syntax with `log.severity_number`.
- The production Collector filter only dropped severities below INFO while the post described production as WARN-and-above. Updated the condition to drop below `SEVERITY_NUMBER_WARN`.
- The staging Collector comment claimed it dropped DEBUG and INFO while the intended behavior was INFO-and-above. Corrected the comment and used `SEVERITY_NUMBER_INFO`.
- The transform processor example used unprefixed log paths and a raw numeric severity. Updated it to `log.severity_number`, `log.body`, and `SEVERITY_NUMBER_DEBUG`, with an `IsString(log.body)` guard before regex matching.
- The Kubernetes example set `DEPLOYMENT_ENVIRONMENT` but not the OpenTelemetry resource attribute required by the Collector filter. Added `deployment.environment=production` to `OTEL_RESOURCE_ATTRIBUTES`.
- The text said environment variables could be updated without restarting. Adjusted the wording because environment variables from a ConfigMap do not update a running container without a restart or reload mechanism.
- The PromQL example used the wrong Collector metric name, `otel_exporter_sent_log_records_total`. Updated it to the current internal telemetry metric name, `otelcol_exporter_sent_log_records_total`, and changed the grouping to `exporter`.

## Review Notes
The severity number table matches the OpenTelemetry Logs Data Model. The `remotetap` extension exists in the Collector contrib distribution, but it is listed with development stability, so production use should be evaluated carefully.
