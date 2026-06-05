# Validation Summary: How to Export OpenTelemetry Data to Sumo Logic Using the Sumo Logic Exporter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Sumo Logic exporter
- OpenTelemetry Collector OTLP/HTTP exporter
- Sumo Logic HTTP Sources and OTLP/HTTP Sources
- Sumo Logic processor
- OpenTelemetry Go SDK

## Sources Consulted
- Sumo Logic HTTP Sources for Logs, Metrics, Traces, OTLP: https://www.sumologic.com/help/docs/send-data/hosted-collectors/http-source/
- Sumo Logic OTLP/HTTP Source documentation: https://www.sumologic.com/help/docs/send-data/hosted-collectors/http-source/otlp/
- OpenTelemetry Collector Contrib Sumo Logic exporter package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/sumologicexporter
- OpenTelemetry Collector Contrib Sumo Logic processor package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/sumologicprocessor
- Sumo Logic Go OpenTelemetry instrumentation documentation: https://www.sumologic.com/help/docs/apm/traces/get-started-transaction-tracing/opentelemetry-instrumentation/go/
- OpenTelemetry Go OTLP trace HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go semantic conventions documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0

## Issues Found
- The post described the Sumo Logic exporter as exporting traces, metrics, and logs. Current OpenTelemetry Collector Contrib documentation states that the Sumo Logic exporter sends logs and metrics, while traces are exported using the native OTLP/HTTP exporter. Updated the introduction, source setup steps, and Collector configuration accordingly.
- The Collector exporter configuration used `endpoint` as a Sumo deployment base URL, included an unsupported `traces_endpoint` field, and used `compress_encoding` instead of the documented `compression` field. Updated the config to use a Sumo HTTP Logs & Metrics Source URL for the `sumologic` exporter and an `otlphttp/sumo_traces` exporter for traces.
- The Sumo Logic processor mapping said `host.name` becomes `Host`. Official processor documentation maps `host.name` to `host`, and notes that attribute translation is not performed for traces. Updated the mapping and explanation.
- The direct Go SDK example pointed at a collection host instead of a Sumo OTLP/HTTP Source URL, used a custom header for source category routing, imported `os` without using it, used an older semantic convention helper, and referenced an undefined `doWork` function. Updated the example to build a trace endpoint from `SUMO_OTLP_HTTP_SOURCE_URL`, use `WithEndpointURL`, use `semconv/v1.37.0` with `DeploymentEnvironmentName`, and include a minimal `doWork` implementation.
- The multiple-environment resource examples used `${service.name}` inside a resource processor value, which the Collector treats as environment-variable substitution rather than telemetry attribute interpolation. Replaced those examples with explicit static source category values.

## Review Notes
The post is now technically accurate for the current documented Sumo Logic exporter behavior. For production deployments, readers may also want to evaluate whether to use a single OTLP/HTTP Source for all signals through OTLP exporters instead of mixing the Sumo Logic exporter for logs/metrics with OTLP/HTTP for traces.
