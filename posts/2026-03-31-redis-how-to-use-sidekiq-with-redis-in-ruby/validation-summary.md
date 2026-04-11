# Validation Summary: How to Use Sidekiq with Redis in Ruby

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ruby
- Redis
- Sidekiq 7.x
- Ruby on Rails
- Devise (for Web UI authentication example)

## Sources Consulted
- Sidekiq Wiki - Advanced Options: https://github.com/sidekiq/sidekiq/wiki/Advanced-Options
- Sidekiq Wiki - Error Handling: https://github.com/sidekiq/sidekiq/wiki/Error-Handling
- Sidekiq example config.yml: https://github.com/sidekiq/sidekiq/blob/main/examples/config.yml
- Sidekiq source - job_retry.rb: https://github.com/sidekiq/sidekiq/blob/main/lib/sidekiq/job_retry.rb
- Sidekiq 7.0 Upgrade Guide: https://github.com/sidekiq/sidekiq/blob/main/docs/7.0-Upgrade.md
- Sidekiq Worker-to-Job rename discussion: https://github.com/sidekiq/sidekiq/discussions/4971

## Issues Found
No technical issues found.

## Review Notes
- The post uses `Sidekiq::Worker` throughout, which still works as a fully supported alias in Sidekiq 7. However, `Sidekiq::Job` is the preferred module name as of Sidekiq 6.3+. The maintainer has stated `Sidekiq::Worker` will remain a supported public API for the foreseeable future, so this is not an error but a style preference.
- The `:max_retries: 5` in `sidekiq.yml` was verified as valid — it is merged into the Sidekiq config object and read by `job_retry.rb` to set the global maximum retry count (overriding the default of 25).
- The default concurrency of 10 threads per Sidekiq process is correct for Sidekiq 7.x (`DEFAULTS` in `config.rb` sets `concurrency: 10`).
- The `sidekiq_retries_exhausted do |job, ex|` callback signature is correct for Sidekiq 7.
- All `Sidekiq::Stats` and `Sidekiq::Queue` API methods used are valid and current.
- The Devise `authenticate` constraint for protecting the Sidekiq Web UI is a standard and correct pattern.
