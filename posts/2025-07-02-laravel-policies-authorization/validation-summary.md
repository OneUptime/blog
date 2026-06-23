# Validation Summary: How to Use Laravel Policies for Authorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP
- Laravel (Gates & Policies authorization system)
- Eloquent models
- Blade templating directives
- PHPUnit (policy unit and feature testing)

## Sources Consulted
- Laravel Authorization documentation — https://laravel.com/docs/authorization
- Laravel Gates (`Gate::define`, `before`, `after`, `allows`, `denies`, `authorize`, `inspect`) — https://laravel.com/docs/authorization#gates
- Laravel Policies (generation, structure, `before`, registration, `authorizeResource`) — https://laravel.com/docs/authorization#creating-policies
- Laravel Authorization Responses (`Response::allow`, `deny`, `denyWithStatus`, `denyAsNotFound`) — https://laravel.com/docs/authorization#policy-responses
- Laravel Blade authorization directives (`@can`, `@cannot`, `@canany`, `@guest`) — https://laravel.com/docs/blade#authorization
- Artisan `make:policy` command reference — https://laravel.com/docs/artisan

## Issues Found
No technical issues found.

All code examples, command syntax, and explanations were verified against the official Laravel documentation:

- Gate definitions and hooks (`Gate::before` returning `null` to fall through, `Gate::after`) are correct.
- Gate consumption methods (`allows()`, `denies()`, `authorize()`, `inspect()` with `allowed()`/`denied()`/`message()`) are accurate.
- Policy structure including `before()` returning `?bool`, standard ability methods (`viewAny`, `view`, `create`, `update`, `delete`, `restore`, `forceDelete`), and custom methods are correct.
- `php artisan make:policy PostPolicy --model=Post` and the no-model form are valid.
- The `authorizeResource()` ability-to-action mapping (viewAny→index, view→show, create→create/store, update→edit/update, delete→destroy) matches Laravel's behavior.
- `Response::deny()`, `Response::allow()`, `Response::denyWithStatus()`, and `Response::denyAsNotFound()` are all valid (available since Laravel 9).
- Middleware usage (`can:access-admin-panel`, `can:update,post`) is correct.
- Blade directives (`@can`, `@cannot`, `@canany`, `@guest`/`@else`/`@endguest`) are used correctly.
- Policy registration via `Gate::policy()` and the auto-discovery naming convention are accurate.

## Review Notes
- **Version caveat (not an error):** `$this->authorize()` and `$this->authorizeResource()` rely on the `Illuminate\Foundation\Auth\Access\AuthorizesRequests` trait. In Laravel 10 and earlier this trait was included in the base `App\Http\Controllers\Controller`. In Laravel 11+, the slimmed-down base controller no longer includes it by default, so developers on Laravel 11+ must add `use AuthorizesRequests;` to their controller (or base controller) for these helper methods to work. The post does not pin a version, so the examples remain valid, but this is a common gotcha worth being aware of.
- The `HandlesAuthorization` trait shown in `PostPolicy` is still valid but is optional in modern Laravel since policies can return `Illuminate\Auth\Access\Response` objects directly.
- The `Gate::after` callback's `$result` parameter is typed `bool`; in practice the result may be `null` when no matching gate/policy returned a decision. This works for the logging example shown but is a minor edge consideration rather than an error.
- The custom role middleware registration note correctly distinguishes `bootstrap/app.php` (Laravel 11+) from `app/Http/Kernel.php` (Laravel 10 and earlier).
