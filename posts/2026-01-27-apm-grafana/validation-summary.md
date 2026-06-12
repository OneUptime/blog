# Validation Summary: How to Configure APM in Grafana

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana
- Grafana Tempo
- Prometheus
- Loki
- OpenTelemetry SDKs
- OpenTelemetry Collector
- Python Flask
- Node.js Express
- Java Spring Boot
- TraceQL
- PromQL
- LogQL

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry JavaScript instrumentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry SDK for Node.js: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-sdk-node
- OpenTelemetry Spring Boot starter: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- OpenTelemetry Spring Boot starter getting started: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Collector span metrics connector: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/spanmetricsconnector
- OpenTelemetry Collector service graph connector: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/servicegraphconnector
- Grafana Tempo data source provisioning: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace-based alerts: https://grafana.com/docs/grafana/latest/alerting/examples/trace-based-alerts/
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The Python `requirements.txt` snippet was fenced as Python even though it was package-list text. Changed the fence to `text` so it is not presented as Python source code.
- The Node.js SDK example used `serviceName` in the `NodeSDK` constructor, which is not a documented current option. Replaced it with an OpenTelemetry resource using `resourceFromAttributes` and `ATTR_SERVICE_NAME`.
- The Node.js Express example used `SpanStatusCode` without importing it and created a span without making it active. Added the missing import and switched to `startActiveSpan`.
- The Spring Boot Maven snippet omitted the OpenTelemetry instrumentation BOM required for dependency version alignment. Added the BOM import from the current OpenTelemetry starter documentation.
- The OpenTelemetry Collector configuration used deprecated `servicegraph` and `spanmetrics` processors. Replaced them with the current `service_graph` and `span_metrics` connectors and wired them through trace exporter and metrics receiver pipelines.
- The span metrics PromQL queries used Tempo metrics-generator names while the collector configuration now uses the OpenTelemetry span metrics connector. Updated queries to `traces_span_metrics_calls_total` and `traces_span_metrics_duration_seconds_bucket`.
- The collector span metrics dimensions did not include labels used later in database and external HTTP PromQL queries. Added relevant dimensions for database and HTTP client analysis.
- The Tempo data source provisioning block used older trace-to-logs keys. Updated it to `tracesToLogsV2`, added explicit datasource UIDs, and added trace-to-metrics tag mapping.
- The TraceQL examples used outdated or ambiguous field names. Updated them to current resource, span, and trace field syntax.
- The troubleshooting section referred to the deprecated service graph processor. Updated it to refer to the service graph connector.

## Review Notes
The post now aligns with current OpenTelemetry Collector connector-based span and service graph metric generation. Some semantic convention attributes remain compatibility-oriented because OpenTelemetry instrumentations may emit old or new HTTP attribute names depending on language, package version, and `OTEL_SEMCONV_STABILITY_OPT_IN` settings.
