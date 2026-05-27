# Validation Summary: How to Build REST APIs with Laravel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP
- Laravel
- Laravel routing
- Eloquent ORM
- Laravel migrations
- Form Request validation
- API Resources
- Laravel Sanctum

## Sources Consulted
- Laravel 12.x Routing documentation: https://laravel.com/docs/12.x/routing
- Laravel 12.x Eloquent documentation: https://laravel.com/docs/12.x/eloquent
- Laravel 12.x Eloquent Relationships documentation: https://laravel.com/docs/12.x/eloquent-relationships
- Laravel 12.x Eloquent API Resources documentation: https://laravel.com/docs/12.x/eloquent-resources
- Laravel 12.x Validation documentation: https://laravel.com/docs/12.x/validation
- Laravel 12.x Migrations documentation: https://laravel.com/docs/12.x/migrations
- Laravel 12.x Sanctum documentation: https://laravel.com/docs/12.x/sanctum

## Issues Found
- Current Laravel applications enable API routing with `php artisan install:api`, which also installs Sanctum and creates `routes/api.php`. Added this command before `php artisan migrate` and updated the route explanation so the setup works for current Laravel skeletons.
- The controller imported and returned a custom `PostCollection` class, but the guide did not create that class. Replaced it with `PostResource::collection(...)` and the correct `AnonymousResourceCollection` return type, matching Laravel's documented API resource collection pattern.
- The routes referenced `AuthController::profile` and `AuthController::logout`, but the `AuthController` example did not implement those methods. Added both methods, including current-token revocation for logout.
- The Sanctum token examples require the `User` model to use the `Laravel\Sanctum\HasApiTokens` trait. Added a note before the authentication controller snippet.

## Review Notes
The post is technically valid after the fixes. Future improvements could include showing the companion `UpdatePostRequest`, `UserResource`, `CommentResource`, `Comment` model, and authorization policy classes if the article is expanded into a fully runnable end-to-end project.
