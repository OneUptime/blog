# Validation Summary: How to Use Redis Pub/Sub in Laravel

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Pub/Sub
- Laravel (PHP framework)
- PHP
- Supervisor (process manager)

## Sources Consulted
- Laravel Redis Pub/Sub documentation: https://laravel.com/docs/11.x/redis#pubsub
- Laravel framework source code (`Illuminate\Redis\Connections\PhpRedisConnection`) for `subscribe()` and `psubscribe()` callback signatures
- Carbon source code (`Carbon\Traits\Converter`) for `toISOString()` method verification

## Issues Found
- **`explode()` index off-by-one in pattern subscription example**: The `psubscribe` code used `explode(':', $channel)[2]` to extract the user ID from a channel like `user-notifications:123`. Splitting `user-notifications:123` by `:` produces `['user-notifications', '123']` — the user ID is at index `1`, not `2`. Index `2` does not exist, so `$userId` would always resolve to `null` via the `?? null` fallback. Fixed to `explode(':', $channel)[1]`.

## Review Notes
- The `Redis::subscribe()` callback signature `(string $message, string $channel)` is correct per Laravel's PhpRedisConnection source — Laravel reorders the underlying phpredis parameters.
- The `Redis::psubscribe()` callback signature `(string $message, string $channel)` is also correct — Laravel intentionally drops the `$pattern` parameter from the underlying phpredis callback.
- `now()->toISOString()` is a valid Carbon method that produces JavaScript-friendly ISO-8601 output with microseconds and `Z` suffix (e.g., `2026-04-10T12:00:00.000000Z`). This is distinct from `toIso8601String()` which uses the ATOM format with offset notation.
- The Supervisor configuration is standard and correct for running long-lived Artisan commands.
