# Validation Summary: How to Build Multi-Tenant Applications in Laravel

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- PHP 8.x (constructor property promotion, `match` expressions, `mixed` type, union types)
- Laravel 10/11 (Eloquent, global scopes, middleware, service providers, queues, Sanctum)
- Eloquent ORM (models, relationships, traits, casts, soft deletes)
- MySQL (database-per-tenant provisioning)
- stancl/tenancy package (referenced for install)
- Multi-tenant SaaS architecture patterns

## Sources Consulted
- Laravel Eloquent docs — Global Scopes & model events (https://laravel.com/docs/eloquent)
- Laravel Eloquent Mutators / Attribute Casting, including the `hashed` cast introduced in Laravel 10.10 (https://laravel.com/docs/eloquent-mutators)
- Laravel Middleware docs, including terminable middleware (https://laravel.com/docs/middleware)
- Laravel Database / multiple connections, `DB::purge`, `DB::reconnect`, `DB::setDefaultConnection` (https://laravel.com/docs/database)
- Laravel Service Container & Providers (https://laravel.com/docs/providers)
- Laravel Queues — serializable jobs, `$tries`, `$backoff`, `failed()` (https://laravel.com/docs/queues)
- Laravel Sanctum — `HasApiTokens` (https://laravel.com/docs/sanctum)
- stancl/tenancy package (https://github.com/stancl/tenancy)
- GitHub laravel/framework #47028 — confirmation of `hashed` cast availability

## Issues Found
- **Incorrect docblock return type in `ProjectController::index()`**: The method's PHPDoc declared `@return AnonymousResourceCollection`, but the actual method signature and body return a `JsonResponse` (via `response()->json(...)`). Updated the docblock to `@return JsonResponse` to match the real return type. (The `AnonymousResourceCollection` import is now unused, but it is harmless and was left untouched to avoid unnecessary changes.)

## Review Notes
- All core Laravel APIs used are current and correct: `addGlobalScope` with a closure, `static::creating()` model events, `withoutGlobalScope`, soft deletes, JSON casts, `data_get()`, `Cache::remember()` with a `DateTime` TTL, `view()->share()`, terminable middleware with constructor-injected services, `DB::purge`/`reconnect`/`setDefaultConnection`, and `Str::slug`/`Hash::make`.
- The `'password' => 'hashed'` cast is valid for Laravel 10.10+ (verified). Since the post targets a modern Laravel version, this is appropriate.
- The post installs `stancl/tenancy` in the setup step but then builds a fully custom tenancy implementation without using that package. This is not an error, but readers may find the dependency unnecessary for the hand-rolled approach shown. Worth a future clarifying note.
- Minor design inconsistency (not a bug): the `IdentifyTenant` middleware defaults to the `identifyAuto` strategy when no strategy argument is passed, while `config/tenancy.php` defines a default `identification_strategy` of `subdomain`. The config value is never wired into the middleware. This is a design/wiring gap rather than a technical error and does not break any shown code path.
- The database-per-tenant `BelongsToTenant` global scope filters on `tenant_id`, which is only relevant for the shared-database strategy; the post keeps the strategies separate, so there is no conflict in the examples as written.
