# Validation Summary: How to Use Podman for Ruby Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Compose workflows with Podman
- Ruby
- Bundler
- Ruby on Rails
- RSpec
- PostgreSQL
- Redis
- Sidekiq

## Sources Consulted
- Podman overview and rootless/daemonless behavior: https://docs.podman.io/en/v4.3/markdown/podman.1.html
- Podman Compose command reference: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman `--volume` / SELinux mount options: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Podman build reference: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Rails configuration guide for `config.file_watcher`: https://guides.rubyonrails.org/v8.0.0/configuring.html
- Rails autoloading/reloading guide on evented vs non-evented file watching: https://guides.rubyonrails.org/v7.0/autoloading_and_reloading_constants.html
- Rails migrations guide for `db:prepare`: https://guides.rubyonrails.org/active_record_migrations.html
- Rails testing guide for current test database maintenance guidance: https://guides.rubyonrails.org/testing.html
- Docker Compose file reference, obsolete `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference for `stdin_open`, `tty`, and `z`/`Z` bind-mount options: https://docs.docker.com/reference/compose-file/services/
- Docker Official Ruby image documentation: https://hub.docker.com/_/ruby
- Ruby bundled `debug` gem reference: https://stdgems.org/debug/
- `ruby/debug` remote debugging documentation: https://github.com/ruby/debug

## Issues Found
- The post used `podman-compose` as the primary command path. I changed the commands to `podman compose` and added a note that it relies on an external Compose provider, because current Podman documents Compose through the `podman compose` entry point.
- The compose example included `version: "3.8"`. I removed it because the current Compose specification marks the top-level `version` field as obsolete and only informative.
- The compose example mounted the same project directory into both `web` and `sidekiq` with `:Z`. I changed those bind mounts to `:z` because the directory is shared across multiple containers and `:Z` is for private, unshared SELinux labels.
- The debugging section told readers to attach to the `web` container but the compose service did not allocate STDIN or a TTY. I added `stdin_open: true` and `tty: true` to `web` and updated the text so the interactive debugging workflow is technically consistent.
- The standalone test example used `rails db:test:prepare`. I replaced it with `bundle exec rails db:prepare` because `db:prepare` is the current idempotent Rails task for preparing databases.
- The live reloading section described `ActiveSupport::FileUpdateChecker` as polling-based. I corrected the wording to describe it as the non-evented watcher that checks watched paths rather than relying on filesystem events.
- The Gemfile snippet mentioned `debug` in prose but did not include it in code. I added `gem 'debug'` and clarified that although Ruby 3.1+ ships it as a bundled gem, it should still be listed in the Gemfile when using Bundler.

## Review Notes
- The Ruby image tags used in the post remain valid, but they are not the newest available tags as of 2026-05-07.
- The production image example is broadly correct for Rails apps that do not need extra frontend build tooling. Apps using Node-based asset pipelines may need additional packages during the build stage.
- Podman on macOS and Windows still runs through `podman machine`, so the article reads as a Linux-first workflow guide.
