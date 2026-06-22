# Validation Summary: How to Configure OpenTelemetry Processors

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- OpenTelemetry Transformation Language (OTTL)
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- Memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- Attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- Resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- Filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- Transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL span context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- Span processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/spanprocessor/README.md
- Probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- Tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- The memory limiter explanation incorrectly described accepting data with a warning above the soft limit. Updated the explanation and diagram to reflect that the processor refuses data and returns errors above the soft limit, with possible data loss if receivers cannot retry.
- The filter processor examples used the older `traces.span`, `metrics.metric`, and `logs.log_record` configuration shape. Updated them to the current documented `trace_conditions`, `metric_conditions`, and `log_conditions` OTTL configuration.
- The filter examples used outdated or invalid OTTL paths such as `attributes`, `duration`, `name`, `severity_number`, and `body` without signal prefixes. Updated them to current paths such as `span.attributes`, computed span duration from `span.end_time_unix_nano - span.start_time_unix_nano`, `metric.name`, `log.severity_number`, and `log.body`.
- The attributes processor conditional example placed `include` inside an action. Moved `include` to the processor level, which matches the attributes processor configuration model.
- The transform examples used invalid current OTTL paths and a raw status-code integer. Updated the examples to use current paths, `STATUS_CODE_ERROR`, computed span duration from start/end timestamps, and prefixed log and datapoint paths.
- The span processor example used duplicate `name` keys under one processor instance. Split it into `span/rename` and `span/extract` so the YAML is valid and both examples can coexist.
- The probabilistic sampler description implied whole-trace sampling. Updated the wording to clarify that the probabilistic sampler samples spans based on trace ID and that tail sampling is used for whole-trace decisions.
- Environment variable references used shell-style forms such as `${ONEUPTIME_TOKEN}` and `${ENVIRONMENT:-development}`. Updated them to the Collector environment provider syntax `${env:NAME}`.

## Review Notes
- The complete configuration example was extracted from the post and validated with `otelcol-contrib` v0.154.0 using `ENVIRONMENT=development` and `ONEUPTIME_TOKEN=test`.
