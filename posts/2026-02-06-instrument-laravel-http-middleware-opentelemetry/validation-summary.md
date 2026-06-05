# Validation Summary: How to Instrument Laravel HTTP Middleware with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PHP
- Laravel HTTP middleware
- Laravel authentication middleware
- Laravel rate limiting middleware
- OpenTelemetry PHP tracing API
- OpenTelemetry HTTP semantic conventions
- Mermaid diagrams

## Sources Consulted
- Laravel 13 middleware documentation: https://laravel.com/docs/13.x/middleware
- Laravel 13 authentication documentation: https://laravel.com/docs/13.x/authentication
- Laravel 13 `Authenticate` middleware API: https://api.laravel.com/docs/13.x/Illuminate/Auth/Middleware/Authenticate.html
- Laravel 13 `ThrottleRequests` middleware API: https://api.laravel.com/docs/13.x/Illuminate/Routing/Middleware/ThrottleRequests.html
- Laravel 13 `Illuminate\Http\Response` API: https://api.laravel.com/docs/13.x/Illuminate/Http/Response.html
- OpenTelemetry PHP getting started documentation: https://opentelemetry.io/docs/languages/php/getting-started/
- OpenTelemetry PHP context documentation: https://opentelemetry.io/docs/languages/php/context/
- OpenTelemetry PHP zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/php/
- OpenTelemetry PHP API documentation for `SpanInterface`: https://open-telemetry.github.io/opentelemetry-php/classes/OpenTelemetry-API-Trace-SpanInterface.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry stable HTTP convention migration summary: https://opentelemetry.io/blog/2023/http-conventions-declared-stable/

## Issues Found
- The OpenTelemetry PHP examples used `StatusCode::ERROR`, but the PHP API expects `StatusCode::STATUS_ERROR`. Updated all span status calls.
- The custom middleware examples overrode `process()` with fixed string parameters while the abstract base class declared a variadic method. Updated subclasses to use compatible variadic signatures and read the middleware parameter from `$parameters`.
- The response status examples used `$response->status()`, which is not available on every Symfony response subclass Laravel middleware may receive. Updated them to `$response->getStatusCode()`.
- The post used older HTTP span attribute names such as `http.method`, `http.url`, and `http.status_code`. Updated them to current stable semantic convention names: `http.request.method`, `url.full`, and `http.response.status_code`.
- The Laravel middleware registration snippets only showed `app/Http/Kernel.php`. Added current Laravel 11+ `bootstrap/app.php` registration examples while preserving Laravel 10 and earlier notes.
- The custom rate limiting middleware assumed `$maxAttempts` was always numeric, but Laravel's throttle middleware accepts named limiter strings. Updated the example to handle numeric limits separately from named limiters.
- The rate limiting exception event could reference `$attempts` before assignment. Initialized it before the `try` block and used an `unknown` fallback.
- The validation failure event attached the nested validation error array directly as an event attribute. Changed it to JSON so it remains a scalar event attribute value.
- The feature flag route example used a `feature` middleware alias without showing how to register it. Added Laravel 11+ alias registration guidance and a Laravel 10 and earlier note.
- The performance middleware started its span after `$next($request)` returned, so the span duration did not cover middleware execution and exceptions were not recorded. Updated it so the span encloses the middleware stack and records exceptions.

## Review Notes
The examples remain intentionally application-level and may need adjustment for projects that already use Laravel's OpenTelemetry auto-instrumentation or Redis-backed throttling aliases.
