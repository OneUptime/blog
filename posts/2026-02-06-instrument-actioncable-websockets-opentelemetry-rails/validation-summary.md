# Validation Summary: How to Instrument ActionCable WebSockets with OpenTelemetry in Rails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ruby
- Ruby on Rails
- Action Cable
- WebSockets
- OpenTelemetry Ruby SDK
- OpenTelemetry Ruby instrumentation gems
- OpenTelemetry metrics
- Redis

## Sources Consulted
- Rails Action Cable Connection documentation: https://api.rubyonrails.org/v8.1/classes/ActionCable/Connection/Base.html
- Rails Action Cable connection identification documentation: https://api.rubyonrails.org/v5.0.7.1/classes/ActionCable/Connection/Identification.html
- Rails Action Cable channel callback documentation: https://railsdoc.github.io/8.0/classes/ActionCable/Channel/Callbacks.html
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/libraries/
- OpenTelemetry Ruby SDK Configurator API documentation: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-sdk/v1.8.1/OpenTelemetry/SDK/Configurator.html
- OpenTelemetry Ruby Rails instrumentation README: https://github.com/open-telemetry/opentelemetry-ruby-contrib/tree/main/instrumentation/rails
- RubyGems opentelemetry-instrumentation-all package metadata: https://rubygems.org/gems/opentelemetry-instrumentation-all/versions/0.94.0
- RubyGems opentelemetry-instrumentation-rails package metadata: https://rubygems.org/gems/opentelemetry-instrumentation-rails/versions/0.42.0
- RubyGems opentelemetry-metrics-sdk package metadata: https://rubygems.org/gems/opentelemetry-metrics-sdk
- RubyGems opentelemetry-exporter-otlp-metrics package metadata: https://rubygems.org/gems/opentelemetry-exporter-otlp-metrics/versions/0.6.0
- OpenTelemetry Ruby SpanContext API documentation: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-api/v1.6.0/OpenTelemetry/Trace/SpanContext.html

## Issues Found
- The post listed `opentelemetry-instrumentation-action_cable` and configured `OpenTelemetry::Instrumentation::ActionCable`, but the current official OpenTelemetry Ruby packages do not provide a dedicated Action Cable instrumentation gem. I removed that gem and configuration, added `opentelemetry-instrumentation-all`, and clarified that Rails and Redis are auto-instrumented while Action Cable spans are manual.
- The setup used `require 'opentelemetry/instrumentation/all'` without including the matching `opentelemetry-instrumentation-all` gem. I added the gem to make the require and `use_all` example correct.
- The custom metrics example used `OpenTelemetry.meter_provider` but the Gemfile did not include the Ruby metrics SDK or OTLP metrics exporter. I added `opentelemetry-metrics-sdk`, `opentelemetry-exporter-otlp-metrics`, the required imports, and a metric reader setup.
- The connection examples called `connection.connection_identifier`, but `connection_identifier` is an instance method on the Action Cable connection. I changed the examples to call `connection_identifier` directly.
- The reconnection example declared `identified_by :session_id` but only assigned `@session_id`. Since `identified_by` creates an accessor and the examples read `session_id`, I changed the assignment to `self.session_id = SecureRandom.uuid` and updated later uses to `session_id`.
- The trace context helper manually unpacked binary IDs. I changed it to use the official `hex_trace_id` and `hex_span_id` helpers and to check `current_span.context.valid?`.

## Review Notes
The remaining application code is illustrative and depends on application-specific models such as `User`, `ChatRoom`, `ConnectionSession`, and `Notification`. Those models and scopes are not provided in the post, but the Rails and OpenTelemetry APIs used around them are technically sound after the corrections above.
