# Validation Summary: How to Use opentelemetry-sdk and opentelemetry-exporter-otlp Gems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- OpenTelemetry Ruby SDK
- opentelemetry-sdk gem
- opentelemetry-exporter-otlp gem
- opentelemetry-exporter-otlp-grpc gem
- OTLP HTTP/protobuf and gRPC exporters

## Sources Consulted
- OpenTelemetry Ruby exporters documentation: https://opentelemetry.io/docs/languages/ruby/exporters/
- OpenTelemetry Ruby sampling documentation: https://opentelemetry.io/docs/languages/ruby/sampling/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Ruby source, OTLP HTTP exporter: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/exporter/otlp/lib/opentelemetry/exporter/otlp/exporter.rb
- OpenTelemetry Ruby source, OTLP gRPC trace exporter: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/exporter/otlp-grpc/lib/opentelemetry/exporter/otlp/grpc/trace_exporter.rb
- OpenTelemetry Ruby source, BatchSpanProcessor: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/trace/export/batch_span_processor.rb
- OpenTelemetry Ruby source, SpanProcessor and Span lifecycle: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/trace/span_processor.rb and https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/trace/span.rb
- OpenTelemetry Ruby source, samplers: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/trace/samplers.rb
- OpenTelemetry Ruby source, Configurator: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/configurator.rb

## Issues Found
- The post claimed the `opentelemetry-exporter-otlp` gem supports both HTTP and gRPC and that the endpoint format selects the transport. The Ruby HTTP OTLP exporter and gRPC OTLP exporter are separate gems/classes, so the transport wording and gRPC example were corrected.
- The gRPC code used `OpenTelemetry::Exporter::OTLP::Exporter.new`, a `grpc://` endpoint, and an `insecure:` option. The current gRPC trace exporter is `OpenTelemetry::Exporter::OTLP::GRPC::TraceExporter`, and its constructor does not accept `insecure:`, so the example was updated.
- The custom span processor example attempted to enrich and filter spans from `on_finish`. In the Ruby SDK, `on_finish` is called after the span has been ended, while `on_finishing` is the hook for mutation before immutability. The example was updated to enrich in `on_finishing` and no longer claims that returning from a separate custom processor drops spans before the batch exporter.
- The sampling examples used a non-existent `c.sampler=` configurator API and returned bare sampler decisions from a custom sampler. Ruby custom samplers must return `OpenTelemetry::SDK::Trace::Samplers::Result`, and code-based sampling requires a manually configured `TracerProvider` or environment variables, so the snippets were corrected.
- The resource and processor examples used `Socket`, and the payment example used `SecureRandom`, without requiring the Ruby standard-library files. Added `require 'socket'` and `require 'securerandom'` where needed.

## Review Notes
The post now matches the current OpenTelemetry Ruby APIs checked against upstream source. I could not execute the Ruby snippets locally because this workspace does not have `ruby` or `gem` installed.
