# Validation Summary: How to Use Action Cable for WebSockets in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails (Action Cable)
- WebSockets
- Redis (pub/sub adapter)
- JWT authentication
- RSpec (channel, connection, and system tests)
- JavaScript (`@rails/actioncable` consumer)
- React (client component)
- NGINX (reverse proxy for WebSockets)
- Puma (standalone cable server)
- systemd, Prometheus (production deployment / monitoring)

## Sources Consulted
- Action Cable Overview — Ruby on Rails Guides: https://guides.rubyonrails.org/action_cable_overview.html
- Configuring Rails Applications — Ruby on Rails Guides (Action Cable section): https://guides.rubyonrails.org/configuring.html
- ActionCable::Server::Configuration API: https://api.rubyonrails.org/classes/ActionCable/Server/Configuration.html
- Testing Action Cable / Rails testing guides (channel & connection test helpers)

## Issues Found
- **Invalid configuration option `config.action_cable.adapter`** (appeared twice: in `config/environments/development.rb` with `:async` and in `config/environments/production.rb` with `:redis`). There is no such Rails configuration setting — `ActionCable::Server::Configuration` exposes no `adapter=` accessor, so this code would raise a `NoMethodError` on application boot. The pub/sub adapter is configured exclusively per-environment in `config/cable.yml`, which the post already does correctly in the "Redis Configuration" section. **Fix:** removed both invalid lines (and their accompanying comments). The remaining `url`, `allowed_request_origins`, `mount_path`, and `disable_request_forgery_protection` settings are all valid, and `config/cable.yml` continues to correctly define the async/redis/test adapters.

## Review Notes
- The advanced initializer that assigns `ActionCable.server.config.cable = { ... }` is a valid way to override the cable configuration; `driver: :hiredis` and a `pool:` block are accepted by the Redis adapter. This duplicates what `cable.yml` does but is functionally correct.
- Accessing `request.session` inside `ApplicationCable::Connection#find_user_from_session` works but is environment-dependent — Action Cable does not always have the Rails session available, so cookie-based identification (`cookies.encrypted` / `cookies.signed`) is the more reliable primary path. The post already presents cookie-based auth first, so this is acceptable.
- The monitoring/metrics code uses semi-internal APIs (`ActionCable.server.pubsub.redis_connection_for_subscriptions`, `pubsub.send(:channel_with_prefix, ...)`, `connection.subscriptions.identifiers`). These work against current Rails but are not part of the stable public API and could change between Rails versions — fine for an illustrative example but worth a caveat in production code.
- `ActionCable.server.connections` only reflects connections on the local server process, not the whole cluster; the health/metrics counts are per-instance. This is correct behaviour but readers scaling horizontally should be aware of it.
- All RSpec helpers used (`stub_connection`, `subscribe`, `perform`, `have_broadcasted_to`, `have_stream_from`, `connect`, `have_rejected_connection`) are valid and current.
