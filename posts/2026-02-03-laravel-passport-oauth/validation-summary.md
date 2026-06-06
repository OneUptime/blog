# Validation Summary: How to Use Laravel Passport for OAuth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP 8.1+
- Laravel 10.x / 11.x
- Laravel Passport 11.x / 12.x
- OAuth2 (RFC 6749) — personal access, password, authorization code, client credentials grants
- Composer / Artisan CLI

## Sources Consulted
- Laravel 11.x Passport documentation: https://laravel.com/docs/11.x/passport
- Laravel Passport GitHub source (12.x branch): https://github.com/laravel/passport/tree/12.x
- `Laravel\Passport\Token` source: https://github.com/laravel/passport/blob/12.x/src/Token.php
- `Laravel\Passport\Exceptions\MissingScopeException` source: https://github.com/laravel/passport/blob/12.x/src/Exceptions/MissingScopeException.php
- Laravel 11 exception handling docs (bootstrap/app.php pattern)

## Issues Found

### 1. `Passport::routes()` no longer exists in Passport 12 (Laravel 11)
The post instructed readers to call `Passport::routes()` in their `AppServiceProvider::boot` method when running on Laravel 11. This method was removed in Passport 12.0 — OAuth routes are now auto-registered by Passport's service provider. Calling it would throw an undefined-method error.

**Fix:** Removed both `Passport::routes()` calls (in the "Registering Passport Routes" section and the scopes section) and renamed the section to "Configuring Passport". Updated the prose to explain that routes are auto-registered while still showing where to configure token lifetimes.

### 2. Password grant disabled by default in Passport 12 — `enablePasswordGrant()` required
In Passport 12 the password grant is disabled by default (the OAuth2 working group no longer recommends it). The post's password-grant code would fail with an `unsupported_grant_type` error without explicit enablement.

**Fix:** Added a note about deprecation and an `enablePasswordGrant()` call snippet inside the "Password Grant Tokens" section before the client-creation step.

### 3. Outdated installation flow for Laravel 11
The post used the Laravel 10 install steps (`composer require laravel/passport` → `php artisan migrate` → `php artisan passport:install`). Laravel 11 introduced the one-step `php artisan install:api --passport` command, which is the recommended approach.

**Fix:** Rewrote the Installation section to show `install:api --passport` first for Laravel 11, then kept the manual steps clearly labeled as the Laravel 10 path.

### 4. Exception handler section used the Laravel 10 `App\Exceptions\Handler` class (does not exist in Laravel 11)
Laravel 11 removed `app/Exceptions/Handler.php`; exception customization happens via `->withExceptions(...)` in `bootstrap/app.php`. The post's code would target a non-existent class on a Laravel 11 install.

**Fix:** Replaced the `App\Exceptions\Handler` example with a `bootstrap/app.php` example using `$exceptions->render(...)` callbacks for `MissingScopeException` and `AuthenticationException`. Added a short closing line noting where to put the same logic in Laravel 10.

## Review Notes
- The `Token::can()`, `Token::revoke()`, `scopes` cast, `RefreshTokenRepository::revokeRefreshTokensByAccessTokenId`, `MissingScopeException::scopes()`, `Passport::actingAs($user, $scopes)`, `Passport::tokensCan`, `Passport::setDefaultScope`, `Passport::tokensExpireIn` (et al.) APIs were all verified against the Passport 12.x source and Laravel 11.x docs and are accurate as used.
- The `HasApiTokens` trait import (`Laravel\Passport\HasApiTokens`) is correct (and intentionally distinct from the Sanctum trait of the same name).
- Authorization Code Grant section shows the client-side flow against another Passport server — fine, but worth noting that for new third-party flows the post does not cover PKCE, which is the modern recommendation. Not changed because that is an additive recommendation, not a correction.
- Token lifetime methods (`Passport::tokensExpireIn`, etc.) accept `DateTimeInterface`, so `now()->addDays(15)` (a Carbon instance) is valid — matches the official docs.
- The password grant section still demonstrates the grant for completeness even though it is officially discouraged; the added note flags the deprecation without removing the educational content.
