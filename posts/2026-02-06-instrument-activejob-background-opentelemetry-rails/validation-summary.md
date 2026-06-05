# Validation Summary: How to Instrument ActiveJob Background Processes with OpenTelemetry in Rails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Ruby SDK
- OpenTelemetry OTLP exporter for Ruby
- OpenTelemetry ActiveJob instrumentation
- Ruby on Rails
- ActiveJob background jobs
- Distributed tracing and sampling

## Sources Consulted
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry Ruby exporters documentation: https://opentelemetry.io/ro/docs/languages/ruby/exporters/
- OpenTelemetry Ruby sampling documentation: https://opentelemetry.io/docs/languages/ruby/sampling/
- OpenTelemetry ActiveJob instrumentation README/API documentation: https://rubydoc.info/gems/opentelemetry-instrumentation-active_job/0.10.1
- OpenTelemetry Ruby SDK Configurator API documentation: https://www.rubydoc.info/gems/opentelemetry-sdk/OpenTelemetry/SDK/Configurator
- OpenTelemetry Ruby SpanKind API documentation: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-api/v1.4.0/OpenTelemetry/Trace/SpanKind.html
- OpenTelemetry Ruby Status API documentation: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-api/v1.4.0/OpenTelemetry/Trace/Status.html
- Rails ActiveJob retry_on API documentation: https://api.rubyonrails.org/classes/ActiveJob/Exceptions/ClassMethods.html

## Issues Found
1. The Gemfile example used `require 'opentelemetry/instrumentation/all'` and `c.use_all` without including `opentelemetry-instrumentation-all`. Added that gem so the setup matches the OpenTelemetry Ruby documentation.
2. The OTLP exporter require path was outdated for the current OpenTelemetry Ruby docs. Changed `require 'opentelemetry/exporter/otlp'` to `require 'opentelemetry-exporter-otlp'`.
3. The ActiveJob instrumentation comment implied job arguments were captured by `span_naming` and `propagation_style`. Removed the inaccurate comment because the documented ActiveJob attributes do not include job arguments.
4. The documented span attribute list included incorrect or unsupported details, including treating `messaging.system` as the queue adapter and listing `messaging.operation` and `code.function`. Replaced the list with attributes documented by the ActiveJob instrumentation.
5. The post described `propagation_style: :link` as same-trace child-job propagation. Updated the explanation to say `:link` creates separate traces linked to the enqueuing span, and that `:child` is required for same-trace job execution spans.
6. The Rails retry example used `wait: :exponentially_longer`, which has been superseded in current Rails documentation by `wait: :polynomially_longer`. Updated the example.
7. The adapter-specific configuration example used unsupported ActiveJob instrumentation options such as `peer_service`. Replaced it with the documented `force_flush` option for forking job systems such as Resque.
8. The sampling example used `c.sampler`, which is not part of the current documented `OpenTelemetry::SDK::Configurator` API. Replaced it with the official environment-variable sampler configuration.
9. The text claimed the example added custom metrics, but the code only added span attributes and events. Reworded it to accurately describe span attributes, events, and error tracking.

## Review Notes
Ruby is not installed in this workspace, so local `ruby -c` syntax checks could not be run. The Ruby examples were reviewed statically against the official OpenTelemetry Ruby and Rails APIs.
