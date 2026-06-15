# Validation Summary: How to Configure Processors in OpenTelemetry

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- OpenTelemetry Transformation Language (OTTL)
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector Contrib attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Contrib resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector Contrib filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Contrib OTTL span, datapoint, and log context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/contexts
- OpenTelemetry Collector Contrib span processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/spanprocessor/README.md
- OpenTelemetry Collector Contrib probabilistic sampler processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector Contrib groupbyattrs processor package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/groupbyattrsprocessor

## Issues Found
- The batch processor example described `send_batch_size` as a maximum batch size. Updated the comment to say it is the item count that triggers sending a batch; `send_batch_max_size` is the hard upper limit.
- The attributes processor `extract` example used `from_attribute`, but `extract` uses the configured `key` as the source attribute and creates attributes from named regex capture groups. Updated the example to use `http.url` as the source key.
- The filter processor examples used deprecated nested configuration such as `traces.span`, `metrics.metric`, and `logs.log_record`. Updated them to the current `trace_conditions`, `metric_conditions`, and `log_conditions` format.
- Several filter OTTL expressions used unprefixed or invalid paths such as `attributes`, `duration`, `name`, and `value`. Updated them to current prefixed paths such as `span.attributes`, `metric.name`, `datapoint.value_int`, and `log.attributes`; duration checks now use `span.end_time - span.start_time` with `Duration(...)`.
- The transform processor examples used older grouped syntax and unprefixed paths such as `name`, `attributes`, and `duration`. Updated them to current basic `trace_statements` syntax with prefixed paths and documented OTTL functions such as `Milliseconds(...)`, `Duration(...)`, `Concat(...)`, and `truncate_all(...)`.
- The span processor status example used `code: error`; official examples document `Error`, `Ok`, and `Unset`. Updated the value to `Error`.
- The complete pipeline example repeated the legacy filter and transform syntax. Updated it to match the corrected current examples.

## Review Notes
The corrected examples were checked against official OpenTelemetry Collector and Collector Contrib documentation. A local `otelcol` or `otelcol-contrib` binary was not available in the workspace, so no runtime collector configuration validation was performed.
