# Validation Summary: How to Configure Laravel Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Laravel (logging system, channels, middleware, HTTP client)
- PHP (PSR-3 log levels, enums, namespaces)
- Monolog 3.x (handlers, formatters, processors, `LogRecord`, `Level` enum)
- Slack (incoming webhook via `SlackWebhookHandler`)
- Syslog / Papertrail (`SyslogUdpHandler`)
- Redis (`RedisHandler` with Predis client)
- Elasticsearch (`ElasticsearchHandler` + new `Elastic\Elasticsearch\ClientBuilder`)
- OpenTelemetry PHP SDK (trace correlation, OTLP logs)
- OneUptime (custom OTLP HTTP exporter)

## Sources Consulted
- Laravel 11.x Logging docs: https://laravel.com/docs/11.x/logging
- Laravel 11.x HTTP Client docs: https://laravel.com/docs/11.x/http-client
- Laravel source: `Illuminate\Log\LogManager` (`createSingleDriver`, `createSlackDriver`)
- Monolog source: `Seldaek/monolog/src/Monolog/Level.php`
- Monolog source: `Seldaek/monolog/src/Monolog/LogRecord.php`
- Monolog source: `Seldaek/monolog/src/Monolog/Handler/BufferHandler.php`
- Monolog source: `Seldaek/monolog/src/Monolog/Handler/AbstractProcessingHandler.php`
- Monolog source: `Seldaek/monolog/src/Monolog/Handler/RedisHandler.php`
- Monolog source: `Seldaek/monolog/src/Monolog/Handler/ElasticsearchHandler.php`
- PSR-3 Logger Interface: https://www.php-fig.org/psr/psr-3/

## Issues Found

1. **`Monolog\Level::X` referenced from inside namespaced classes (multiple locations)**
   - **Problem:** Files like `app/Logging/CustomLogger.php` declare `namespace App\Logging;`. Inside that namespace, `Monolog\Level::Debug` resolves to `App\Logging\Monolog\Level::Debug`, which does not exist — fatal error.
   - **Fix:** Added `use Monolog\Level;` to each affected class and replaced `Monolog\Level::X` with `Level::X`. Affected classes: `CustomLogger`, `BufferedLogger`, `FilteredLogger`, `RedisLogger`, `ElasticsearchLogger`, `OpenTelemetryLogger`, `OneUptimeHandler`/`OneUptimeLogger`, `FormattedLogger`.
   - The two remaining `Monolog\Level::` references inside `config/logging.php` examples are correct because that file is in the global namespace.

2. **`Http::async()` does not exist on Laravel's HTTP client**
   - **Problem:** The OneUptime handler called `Http::withToken(...)->timeout(5)->async()->post(...)`. `Illuminate\Http\Client\PendingRequest` has no `async()` method — concurrent requests are done via `Http::pool()`, and a true fire-and-forget pattern requires a queued job or raw Guzzle async.
   - **Fix:** Removed the `->async()` call. Updated the inline comment to recommend wrapping in a queued job for production (the realistic way to keep log writes off the request path).

3. **`BufferHandler` constructor argument labels were wrong**
   - **Problem:** The example labeled the 4th constructor argument as "Flush on overflow" and the 5th as "Flush on shutdown". Per Monolog 3 source, the actual signature is `__construct(HandlerInterface $handler, int $bufferLimit = 0, int|string|Level $level = Level::Debug, bool $bubble = true, bool $flushOnOverflow = false)`. So 4th = `$bubble`, 5th = `$flushOnOverflow`. `BufferHandler` already flushes on shutdown via `__destruct()` — there is no parameter for that.
   - **Fix:** Corrected the inline comments to "Bubble records to other handlers" (4th) and "Flush on overflow (when buffer is full)" (5th), and noted that automatic shutdown flush is provided by `__destruct`.

## Review Notes

- `Monolog\LogRecord` in Monolog 3 is **not** a `readonly` class — only some properties (`datetime`, `channel`, `level`, `message`, `context`) are `public readonly`. `$extra` and `$formatted` are mutable, so the `OpenTelemetryProcessor` mutating `$record->extra['trace_id'] = ...` directly is valid. No change needed.
- The Slack channel config uses a `channel` key (e.g., `'channel' => '#alerts'`). This is supported by Laravel's `createSlackDriver` (it reads `$config['channel'] ?? null` and forwards to `SlackWebhookHandler`), but it is **not** listed in the public Laravel logging docs — left as-is since it works.
- The example registers middleware via `app/Http/Kernel.php`. This is correct for Laravel ≤10. Laravel 11 removed `Kernel.php` and middleware is now registered in `bootstrap/app.php`. Since the post does not commit to a specific Laravel version, left as-is.
- `Monolog\Handler\SlackWebhookHandler` is deprecated in Monolog 3 in favor of the newer Slack Web API handlers, but it still functions; Laravel's `slack` driver continues to use it.
- The OneUptime OTLP body in the `write()` method is a simplified JSON shape (uses `severityText` / `body` strings rather than the full `{"stringValue": ...}` `AnyValue` wrapping required by the strict OTLP/HTTP+JSON spec, and omits `resource` on `resourceLogs`). Treated as illustrative for the post; not flagged as a hard error since the OneUptime ingester is the practical authority on what it accepts and the post is teaching Laravel logging concepts, not the OTLP wire format.
- `ElasticsearchHandler`'s `'type' => '_doc'` option is harmless but obsolete in modern Elasticsearch (7+/8+ no longer use document types). Left as-is since it's still accepted.
- The Laravel HTTP client call inside a Monolog handler will block the request even after removing `->async()`. Production guidance to wrap this in a queued job is now in the inline comment.
