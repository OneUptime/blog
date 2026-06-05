# Validation Summary: How to Configure OpenTelemetry Rack Middleware for Sinatra Web Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- Sinatra
- Rack middleware
- OpenTelemetry Ruby SDK
- OpenTelemetry Rack instrumentation
- OpenTelemetry OTLP exporter
- OpenTelemetry HTTP semantic conventions

## Sources Consulted
- OpenTelemetry Rack instrumentation RubyDoc: https://www.rubydoc.info/gems/opentelemetry-instrumentation-rack/
- OpenTelemetry Rack instrumentation source: https://github.com/open-telemetry/opentelemetry-ruby-contrib/tree/main/instrumentation/rack
- OpenTelemetry Ruby SDK Configurator RubyDoc: https://www.rubydoc.info/gems/opentelemetry-sdk/OpenTelemetry/SDK/Configurator
- OpenTelemetry Ruby sampling documentation: https://opentelemetry.io/docs/languages/ruby/sampling/
- OpenTelemetry SDK environment variable configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry OTLP exporter RubyDoc: https://www.rubydoc.info/gems/opentelemetry-exporter-otlp/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Sinatra middleware documentation: https://sinatrarb.com/intro.html
- Ruby URI standard library documentation: https://ruby-doc.org/stdlib/stdlibs/uri/URI.html

## Issues Found
- The post hard-coded `OpenTelemetry::Instrumentation::Rack::Middlewares::TracerMiddleware`. Updated examples to configure `OpenTelemetry::Instrumentation::Rack` and register middleware through `OpenTelemetry::Instrumentation::Rack::Instrumentation.instance.middleware_args`, matching the current Rack instrumentation API and semantic-convention-specific middleware selection.
- The middleware options included invalid Rack instrumentation options (`propagation_style`, `retain_middleware_names`) and misleading comments for `record_frontend_span` and `response_propagators`. Replaced them with documented options such as `record_frontend_span`, `untraced_endpoints`, `untraced_requests`, `allowed_request_headers`, `allowed_response_headers`, and `use_rack_events`.
- Several examples attempted to add attributes to `OpenTelemetry::Trace.current_span` after the Rack tracer middleware returned. Updated the custom wrappers so enrichment happens inside the traced downstream app while the Rack span is still current.
- The sensitive-data filtering example would have passed scrubbed query parameters to Sinatra, changing application behavior. Updated it so the tracing middleware sees a filtered Rack env while the Sinatra app receives the original env.
- The snippets using `URI.decode_www_form` / `URI.encode_www_form` and `SecureRandom.uuid` omitted required standard-library requires. Added `require 'uri'` and `require 'securerandom'` where needed.
- The queue-time middleware was shown before the tracer middleware, which would run its response-side span updates after the span had ended. Updated the ordering so queue timing runs inside the active OpenTelemetry span.
- The production sampler example used `c.sampler`, which is not part of the documented `OpenTelemetry::SDK.configure` configurator API. Replaced it with `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`, matching the Ruby sampling documentation.
- Several custom attributes used old or non-standard HTTP attribute names such as `http.user_agent`, `http.client_ip`, `http.response_size`, and `http.queue_time_ms`. Updated them to current semantic convention names where applicable (`user_agent.original`, `client.address`, `http.response.body.size`) or moved app-specific timing attributes outside the reserved `http.*` namespace.
- The production stack combined multiple custom wrappers that each instantiated the Rack tracer, which would create duplicate spans. Updated the final example to use a single tracing wrapper plus downstream queue timing.

## Review Notes
Ruby was not installed in the review environment, so the snippets could not be executed locally. The review was performed against current official documentation and source references. The adaptive sampling example is application-level request filtering, not SDK head sampling; production systems should prefer SDK or Collector sampling where possible for consistent distributed trace decisions.
