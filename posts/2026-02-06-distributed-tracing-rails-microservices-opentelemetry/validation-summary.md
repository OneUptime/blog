# Validation Summary: How to Set Up Distributed Tracing Across Rails Microservices with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Ruby SDK
- OpenTelemetry Ruby OTLP exporter
- OpenTelemetry Ruby instrumentation libraries
- Ruby on Rails
- Net::HTTP
- Faraday
- Active Record
- Redis
- Sidekiq
- W3C Trace Context
- OTLP over HTTP/gRPC

## Sources Consulted
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry Ruby instrumentation libraries documentation: https://opentelemetry.io/docs/languages/ruby/libraries/
- OpenTelemetry Ruby exporters documentation: https://opentelemetry.io/docs/languages/ruby/exporters/
- OpenTelemetry Ruby SDK source, Configurator API: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/configurator.rb
- OpenTelemetry Ruby SDK source, BatchSpanProcessor options: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/trace/export/batch_span_processor.rb
- OpenTelemetry Ruby SDK source, sampler environment variables: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/trace/tracer_provider.rb
- OpenTelemetry Ruby OTLP exporter source: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/exporter/otlp/lib/opentelemetry/exporter/otlp/exporter.rb
- OpenTelemetry Ruby contrib Rails instrumentation source: https://github.com/open-telemetry/opentelemetry-ruby-contrib/blob/main/instrumentation/rails/lib/opentelemetry/instrumentation/rails/instrumentation.rb
- OpenTelemetry Ruby contrib ActiveRecord instrumentation source: https://github.com/open-telemetry/opentelemetry-ruby-contrib/blob/main/instrumentation/active_record/lib/opentelemetry/instrumentation/active_record/instrumentation.rb
- OpenTelemetry Ruby contrib Sidekiq instrumentation source: https://github.com/open-telemetry/opentelemetry-ruby-contrib/blob/main/instrumentation/sidekiq/lib/opentelemetry/instrumentation/sidekiq/instrumentation.rb
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/

## Issues Found
- The Gemfile snippet used `require 'opentelemetry/instrumentation/all'` in the initializer but did not include the `opentelemetry-instrumentation-all` metapackage. Added the metapackage to match the official `c.use_all` setup.
- The initializer passed `enable_recognize_route` and `enable_sql_obfuscation` options to Rails and ActiveRecord instrumentation. Current Ruby contrib source does not expose those options for the Rails and ActiveRecord instrumentation classes, so the sample now uses `c.use_all` with default instrumentation configuration.
- The custom span example defined `order` inside the `validate_order` span block and then used it later in the `process_payment` span block. Moved `order = Order.find(params[:id])` before the first span so the example works.
- The sampling snippet used `c.sampler = ...`, but the current OpenTelemetry Ruby SDK configurator does not provide a sampler setter. Replaced it with the supported `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1` environment-variable configuration.
- The service-to-service example said errors are automatically recorded in spans in a branch that handles a non-2xx HTTP response. Revised the comment to say the HTTP client span records response metadata such as status code.

## Review Notes
- The OTLP exporter endpoint examples are valid for the explicit exporter construction shown in the post. The Ruby OTLP exporter also supports using a base `OTEL_EXPORTER_OTLP_ENDPOINT` such as `http://collector:4318` when the endpoint is read by the exporter itself.
- Sidekiq instrumentation defaults to linking the job trace to the enqueueing trace. If teams want the job span in the same trace as the enqueueing request, they should configure Sidekiq `propagation_style: :child`.
