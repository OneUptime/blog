# Validation Summary: How to Set Up a Ruby on Rails Development Environment with Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails
- Docker and Docker Compose
- Portainer
- PostgreSQL
- Redis
- Sidekiq
- Action Cable
- MailCatcher
- RSpec and Factory Bot

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose file reference, `version` and service dependencies: https://docs.docker.com/reference/compose-file/version-and-name/ and https://docs.docker.com/reference/compose-file/services/#depends_on
- Docker Compose CLI reference: https://docs.docker.com/compose/reference/ and https://docs.docker.com/reference/cli/docker/compose/restart/
- Rails configuration guide: https://guides.rubyonrails.org/configuring.html
- Rails Action Cable overview: https://guides.rubyonrails.org/action_cable_overview.html
- Rails Active Job basics: https://guides.rubyonrails.org/active_job_basics.html
- Sidekiq Getting Started, Redis, and advanced configuration docs: https://github.com/sidekiq/sidekiq/wiki/Getting-Started, https://github.com/sidekiq/sidekiq/wiki/Using-Redis, and https://github.com/sidekiq/sidekiq/wiki/Advanced-Options
- RSpec Rails documentation: https://rspec.info/features/7-0/rspec-rails/
- Factory Bot Rails README: https://github.com/thoughtbot/factory_bot_rails
- MailCatcher documentation: https://mailcatcher.me/
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/18/app-pg-isready.html
- Redis CLI and PING command documentation: https://redis.io/docs/latest/develop/tools/cli/ and https://redis.io/docs/latest/commands/ping/

## Issues Found
- The Dockerfile used inline comments after `EXPOSE` instructions. Dockerfile comments are only comments when the `#` starts a comment line, so those inline comments would be parsed as arguments. Moved the comments onto their own lines.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the file follows the current Compose Specification behavior.
- The Rails and Sidekiq services depended on PostgreSQL and Redis only by startup order. Added PostgreSQL and Redis health checks and changed `depends_on` to `condition: service_healthy` so `rails db:prepare` and Sidekiq do not race service readiness.
- `config/database.yml` put `DATABASE_URL` in the shared default config, which could make the test environment connect to the development database when `DATABASE_URL` is set. Moved URL handling into environment-specific sections and added a separate `TEST_DATABASE_URL` fallback for test.
- The post claimed Action Cable was using Redis but did not include `config/cable.yml`. Added a Rails Action Cable configuration that uses the Redis adapter in development and production and the test adapter in test.
- The `config.server_timing` comment described live reload/server rendering. Updated the comment to accurately describe Server-Timing metrics.
- The common command example used legacy `docker-compose`. Updated it to the current `docker compose` CLI form.
- The RSpec installation commands did not install the new gems before running the generator. Added `bundle install` before `rails generate rspec:install`.
- The RSpec example said it ran tests with coverage, but `--format documentation` changes output format and does not enable coverage. Corrected the comment.
- The Sidekiq service and configuration assumed the Sidekiq gem was present, but the post never showed adding it. Added the Sidekiq Gemfile entry and install command.

## Review Notes
- The specific Ruby, PostgreSQL, and Redis image tags are valid examples, though they are not necessarily the newest major versions.
- Rails 8 defaults increasingly favor Solid Queue and database-backed Action Cable options, but the post is still technically valid because it intentionally configures Sidekiq and Redis.
