# Validation Summary: How to Build Microservices with Laravel

## Status
validated

## Post Type
Tutorial / Architecture guide

## Technologies Covered
- Laravel (PHP framework)
- Lumen (Laravel's micro-framework — now archived)
- PHP 8+ (typed properties, `match` expressions, nullsafe operator)
- Eloquent ORM
- Guzzle HTTP client
- RabbitMQ (via `php-amqplib`)
- Docker Compose
- MySQL 8
- PHPUnit / Mockery

## Sources Consulted
- Lumen framework repository status — https://github.com/laravel/lumen (archived 2024-04-09)
- Laravel Broadcasting docs (10.x / 11.x / 12.x) — https://laravel.com/docs/12.x/broadcasting
- Laravel Events docs — https://laravel.com/docs/12.x/events
- Laravel Cache docs (Cache::increment semantics) — https://laravel.com/docs/12.x/cache
- `php-amqplib/php-amqplib` source — https://github.com/php-amqplib/php-amqplib (AMQPStreamConnection constructor signature)
- Lumen documentation — https://lumen.laravel.com/docs (bootstrap, withEloquent, withFacades, routing)
- Guzzle HTTP docs — https://docs.guzzlephp.org

## Issues Found

1. **Lumen described as the recommended path without noting its archived status.**
   - The `laravel/lumen` application skeleton was archived on 2024-04-09; the Laravel team now recommends starting new projects with Laravel itself.
   - **Fix:** Added a callout immediately after the "Creating a Lumen Microservice" heading explaining Lumen's archived status and noting that the patterns shown apply equally to full Laravel. Also softened the conclusion bullet ("Use **Laravel** (or Lumen for existing services)…") so the post no longer steers new projects toward an archived skeleton.

2. **`OrderCreated` event misrepresented `ShouldBroadcast` as a way to publish to RabbitMQ.**
   - The introduction stated the event "implements ShouldBroadcast to publish to the message queue, allowing other services to react asynchronously." `Illuminate\Contracts\Broadcasting\ShouldBroadcast` only drives Laravel Broadcasting (Reverb / Pusher / Ably — i.e., real-time delivery to browser clients via Laravel Echo); it does not publish to RabbitMQ or any inter-service broker. Conflating the two is a common but incorrect Laravel pattern.
   - The `broadcastOn()` method also returned a plain string array (`['orders']`), which has not been the documented form for some time — current Laravel docs require `Channel` / `PrivateChannel` / `PresenceChannel` instances.
   - **Fix:** Rewrote the introductory text to describe the class as a regular domain event whose payload is later picked up by a listener that dispatches the `PublishEvent` job (which is what actually publishes to RabbitMQ later in the post). Dropped `implements ShouldBroadcast`, the `InteractsWithSockets` trait, the `broadcastOn()` / `broadcastAs()` methods, and the broadcasting imports. Renamed `broadcastWith()` to `toPayload()` since it now serves as a plain serializer for the publisher job. Added a clarifying note explaining when `ShouldBroadcast` is and is not appropriate.

3. **`GatewayController::forwardRequest` silently sent the wrong HTTP verb for PUT, PATCH, and DELETE.**
   - The `match` expression mapped `PUT`/`PATCH` to `$this->httpClient->post(...)` and `DELETE` to `$this->httpClient->get(...)`. Since `HttpClient` only exposed `get()` and `post()`, every non-GET/POST proxied request was being sent with the wrong method — a real functional bug that would break any backend endpoint relying on REST verb semantics.
   - **Fix:** Added public `put()`, `patch()`, and `delete()` methods to the `HttpClient` class (reusing the existing protected `request()` retry pipeline so retry/error semantics are preserved), and updated the `match` arms in `GatewayController::forwardRequest` to call the correctly-named methods.

## Review Notes

- `Cache::increment()` on a missing key is **driver-dependent**. The Laravel 12 docs explicitly recommend `Cache::add($key, 0, ttl)` before `Cache::increment($key)`. The post's `CircuitBreaker` relies on `Cache::increment(...)` for `failures`, `half_open_success`, etc., which works for Redis/Memcached (the most common production drivers) but can misbehave on file/database/DynamoDB drivers. Did not change the code — Redis is the typical assumption for this kind of resilience tracking — but worth calling out for readers using a different cache store.
- The `CircuitBreaker::isAvailable()` method reads `half_open_count` but the code never increments it; in practice state transitions are driven entirely by `half_open_success` and the failure path, so the dead read does not affect correctness. Left as-is to avoid restructuring illustrative code.
- The `OrderCreated::__construct` uses `uniqid('evt_', true)` for an event ID. This produces a unique-enough string for most cases but is not cryptographically random and is not a UUID. A future improvement would be `(string) Str::uuid()` / `Str::ulid()` for monotonic, sortable IDs that work better as idempotency keys downstream.
- `RABBITMQ_VHOST` is defined in `config/services.php` but the `PublishEvent` job and `ConsumeEvents` command both omit it when constructing `AMQPStreamConnection`. Defaults to `/`, so this is harmless for the typical single-vhost setup, but multi-tenant brokers would need the vhost passed through.
- `docker-compose.yml` uses `version: '3.8'`, which Compose V2 treats as obsolete (a warning is printed but it still works). Removing the `version:` key would be the modern style; left for now since it remains functional.
- The post does not specify a Laravel/Lumen version. The code uses PHP 8.0+ features (`match`, nullsafe `?->`, constructor promotion via typed `protected` properties) so it implicitly targets recent Laravel 9–11 and Lumen 9+. Worth pinning a version in a future revision.
