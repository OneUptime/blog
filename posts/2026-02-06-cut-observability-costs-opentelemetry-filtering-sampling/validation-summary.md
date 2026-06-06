# Validation Summary: How to Cut Observability Costs by 40% with OpenTelemetry Filtering and Sampling

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector probabilistic sampler processor
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector routing connector
- OpenTelemetry Python SDK tracing and sampling
- OpenTelemetry semantic conventions for HTTP spans and metrics

## Sources Consulted
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector probabilistic sampler processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Python SDK sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/

## Issues Found
- The Collector filter processor examples used the legacy `traces.span`, `metrics.datapoint`, and `logs.log_record` configuration style. Updated them to the current documented `trace_conditions`, `metric_conditions`, and `log_conditions` format with explicit OTTL context prefixes.
- Several OTTL expressions used a `matches` operator. Updated them to the documented `IsMatch()` converter function.
- Several span/log/metric paths omitted current OTTL context prefixes, such as `attributes[...]`, `body`, and `severity_number`. Updated them to `span.attributes[...]`, `log.body`, `log.severity_number`, `resource.attributes[...]`, or `datapoint.attributes[...]` as appropriate.
- HTTP span attributes used older semantic convention names such as `http.status_code` and `http.user_agent`. Updated examples to `http.response.status_code` and `user_agent.original`.
- The Python SDK example imported `ParentBasedTraceIdRatioBased`, which is not the current documented Python sampler class. Reworked the example to use `ParentBased`, `Sampler`, `TraceIdRatioBased`, `ALWAYS_ON`, and `ALWAYS_OFF`, and added the required `get_description()` implementation for the custom sampler.
- The text claimed head sampling happens before spans are created. Clarified that the decision happens before spans are recorded and exported.
- The tail sampling example treated `UNSET` status as an error. Removed `UNSET` from the always-keep-errors policy because unset status is normal for many successful spans.
- The multi-pipeline example defined a routing processor but did not use it, causing all pipelines to receive the same OTLP input independently. Updated the snippet to use the current routing connector pattern and route to downstream trace pipelines.
- The critical trace pipeline was labeled as unsampled but could still drop traces. Added an `always_sample` policy to make the configuration match the label.
- The monitoring section used the deprecated spanmetrics processor pattern and older dropped-item metric names. Replaced it with current Collector internal telemetry metrics for receiver accepted items, processor incoming/outgoing items, and exporter sent items.
- The best-practice guidance said to never sample error logs, while the log sampling example sampled all remaining logs. Clarified that error logs should be routed around probabilistic sampling when they must be retained.

## Review Notes
The YAML snippets parse as YAML and the Python code parses successfully. The snippets are still illustrative partial Collector configurations in several sections; users may need to add omitted receivers, exporters, and shared processors when adapting individual snippets into a complete Collector config.
