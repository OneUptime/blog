# Validation Summary: How to Migrate from Splunk APM to OpenTelemetry Without Losing Data

## Status
validated

## Post Type
Migration guide / technical tutorial

## Technologies Covered
- Splunk APM
- Splunk Distributions of OpenTelemetry
- OpenTelemetry Java agent
- OpenTelemetry Node.js SDK
- OpenTelemetry Collector Contrib
- OTLP and OTLP/HTTP exporters
- Host metrics receiver

## Sources Consulted
- Splunk Docs: About the Splunk Distribution of OpenTelemetry Java - https://help.splunk.com/en/splunk-observability-cloud/manage-data/instrument-back-end-services/instrument-back-end-applications-to-send-spans-to-splunk-apm/instrument-a-java-application/about-splunk-otel-java
- Splunk Docs: OTLP/HTTP exporter - https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-components/exporters/otlphttp-exporter
- Splunk Docs: Send traces to Splunk Observability Cloud using the gRPC endpoint - https://help.splunk.com/en/splunk-observability-cloud/manage-data/other-data-ingestion-methods/other-data-ingestion-methods/send-traces-to-splunk-observability-cloud-using-the-grpc-endpoint
- Splunk Docs: Set up deployment environments in Splunk APM - https://help.splunk.com/en/splunk-observability-cloud/monitor-application-performance/set-up-splunk-apm/set-up-deployment-environments-in-splunk-apm
- OpenTelemetry JavaScript docs: Instrumentation - https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript GitHub README - https://github.com/open-telemetry/opentelemetry-js
- OpenTelemetry Collector Contrib hostmetrics receiver README - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry OTLP exporter specification - https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- npm package metadata for `@splunk/otel` and current OpenTelemetry JavaScript packages

## Issues Found
- The post described Splunk tracing libraries as forks and the Java agent as a superset with identical auto-instrumentation coverage. Splunk documents the Java distribution as a wrapper around upstream OpenTelemetry instrumentation with additional Splunk features, so the wording was changed to "distributions" and "largely overlaps."
- The examples used `deployment.environment`, which is deprecated in current OpenTelemetry semantic conventions. Updated examples to `deployment.environment.name`, which Splunk APM also recommends while continuing to support the older tag.
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`, but current OpenTelemetry JavaScript packages expose `resourceFromAttributes()` for this pattern. Updated the import and resource construction.
- The Collector replacement section claimed identical behavior when replacing the Splunk Collector with standard components. This was narrowed to common OTLP and host metrics pipelines because Splunk-specific receivers and features are not fully equivalent to `hostmetrics`.
- The dual-export Collector example configured the gRPC `otlp` exporter with an OTLP/HTTP trace URL and claimed traces and metrics while only defining a traces pipeline. Updated the Splunk exporter to `otlphttp/splunk` with `traces_endpoint`, `metrics_endpoint`, and the documented `X-SF-Token` header, then added a metrics pipeline.
- The log-correlation note implied that the OpenTelemetry log SDK itself injects trace context into arbitrary logs. Updated it to say to configure OpenTelemetry log instrumentation or the logging framework to include trace ID and span ID.

## Review Notes
The JavaScript snippet was smoke-tested against the current npm packages by installing the listed dependencies in a temporary directory and verifying the imports and SDK construction. The Collector snippets were reviewed against official Collector and Splunk exporter documentation, but no Collector binary validation was run in this repository.
