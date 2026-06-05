# Validation Summary: How to Configure Instrumentation Exclusion Rules via Declarative Configuration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry declarative configuration
- OpenTelemetry SDK sampling
- OpenTelemetry Java agent declarative configuration
- OpenTelemetry Collector filter processor
- OpenTelemetry metric views
- YAML configuration

## Sources Consulted
- OpenTelemetry SDK Declarative Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry Configuration Schema Docs: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry Java Agent Declarative Configuration: https://opentelemetry.io/docs/zero-code/java/agent/declarative-configuration/
- OpenTelemetry Java Agent Configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Collector Filter Processor: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector Processors List: https://opentelemetry.io/docs/collector/components/processor/

## Issues Found
- The post used `file_format: "0.3"` and older/deprecated-looking declarative examples. Updated examples to `file_format: "1.0"`, which is the current stable declarative configuration format in the official docs.
- The resource examples used map-style `resource.attributes`. Updated them to the current schema's required list of `{name, value}` objects.
- The post claimed a top-level `instrumentation.general.http.server.exclude_urls` declarative option. That field is not in the current OpenTelemetry declarative schema, so the examples were replaced with the documented experimental `composite/development` rule-based sampler using `attribute_values` and `attribute_patterns`.
- The Java agent example used unsupported fields such as `instrumentation.java.http.server.exclude_urls`, `disabled_instrumentations`, and `excluded_classes`. Updated it to the documented Java agent declarative mappings under `instrumentation/development` and `distribution.javaagent`.
- The Collector filter processor example used the older `traces.span` and `metrics.datapoint` form. Updated it to the current documented `trace_conditions` and `metric_conditions` form with explicit OTTL context prefixes.
- OTLP exporter examples used `otlp` with `protocol: "grpc"`, which does not match the current declarative schema. Updated these to `otlp_grpc`.
- Metric view `attribute_keys` was shown as a plain list. Updated it to the current include/exclude structure with `included`.
- The propagator example used inline strings. Updated it to the current list-of-propagator-object form.

## Review Notes
The composite sampler is marked experimental with `/development` in the OpenTelemetry schema and currently has Java support, while some other language SDKs may not implement it. Route-based exclusion depends on HTTP instrumentation setting route/path attributes early enough for sampling rules to match.
