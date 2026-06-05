# Validation Summary: How to Configure OpenTelemetry in a Rails Initializer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- Ruby on Rails initializers
- OpenTelemetry Ruby SDK
- OpenTelemetry Ruby instrumentation gems
- OTLP exporter
- OpenTelemetry sampling, propagation, resources, and span processors
- RSpec

## Sources Consulted
- OpenTelemetry Ruby instrumentation libraries documentation: https://opentelemetry.io/docs/languages/ruby/libraries/
- OpenTelemetry Ruby sampling documentation: https://opentelemetry.io/docs/languages/ruby/sampling/
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Rails configuration and initializer documentation: https://guides.rubyonrails.org/configuring.html
- OpenTelemetry Ruby SDK source: https://github.com/open-telemetry/opentelemetry-ruby
- OpenTelemetry Ruby instrumentation source: https://github.com/open-telemetry/opentelemetry-ruby-contrib

## Issues Found
- `c.use_all('OpenTelemetry::Instrumentation')` was incorrect for the current Ruby SDK. Changed examples to call `c.use_all`, matching the documented configurator API.
- The environment-specific example used `c.sampler =`, but the Ruby SDK configurator does not expose that setter. Changed sampling configuration to use `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`, as recommended by official Ruby sampling docs.
- The resource example referenced `c.service_name`, which is a setter-only configurator API. Changed the example to store the service name in a local variable and reuse it in resource attributes.
- The selective instrumentation example used unsupported Rails and ActiveRecord options (`enable_recognize_route`, `enable_middleware`, `enable_sql_obfuscation`, and ActiveRecord `db_statement`). Replaced them with current ActionPack `span_naming`, ActiveRecord installation without unsupported options, and Redis `db_statement`.
- The batch span processor example used non-Ruby keyword names (`schedule_delay_millis`, `export_timeout_millis`). Replaced them with current Ruby SDK names: `schedule_delay` and `exporter_timeout`.
- The custom sampler example was technically incorrect because Ruby `OpenTelemetry::SDK.configure` does not support `c.sampler =`, and head samplers cannot reliably decide based on final HTTP status codes. Replaced the section with environment-variable sampler configuration and noted that retaining all error traces requires tail sampling.
- The propagation example claimed Jaeger and Zipkin support while only configuring W3C Trace Context and Baggage. Updated the comment to match the code.
- The failure-handling example used an outer `rescue` around `OpenTelemetry::SDK.configure`, but the SDK routes configuration/export errors through `OpenTelemetry.handle_error`. Replaced it with a configured `c.error_handler`.
- The resource attributes example used `Socket.gethostname` without requiring `socket`. Added `require 'socket'` to that snippet.
- The RSpec example used `InMemorySpanExporter.new(spans)`, but the current exporter initializer accepts keyword arguments, not a span array. Updated the example to instantiate the exporter correctly, attach a span processor, create a test span, flush, and assert the exported span name.

## Review Notes
- The Rails initializer flow diagram is a simplified mental model, not a precise Rails boot trace. The load-order guidance is directionally correct: Rails loads files under `config/initializers` in sorted order as part of initialization.
- The OpenTelemetry Ruby Rails instrumentation currently requires modern Rails component versions in the contrib source; projects on older Rails versions should verify compatibility for their exact gem versions.
