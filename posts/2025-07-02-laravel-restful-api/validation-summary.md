# Validation Summary: How to Build RESTful APIs with Laravel

## Status
validated

## Post Type
Tutorial / Guide — a comprehensive, code-heavy walkthrough of building a production-ready RESTful API with Laravel (routing, Eloquent models, controllers, API resources, form-request validation, Sanctum auth, error handling, middleware, versioning, and feature tests).

## Technologies Covered
- PHP 8.x
- Laravel 11/12 (the post targets "Laravel 11+", using `php artisan install:api`)
- Eloquent ORM (models, relationships, scopes, soft deletes, migrations)
- Laravel API Resources / Resource Collections
- Form Requests (validation & authorization)
- Laravel Sanctum (token-based API authentication)
- REST / HTTP method semantics
- PHPUnit feature testing with `RefreshDatabase` and `Sanctum::actingAs`

## Sources Consulted
- Laravel 12.x Error Handling docs — https://laravel.com/docs/12.x/errors (confirmed `withExceptions` / `bootstrap/app.php` is the modern handler mechanism; `render`, `shouldRenderJsonWhen`, `respond` methods)
- Laravel 11.x Error Handling docs — https://laravel.com/docs/11.x/errors (confirmed `app/Exceptions/Handler.php` was removed in Laravel 11)
- Laravel Eloquent docs — https://laravel.com/docs/11.x/eloquent (model `boot()`/`booted()`, casts, relationships, scopes)
- Laravel Sanctum docs — https://laravel.com/docs/sanctum (`createToken(name, abilities)`, `currentAccessToken()`, token revocation)
- Laravel API Resources docs — https://laravel.com/docs/eloquent-resources (`whenLoaded`, `whenCounted`, `with()`, `paginationInformation`)
- Laravel Routing / `apiResource`, `install:api` artisan command — https://laravel.com/docs/routing
- Community references confirming the Laravel 11 Handler.php removal and `withExceptions` migration (GitHub discussion #50902; Laravel News / Medium write-ups)

## Issues Found
1. **Outdated exception-handling approach for the stated version (fixed).** The "Custom Exception Handler" section presented a full `app/Exceptions/Handler.php` class extending `Illuminate\Foundation\Exceptions\Handler` with a `register()` method and an overridden `invalidJson()`. This is the Laravel ≤10 pattern. The post explicitly targets Laravel 11+ (`php artisan install:api`), and in Laravel 11 the `app/Exceptions/Handler.php` file was removed — exception reporting/rendering is configured in `bootstrap/app.php` via `->withExceptions(...)`. As written, the class would not be wired up or take effect in a default Laravel 11/12 app. Rewrote the block to the official `bootstrap/app.php` + `withExceptions` form using `$exceptions->render(...)` closures for `ModelNotFoundException`, `NotFoundHttpException`, `AuthenticationException`, `HttpException`, and `Throwable`, plus a `ValidationException` render closure replacing the old `invalidJson()` override. All response shapes (messages, codes, status codes) were preserved so the existing feature tests still hold (e.g. 401 `"Unauthenticated"`, 422 `"Validation failed"` / `VALIDATION_ERROR`).

2. **Missing import in the first `routes/api.php` snippet (fixed).** The protected `/user` route used a `Request $request` type-hint but the snippet only imported `PostController`, `CommentController`, and the `Route` facade. Added `use Illuminate\Http\Request;` so the snippet is self-consistent and runnable.

3. **Minor PHP 8.4 deprecation avoided while rewriting (incidental).** The original `apiErrorResponse(..., array $debug = null)` used an implicitly-nullable parameter (deprecated in PHP 8.4). The rewritten helper closure uses the explicit `?array $debug = null`.

## Review Notes
- The post intentionally shows several alternative/illustrative snippets that are not all meant to coexist in one app (e.g. a top-level `apiResource('posts', ...)` plus versioned `v1`/`v2` route groups, and a main `Api\PostController` vs. the `Api\V1\PostController` the tests hit via `/api/v1/posts`). This produces some cross-snippet inconsistency (route-name collisions on `posts.show`, and the feature tests assuming v1 routes are auth-protected) that is normal for a tutorial demonstrating options. These were left as-is since "fixing" them would require restructuring the post rather than correcting a technical error.
- `protected static function boot(): void` correctly calls `parent::boot()`. Laravel also offers the `booted()` hook to avoid the `parent::boot()` footgun; the shown code is valid as written.
- Sanctum usage is current: `createToken($name, $abilities)`, `currentAccessToken()->delete()`, and `tokens()->delete()` are all accurate.
- API Resource features used (`whenLoaded`, `whenCounted`, `when`, `with()`, and overriding `paginationInformation()`) are all valid and current.
- The custom `ApiRateLimiter` middleware is a valid hand-rolled example; in practice Laravel's built-in `throttle` middleware / named rate limiters (`RateLimiter::for(...)`) cover most use cases, but the bespoke version is correct.
