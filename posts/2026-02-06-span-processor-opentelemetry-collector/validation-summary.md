# Validation Summary: How to Configure the Span Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Span Processor
- OpenTelemetry Collector Attributes Processor
- OpenTelemetry Collector Transform Processor
- OpenTelemetry Transformation Language (OTTL)
- YAML Collector configuration
- Kubernetes ConfigMap, Deployment, Service, and probes

## Sources Consulted
- OpenTelemetry Collector processor overview: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Contrib Span Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/spanprocessor/README.md
- OpenTelemetry Collector Contrib Span Processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/spanprocessor/config.go
- OpenTelemetry Collector Contrib Attributes Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Contrib Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib Filter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OTTL span context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/contexts/ottlspan
- OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry semantic conventions for HTTP spans: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The post described the Span Processor as supporting arbitrary attribute modification, span kind changes, parent-child restructuring, templates, fallback attributes, action lists, inline `if` expressions, and debug mode. Updated the text to reflect the supported span processor features: name construction from attributes, regex extraction into attributes, status setting, and include/exclude matching.
- The basic configuration used unsupported conditional status syntax. Removed the invalid `if` condition and kept the example focused on supported `name.from_attributes` behavior.
- The name transformation examples used invalid `to_attributes` rule objects and unsupported `replace` syntax. Replaced them with supported named-regex `to_attributes.rules` strings and moved prefix replacement to a Transform Processor example.
- The status examples treated `status` as a list with inline conditions. Replaced them with separate span processor instances scoped by `include` matching and valid status code values.
- The span kind examples used unsupported `kind` configuration. Replaced them with a Transform Processor example using OTTL and valid span kind constants.
- The advanced, service-specific, production, Kubernetes, business-context, performance, and troubleshooting snippets used unsupported span processor fields such as `attributes.actions`, `template`, `fallback_attributes`, `default_name`, and top-level `if`. Reworked those snippets to use Span Processor only for span name/status operations, Attributes Processor for attribute actions, and Transform Processor for OTTL-based conditional logic.
- The production and validation examples used the deprecated `logging` exporter. Updated them to the current `debug` exporter.
- The Kubernetes example referenced the old `otel/opentelemetry-collector-contrib:0.93.0` image and configured a health probe without exposing or enabling the health check extension in the embedded Collector config. Updated the image to `0.153.0`, added the health extension, and exposed the health port.
- The performance example used short span kind names in strict include matching. Updated `SERVER` to `SPAN_KIND_SERVER`, which validates with the Collector.

## Review Notes
Validated all YAML fences with PyYAML. Used `otel/opentelemetry-collector-contrib:0.153.0 validate` to validate representative corrected Collector configurations for span name extraction, span status setting, include matching, attributes actions, transform OTTL statements, filter OTTL conditions, debug exporter configuration, and the production-style processor chain. The post now intentionally distinguishes Span Processor functionality from adjacent Attributes and Transform Processor functionality because the original draft attributed too much behavior to the Span Processor itself.
