# Validation Summary: How to Use Dapr with Laravel PHP Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar runtime for microservices)
- Laravel (PHP framework)
- PHP 8.1+ (constructor property promotion, `mixed` type)
- Guzzle / Laravel HTTP client
- Dapr State Management API
- Dapr Pub/Sub API
- Dapr Service Invocation API

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr programmatic subscriptions: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/#programmatic-subscriptions
- Laravel HTTP Client documentation: https://laravel.com/docs/11.x/http-client
- Laravel Routing documentation: https://laravel.com/docs/11.x/routing
- Laravel CSRF Protection documentation: https://laravel.com/docs/11.x/csrf

## Issues Found

### 1. Routes registered in `routes/api.php` instead of `routes/web.php` (Major)

**What was wrong:** All routes (including Dapr subscription and event handler routes) were registered in `routes/api.php`. This causes two problems:

1. In Laravel 11 (which `composer create-project laravel/laravel` installs), `routes/api.php` does not exist by default — it must be installed via `php artisan install:api`.
2. In both Laravel 10 and 11, routes in `routes/api.php` are automatically prefixed with `/api`. This means the Dapr subscription endpoint would be at `/api/dapr/subscribe` instead of `/dapr/subscribe`, and Dapr's sidecar would not be able to discover subscriptions. Similarly, event delivery routes would not match the paths returned in the subscription response.

**What was changed:** Moved routes to `routes/web.php` and wrapped them in a `Route::withoutMiddleware([ValidateCsrfToken::class])` group, since this is a microservice that receives JSON requests from the Dapr sidecar rather than browser form submissions. Also added the necessary `use` statements for controllers and middleware.

**Why:** Dapr calls `GET /dapr/subscribe` on the app at startup to discover subscriptions. This path must be accessible without any prefix. The `routes/web.php` file does not add a prefix, making it the correct choice for Dapr integration routes.

## Review Notes
- The `Content-Type: application/json` header set via `withHeaders()` in the DaprService class is technically redundant since Laravel's `Http::post()` sends JSON by default, but it is not incorrect and makes the intent explicit.
- The `invokeService` method uses a dynamic HTTP verb (`->$verb()`). PHP method calls are case-insensitive, so passing `'GET'` or `'get'` both work. However, the `$body` parameter has different semantics depending on the verb (`get()` treats it as query parameters, `post()` as body data). This works for the tutorial's use case but could be misleading for more advanced usage.
- The `env()` call in the DaprService constructor works but is not the Laravel best practice — typically environment values are accessed through config files. This is acceptable for a tutorial.
- The state management pattern of storing all products in a single `all-products` key is not scalable for production but is fine for a tutorial demonstration.
