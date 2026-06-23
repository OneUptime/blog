# Validation Summary: How to Use Laravel Sanctum for API Authentication

## Status
validated

## Post Type
Tutorial / Guide (comprehensive implementation walkthrough)

## Technologies Covered
- PHP
- Laravel (10/11)
- Laravel Sanctum (token + SPA cookie authentication)
- Eloquent / database migrations
- Axios (JavaScript SPA client)
- Swift (iOS client example)
- Kotlin / Retrofit / OkHttp (Android client example)
- PHPUnit feature testing

## Sources Consulted
- Official Laravel Sanctum documentation: https://laravel.com/docs/11.x/sanctum
  - `HasApiTokens` trait namespace (`Laravel\Sanctum\HasApiTokens`)
  - `createToken($name, $abilities, $expiresAt)` signature and `plainTextToken`
  - `tokenCan()` / `tokenCant()` ability checks
  - `currentAccessToken()` and `tokens()` relationship for revocation
  - Built-in `sanctum:prune-expired --hours=N` Artisan command + scheduling
  - SPA flow: `/sanctum/csrf-cookie`, `XSRF-TOKEN`/`X-XSRF-TOKEN`, `statefulApi()`, `supports_credentials`, session domain config
  - `Sanctum::actingAs($user, $abilities)` testing helper

## Issues Found
No technical issues found. All code examples are syntactically correct, use current (non-deprecated) Sanctum/Laravel APIs, and match the official documentation:
- Trait, token creation, ability checks, and revocation calls match the docs exactly.
- The `personal_access_tokens` migration schema (`morphs('tokenable')`, 64-char unique `token`, `abilities`, `last_used_at`, `expires_at`) matches Sanctum's shipped migration.
- The SPA cookie/CSRF flow, CORS `supports_credentials: true`, session `domain` (`.example.com`), and `withCredentials` client config are correct.
- Test examples use `Sanctum::actingAs()` correctly, including `['*']` for all abilities.

## Review Notes
- **Installation method**: The post installs via `composer require laravel/sanctum` + `vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"` + `php artisan migrate`. This still works on Laravel 10/11, but Laravel 11's documented shortcut is `php artisan install:api`, which installs Sanctum and publishes the API routes/migrations in one step. The manual path remains valid, so no change was made.
- **Custom prune command**: The post defines a custom `PruneExpiredTokens` command using the signature `sanctum:prune-expired`, which is the same signature as the command Sanctum already ships. In a real app this duplicates/overrides the built-in command and could be confusing. The built-in `sanctum:prune-expired --hours=N` already deletes expired tokens, so a custom reimplementation is generally unnecessary. Left as-is because it is presented as an illustrative example and is not syntactically broken; consider using a distinct signature or simply scheduling the built-in command.
- **Custom `ability` middleware**: The post builds its own `CheckTokenAbility` middleware aliased as `ability`. Sanctum already provides `CheckAbilities` (`abilities`, AND logic) and `CheckForAnyAbility` (`ability`, OR logic). The custom middleware is functionally equivalent for the OR case and is a valid choice; just be aware the built-ins exist.
- **Carbon 3 (Laravel 11)**: `diffInMinutes(..., false)` and related Carbon calls in the token status/refresh controllers behave as intended under Carbon 3's signed/float semantics, but readers on the Carbon 2 → 3 boundary should be aware the default absolute-value behavior changed.
- The default `expiration` in Sanctum's published config is `null` (never expires); the post intentionally sets a 7-day default, which is a reasonable security improvement and clearly explained.
