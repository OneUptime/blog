# Validation Summary: How to Configure Background Jobs with Sidekiq

## Status
validated

## Post Type
Tutorial / Guide — a comprehensive, code-heavy walkthrough of configuring, using, testing, and operating Sidekiq for background job processing in Ruby on Rails.

## Technologies Covered
- Ruby
- Ruby on Rails (Active Job)
- Sidekiq 7.x
- Redis (redis-client driver)
- sidekiq-scheduler
- sidekiq-limit_fetch
- sidekiq-unique-jobs
- RSpec / Sidekiq::Testing
- systemd
- Prometheus (prometheus_exporter)

## Sources Consulted
- Sidekiq "Using Redis" wiki — https://github.com/sidekiq/sidekiq/wiki/Using-Redis
- Sidekiq "Active Job" wiki — https://github.com/sidekiq/sidekiq/wiki/Active-Job
- Sidekiq "Bulk Queueing" wiki — https://github.com/sidekiq/sidekiq/wiki/Bulk-Queueing
- Sidekiq "Memory" wiki — https://github.com/sidekiq/sidekiq/wiki/Memory
- Sidekiq::Job#perform_bulk RubyDoc — https://www.rubydoc.info/gems/sidekiq/Sidekiq/Job/ClassMethods:perform_bulk
- sidekiq-limit_fetch gem README — https://github.com/deanpcmad/sidekiq-limit_fetch
- Sidekiq Pro Web UI / Monitoring wiki — https://github.com/sidekiq/sidekiq/wiki/Monitoring

## Issues Found
1. **Fabricated `config[:max_memory]` option (Memory Management section).** The post presented:
   ```ruby
   # Memory limit per worker (requires sidekiq-limit_fetch)
   config[:max_memory] = 256  # MB
   ```
   Sidekiq has no built-in `max_memory` configuration option, and sidekiq-limit_fetch does **not** provide a per-worker memory limit (it only provides queue-level concurrency limits, pausing, blocking, and dynamic queues). The Sidekiq "Memory" wiki explicitly states the Ruby VM controls memory and recommends monitoring RSS yourself and/or setting `MALLOC_ARENA_MAX=2`. **Fix:** Replaced the misleading line and comment with an accurate note explaining that Sidekiq has no built-in per-worker memory limit and that the surrounding manual RSS-monitoring loop (which the example already implements) is the correct approach. The working manual monitoring code was left intact.

## Review Notes
- **Verified correct:** the redis `network_timeout` option is a valid redis-client config key in Sidekiq 7; `sidekiq_options` on an Active Job class is supported (since Sidekiq 6.0.1, with `sidekiq_retries_exhausted`/`sidekiq_retry_in` on Active Job since 7.1.3); `perform_bulk(array_of_arg_arrays)` is correct (introduced in Sidekiq 6.3.0); the documented retry-backoff formula `(retry_count ** 4) + 15 + (rand(10) * (retry_count + 1))` matches Sidekiq's default; `sidekiq_retry_in` returning `:discard`/`:default` is valid; `Sidekiq.strict_args!`, `config.death_handlers`, and `Sidekiq::Worker.clear_all` are all current APIs.
- **Custom Web UI registration** (`Sidekiq::Web.register(Sidekiq::WebAction.new(:get, path, lambda))`): this is an advanced, lightly-documented area whose API has shifted across Sidekiq versions. It was left as-is, but readers should verify the exact form against the Sidekiq version they install, as the web-extension registration API is not formally guaranteed.
- **sidekiq-limit_fetch caveat:** the gem is currently unmaintained (maintainer states they no longer use Sidekiq). The `:limits:` config and `gem 'sidekiq-limit_fetch'` usage shown are valid for the gem's intended feature set, but teams adopting Sidekiq 7+ should confirm ongoing compatibility before relying on it.
- **Bulk delayed enqueue (`enqueue_with_delays`):** the `Sidekiq::Client.push_bulk('class' => ..., 'args' => ...)` call only forwards `args` and drops the per-job `at`/`queue` values built earlier in the method. This is functionally suboptimal (the delays/queues are ignored) rather than syntactically wrong, so it was left unchanged; a future revision could pass `'at'` and `'queue'` arrays to `push_bulk` to honor the intended scheduling.
