# Validation Summary: How to Add Custom OpenTelemetry Spans to Sidekiq Background Jobs in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Ruby SDK
- opentelemetry-instrumentation-sidekiq
- Ruby on Rails Active Job
- Sidekiq
- Redis-backed background job processing
- RSpec span assertions

## Sources Consulted
- OpenTelemetry Ruby instrumentation guide: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry Ruby Sidekiq instrumentation API docs: https://www.rubydoc.info/gems/opentelemetry-instrumentation-sidekiq/OpenTelemetry/Instrumentation/Sidekiq/Instrumentation
- OpenTelemetry Ruby Sidekiq client middleware source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-ruby-contrib/main/instrumentation/sidekiq/lib/opentelemetry/instrumentation/sidekiq/middlewares/client/tracer_middleware.rb
- OpenTelemetry Ruby Sidekiq server middleware source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-ruby-contrib/main/instrumentation/sidekiq/lib/opentelemetry/instrumentation/sidekiq/middlewares/server/tracer_middleware.rb
- Sidekiq job format documentation: https://github.com/sidekiq/sidekiq/wiki/Job-Format
- Sidekiq advanced options documentation: https://github.com/sidekiq/sidekiq/wiki/Advanced-Options
- Sidekiq error handling documentation: https://github.com/sidekiq/sidekiq/wiki/Error-Handling
- Rails Active Job guide: https://guides.rubyonrails.org/active_job_basics.html
- Rails ActiveJob::Callbacks API docs: https://api.rubyonrails.org/classes/ActiveJob/Callbacks/ClassMethods.html
- Rails ActiveJob::Core API docs: https://www.rubydoc.info/docs/rails/ActiveJob/Core
- redis-rb changelog: https://raw.githubusercontent.com/redis/redis-rb/master/CHANGELOG.md

## Issues Found
- Corrected trace propagation details. The Sidekiq instrumentation injects context into the Sidekiq job payload, not job arguments, and its default `propagation_style` is `:link`, not same-trace parent/child propagation. The configuration now explicitly uses `propagation_style: :child` where the article describes one connected trace.
- Corrected auto-instrumentation attribute examples. Removed unsupported `sidekiq.job.*` and `sidekiq.worker.name` attributes and added the documented messaging attributes used by the Sidekiq middleware.
- Replaced `perform_async` calls on `ApplicationJob` subclasses with `perform_later`, which is the Rails Active Job enqueue API.
- Fixed the report fan-out example so it passes serializable transaction IDs instead of an ActiveRecord relation or dataset object to child jobs.
- Added Sidekiq server middleware for retry metadata. The original `Thread.current[:sidekiq_context]` helper read data that Sidekiq does not set by itself.
- Fixed queue wait-time tracking. The original example prepended a hash to `job.arguments`, which would change job method signatures. It now uses Active Job's built-in `enqueued_at`.
- Replaced `Redis.current` with `Rails.cache.write` because `Redis.current` was deprecated and removed in redis-rb 5.
- Fixed test examples to call `perform_now` and removed the expectation for an auto-generated Sidekiq job span, since direct job execution in a unit test does not run Sidekiq server middleware.

## Review Notes
The examples remain application-level snippets and still assume app-specific models and services exist. Full end-to-end verification of Sidekiq middleware spans should be covered separately with an integration test that actually runs through the Sidekiq adapter/server middleware path.
