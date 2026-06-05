# Validation Summary: How to Configure the Debug Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Debug exporter
- OpenTelemetry Collector OTLP receiver
- OpenTelemetry Collector processors: batch, attributes, filter, probabilistic sampler
- OTTL filter expressions
- OpenTelemetry Python tracing API
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector troubleshooting guide: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector configuration guide: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector OTTL span context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html

## Issues Found
- The post described `normal` verbosity as the default. The Debug exporter documentation lists `basic` as the default, so the default label was moved to Basic Verbosity.
- Several example trace IDs and span IDs contained non-hex characters. They were replaced with valid hex-formatted IDs.
- The "Output Formats" section described sampling controls as serialization controls. It was renamed and reworded as output volume control.
- Debug exporter sampling was described as a startup-only initial burst. The current exporter documents `sampling_initial` as initially logged messages each second, with `sampling_thereafter` logging every Nth message after that. The affected comments and explanations were corrected.
- The processor filter example used older `spans.exclude.match_type.span_names` syntax. It was updated to current OTTL `trace_conditions`.
- The filter examples were logically inverted. The filter processor drops matching telemetry, so examples intended to print only errors, one service, slow spans, or debug-enabled spans were changed to drop the inverse condition.
- The filter examples used deprecated `traces.span` configuration. They were updated to non-deprecated `trace_conditions`.
- The high-latency filter used an unsupported `duration_millis` field. It was replaced with an OTTL duration expression using `span.end_time - span.start_time`.
- The production debug filter referenced `attributes["debug.enabled"]`; the current span context path is `span.attributes["debug.enabled"]`.
- Environment variable substitution examples used `${DEBUG_VERBOSITY:-basic}` and `${DEBUG_SAMPLING:-1}`. They were updated to the documented Collector provider syntax `${env:DEBUG_VERBOSITY:-basic}` and `${env:DEBUG_SAMPLING:-1}`.
- The post overstated that the Debug exporter writes directly to stdout and that it always blocks on output. The wording was adjusted to reflect the default internal logger behavior and configurable output paths.

## Review Notes
- The Debug exporter output format is explicitly documented as unstable, so exact sample output may change between Collector releases.
- A local `otelcol` or `otelcol-contrib` binary was not available in the workspace, so configuration examples were reviewed against official documentation rather than validated with `otelcol validate`.
