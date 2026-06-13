# Validation Summary: How to Build a REST API with Laravel

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Laravel 11
- PHP 8.2
- Composer
- Laravel Sanctum
- Eloquent ORM
- Laravel migrations, factories, seeders, API resources, validation, routing, rate limiting, and feature tests
- MySQL and SQLite
- cURL

## Sources Consulted
- Laravel 11 Installation documentation: https://laravel.com/docs/11.x/installation
- Laravel 11 Routing documentation: https://laravel.com/docs/11.x/routing
- Laravel 11 Sanctum documentation: https://laravel.com/docs/11.x/sanctum
- Laravel 11 Eloquent API Resources documentation: https://laravel.com/docs/11.x/eloquent-resources
- Laravel 11 Validation documentation: https://laravel.com/docs/11.x/validation
- Laravel 11 Migrations documentation: https://laravel.com/docs/11.x/migrations
- Laravel 11 skeleton User model: https://raw.githubusercontent.com/laravel/laravel/11.x/app/Models/User.php
- Laravel 11 skeleton composer.json: https://raw.githubusercontent.com/laravel/laravel/11.x/composer.json

## Issues Found
- The project creation command did not constrain the Laravel version, so it would install the current Laravel skeleton rather than necessarily Laravel 11. Changed it to `composer create-project laravel/laravel:^11.0 book-api`.
- Laravel 11 does not create `routes/api.php` in a fresh skeleton by default. Added `php artisan install:api` during setup and clarified that this command creates API routing and installs Sanctum.
- The Sanctum setup section incorrectly said Sanctum is included in Laravel 11 and only required vendor publishing. Replaced that with the official `php artisan install:api` command.
- The post claimed the default Laravel 11 User model already includes `HasApiTokens`. The Laravel 11 skeleton does not include that trait by default, so the text now instructs readers to add it.
- The book index sorting code accepted any `direction` value. Added an allowed direction list so invalid input is not passed to `orderBy`.

## Review Notes
The remaining examples are consistent with Laravel 11 APIs and conventions. The tutorial could be improved in the future by adding request validation for list filters such as `status`, `per_page`, and price bounds, but the current examples are technically valid after the fixes above.
