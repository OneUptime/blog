# Validation Summary: How to Build Real-Time Features with ActionCable

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails
- Action Cable
- WebSocket
- Redis Pub/Sub
- Redis Sentinel
- Puma
- NGINX
- Capybara / Rails system tests

## Sources Consulted
- Ruby on Rails Guides: Action Cable Overview - https://guides.rubyonrails.org/action_cable_overview.html
- Ruby on Rails Guides: Testing Rails Applications, Testing Action Cable - https://guides.rubyonrails.org/testing.html#testing-action-cable
- Rails source: Action Cable Redis subscription adapter - https://github.com/rails/rails/blob/main/actioncable/lib/action_cable/subscription_adapter/redis.rb
- redis-client source: Sentinel configuration - https://github.com/redis-rb/redis-client/blob/master/lib/redis_client/sentinel_config.rb
- NGINX official documentation: WebSocket proxying - https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The post described the chat example as a complete implementation. I changed this to a basic implementation because the presence logic shown is illustrative and does not fully solve production presence tracking.
- The typing indicator comment said the broadcast went to others but the code broadcasts to all subscribers. I corrected the comment so it matches Action Cable broadcast behavior.
- The online users example said it gets all connections subscribed to the room. `ActionCable.server.connections` only reflects connections on the current server process and does not provide a cross-server presence list, so I clarified the comment and noted that production presence should be stored in Redis or a database.
- The Redis section said Redis is required for multi-server deployments. Current Rails supports other shared adapters, including PostgreSQL and Solid Cable, so I changed the wording to require a shared adapter and describe Redis as a common option.
- The `pool_size` key in the Action Cable Redis `cable.yml` example is not a documented Action Cable Redis adapter option and is not accepted by the current redis-client configuration path. I removed it.
- The Puma section claimed each WebSocket connection uses one thread while active. Rails documents that Action Cable uses a worker pool for connection callbacks and channel actions, so I corrected the comment and added the database-pool caveat.
- The summary table and production guidance said Redis is required/always required. I updated them to refer to a shared adapter such as Redis.

## Review Notes
The examples remain intentionally simplified and assume application-specific models, routes, authentication setup, DOM elements, and scopes such as `notifications.unread`. Future improvements could add HTML escaping in the JavaScript DOM examples and a fuller Redis-backed presence implementation, but those are outside the narrow technical corrections required for this validation.
