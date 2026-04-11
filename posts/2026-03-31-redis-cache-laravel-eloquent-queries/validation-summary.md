# Validation Summary: How to Cache Laravel Eloquent Queries with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Laravel (Cache facade, Eloquent ORM, Model Observers)
- PHP
- Predis (PHP Redis client)
- Composer

## Sources Consulted
- Laravel Cache documentation: https://laravel.com/docs/11.x/cache
- Laravel Eloquent documentation: https://laravel.com/docs/11.x/eloquent
- Laravel Observers documentation: https://laravel.com/docs/11.x/eloquent#observers
- Predis GitHub repository: https://github.com/predis/predis
- Laravel Redis documentation: https://laravel.com/docs/11.x/redis

## Issues Found
No technical issues found.

## Review Notes
- In Laravel 11+, the environment variable `CACHE_DRIVER` was renamed to `CACHE_STORE`. The post uses `CACHE_DRIVER`, which still works due to backwards compatibility in Laravel's `config/cache.php`, but readers on Laravel 11+ may want to use `CACHE_STORE=redis` instead.
- The dynamic keys example caches a `LengthAwarePaginator` object returned by `paginate()`. This is technically valid since the paginator is serializable, but some developers prefer caching only the raw query results and reconstructing the paginator afterward to avoid serializing request-specific data (like URL paths) embedded in the paginator.
- The observer only invalidates `page.1` of the category cache on save. In a real application, you would likely need to invalidate all pages for that category, which is where cache tags (shown in the next section) become useful. This is a simplification for demonstration purposes, not an error.
