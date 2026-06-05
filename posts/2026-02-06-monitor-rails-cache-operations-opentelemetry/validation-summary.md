# Validation Summary: How to Monitor Ruby on Rails Cache Operations with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- Ruby on Rails
- Rails caching and fragment caching
- ActiveSupport notifications
- OpenTelemetry Ruby SDK
- OpenTelemetry Ruby Rails, ActiveSupport, and Redis instrumentation
- Redis
- Memcached

## Sources Consulted
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry Ruby getting started documentation: https://opentelemetry.io/docs/languages/ruby/getting-started/
- OpenTelemetry Ruby Rails instrumentation README: https://github.com/open-telemetry/opentelemetry-ruby-contrib/tree/main/instrumentation/rails
- OpenTelemetry Ruby ActiveSupport instrumentation README and source: https://github.com/open-telemetry/opentelemetry-ruby-contrib/tree/main/instrumentation/active_support
- Rails Active Support Instrumentation guide: https://guides.rubyonrails.org/active_support_instrumentation.html
- Rails Caching with Rails guide: https://guides.rubyonrails.org/caching_with_rails.html
- Rails ActiveSupport::Cache::Store API: https://api.rubyonrails.org/classes/ActiveSupport/Cache/Store.html
- Rails ActiveSupport::Cache::RedisCacheStore API: https://api.rubyonrails.org/classes/ActiveSupport/Cache/RedisCacheStore.html
- OpenTelemetry metrics concepts and language support: https://opentelemetry.io/docs/concepts/signals/metrics/

## Issues Found
- The setup used `require 'opentelemetry/instrumentation/all'` and `c.use_all` without listing the `opentelemetry-instrumentation-all` gem. Added the gem so the setup matches the official OpenTelemetry Ruby documentation.
- The ActiveSupport instrumentation configuration included `enable_cache_instrumentation: true`, which is not a documented OpenTelemetry Ruby ActiveSupport option. Replaced it with explicit `OpenTelemetry::Instrumentation::ActiveSupport.subscribe` calls for Rails cache and fragment cache notifications.
- The post claimed Rails cache operations were automatically instrumented with semantic attributes such as `cache.operation`, `cache.key`, `cache.hit`, and `cache.backend`. Updated this to describe the actual Rails notification spans and payload attributes (`key`, `store`, `hit`, and `super_operation`).
- The post claimed SQL query caching was included as a Rails cache operation. Clarified that SQL query cache information is surfaced through Active Record SQL instrumentation with a `cached: true` payload.
- The fragment cache example comment implied OpenTelemetry automatically instruments the view cache block. Updated it to say the cache block emits Rails fragment cache notifications.
- The metrics wrapper implied metrics would be recorded without mentioning metrics SDK/exporter configuration. Clarified that an OpenTelemetry metrics SDK and exporter must be configured.
- The cache wrapper usage comment suggested assigning directly to `Rails.cache` / cache store with an incomplete wrapper. Changed it to instantiate the wrapper explicitly.
- The stampede protection example raised `CacheStampedeTimeout` without defining it. Added a simple custom exception class.

## Review Notes
- The current OpenTelemetry Ruby Rails and ActiveSupport instrumentation releases target supported Rails versions; current upstream source sets a Rails/ActiveSupport minimum of 7.1 for the latest instrumentation. Applications on older Rails versions should pin compatible OpenTelemetry instrumentation gem versions.
- I could not run Ruby syntax checks locally because Ruby and Bundler are not installed in this workspace.
