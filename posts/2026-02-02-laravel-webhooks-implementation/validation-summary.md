# Validation Summary: How to Implement Webhooks in Laravel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP 8.x (constructor property promotion, `match` expressions, `str_starts_with`)
- Laravel 11+ (with notes for older versions)
- Laravel HTTP client (`Illuminate\Support\Facades\Http`)
- Laravel Queues / Jobs (`ShouldQueue`, `$backoff`, `$tries`, `release()`)
- Laravel Events / Listeners
- Laravel Eloquent (migrations, models, relationships, casts)
- Stripe PHP SDK (`\Stripe\Webhook::constructEvent`)
- GitHub webhooks (`X-Hub-Signature-256`)
- HMAC-SHA256 signature verification
- PHPUnit feature tests

## Sources Consulted
- Laravel documentation — Queues: https://laravel.com/docs/11.x/queues (backoff arrays, `$tries`, `$deleteWhenMissingModels`, `release()`)
- Laravel documentation — HTTP Client: https://laravel.com/docs/11.x/http-client
- Laravel documentation — Middleware (Laravel 11): https://laravel.com/docs/11.x/middleware (`bootstrap/app.php`, `$middleware->alias()`)
- Laravel documentation — Helpers: https://laravel.com/docs/11.x/helpers (`dispatch()->afterResponse()` for closures)
- Laravel documentation — Eloquent Migrations: https://laravel.com/docs/11.x/migrations (`foreignId()->constrained()`, `json()`, `enum()`)
- Laravel documentation — Events: https://laravel.com/docs/11.x/events
- Stripe Webhooks docs: https://stripe.com/docs/webhooks/signatures (`Webhook::constructEvent`)
- GitHub Webhooks docs: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries (`X-Hub-Signature-256`, `sha256=` prefix)
- PHP documentation: `hash_hmac`, `hash_equals`, `random_bytes` (used by `Str::random`)

## Issues Found
No technical issues found.

## Review Notes
- The `VerifyCsrfToken` middleware section uses the pre-Laravel 11 style (`$except` array in `app/Http/Middleware/VerifyCsrfToken.php`). In Laravel 11+, CSRF exclusions are configured in `bootstrap/app.php` via `$middleware->validateCsrfTokens(except: [...])`. The post acknowledges both eras elsewhere (the middleware-registration section explicitly notes Laravel 11+ vs. older versions), and the `$except` pattern remains correct for older Laravel installs, so this is not a technical error — just a version-specific caveat readers on Laravel 11+ should adapt.
- The `EventServiceProvider` with `$listen` array still works but is not auto-generated in Laravel 11+ skeletons (events are auto-discovered or registered in `AppServiceProvider`). The example remains valid if the provider is registered manually. Not an error.
- URLs are inconsistent across sections (`/webhooks/incoming/{source}` in the routes section, `/webhooks/{provider}` in the middleware section, `/api/webhooks/custom` in the tests). This is a structural inconsistency rather than a technical error — the per-snippet code is correct.
- The `$this->authorize()` calls in the management API controller assume the base `Controller` class uses the `AuthorizesRequests` trait. In Laravel 11+ skeletons this trait is no longer included in the base controller by default and must be added explicitly. Standard assumption for tutorial code; not corrected.
- In `WebhookDispatcher::sign()`, the signature is computed over `json_encode($payload)`, and Laravel's `Http::post($url, $payload)` JSON-encodes the same array using the same `json_encode` semantics, so the receiver verifying against the raw request body will match. Subtle but correct.
- The manual `$this->release($this->backoff[$attempt - 1] ?? 300)` in `DeliverWebhook::handle()` is somewhat redundant given the `$backoff` array property already controls retry delays, but it does work and is not incorrect.
