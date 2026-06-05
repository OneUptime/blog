# Validation Summary: How to Instrument Rails ActionController Requests with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Ruby SDK
- OpenTelemetry Ruby Rails instrumentation
- OpenTelemetry ActionPack, Rack, and ActionView instrumentation
- Ruby on Rails ActionController
- RSpec request specs
- HTTP tracing semantic conventions

## Sources Consulted
- OpenTelemetry Ruby getting started documentation: https://opentelemetry.io/docs/languages/ruby/getting-started/
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry Rails instrumentation README: https://rubydoc.info/gems/opentelemetry-instrumentation-rails
- OpenTelemetry Rails instrumentation changelog: https://rubydoc.info/gems/opentelemetry-instrumentation-rails/0.42.0/file/CHANGELOG.md
- OpenTelemetry ActionPack instrumentation README: https://www.rubydoc.info/gems/opentelemetry-instrumentation-action_pack
- OpenTelemetry ActionPack instrumentation changelog: https://rubydoc.info/gems/opentelemetry-instrumentation-action_pack/0.12.3/file/CHANGELOG.md
- OpenTelemetry Rack instrumentation README: https://www.rubydoc.info/gems/opentelemetry-instrumentation-rack/
- OpenTelemetry Rack TracerMiddleware API documentation: https://rubydoc.info/gems/opentelemetry-instrumentation-rack/0.28.0/OpenTelemetry/Instrumentation/Rack/Middlewares/Stable/TracerMiddleware
- OpenTelemetry ActionView instrumentation README: https://rubydoc.info/gems/opentelemetry-instrumentation-action_view
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry exception semantic conventions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/

## Issues Found
- The post described automatic middleware and controller child spans for each request stage. Current OpenTelemetry Ruby Rack instrumentation creates the HTTP server span, while ActionPack enriches that span and ActionView/manual instrumentation can create child spans. Updated the explanation and diagram.
- The Gemfile and configuration installed and configured `opentelemetry-instrumentation-action_pack` separately even though the Rails instrumentation package includes Rails component instrumentation. Updated the examples to use `opentelemetry-instrumentation-rails` with `c.use_all`, matching current official guidance.
- The route-recognition examples used `enable_recognize_route`, which was removed from current ActionPack/Rails instrumentation. Updated the section to explain that Rails 7.1+ route patterns are populated automatically by current ActionPack instrumentation.
- The comprehensive configuration used unsupported options: `enable_middleware`, `excluded_paths`, and ActionPack configuration for route recognition. Replaced them with the current Rack `untraced_endpoints` option and ActionView configuration.
- The example span attributes used older HTTP semantic convention names such as `http.method`, `http.status_code`, `http.host`, and `http.user_agent`, plus non-emitted Rails attributes such as `rails.controller` and `rails.action`. Updated them to current stable HTTP names and current ActionPack attributes such as `code.namespace` and `code.function`.
- The response-size snippet set `http.status_code`; updated it to `http.response.status_code`.
- The request spec searched for `rails.controller` and `rails.action`; updated the expectations to use `code.namespace`, `code.function`, `http.request.method`, and `http.response.status_code`.

## Review Notes
The manual span examples use current OpenTelemetry Ruby APIs such as `OpenTelemetry.tracer_provider.tracer`, `tracer.in_span`, `span.set_attribute`, `span.add_event`, `span.record_exception`, and `OpenTelemetry::Trace::Status.error`. Several snippets still rely on application-specific helpers such as `current_user`, `current_organization`, `date_range`, `render_pdf`, and domain models; these are acceptable illustrative placeholders rather than complete standalone examples.
