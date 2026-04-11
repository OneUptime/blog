# How to Configure Laravel Cache with Redis Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Laravel, Cache, PHP, Performance

Description: Configure Laravel's cache layer to use Redis as the driver for fast, distributed caching with tags, TTLs, and atomic operations across multiple instances.

---

Laravel's cache facade works identically regardless of the backing driver. Switching to Redis adds distributed caching that is shared across all application servers, persistent across restarts, and significantly faster than file or database drivers.

## Install Predis or phpredis

```bash
composer require predis/predis
```

Or enable the `phpredis` PHP extension for better performance:

```bash
pecl install redis
```

## Configure the Redis Connection

`.env`:

```text
CACHE_STORE=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

`config/database.php` (Redis connections):

```php
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),
    'default' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', 6379),
        'database' => env('REDIS_DB', 0),
    ],
    'cache' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', 6379),
        'database' => env('REDIS_CACHE_DB', 1), // separate DB for cache
    ],
],
```

## Basic Cache Operations

```php
use Illuminate\Support\Facades\Cache;

// Store for 10 minutes
Cache::put('product:42', $product, 600);

// Store forever
Cache::forever('config:feature_flags', $flags);

// Get with default
$product = Cache::get('product:42', fn() => Product::find(42));

// Remember pattern (get or set)
$users = Cache::remember('active_users', 300, function () {
    return User::where('active', true)->get();
});

// Delete
Cache::forget('product:42');
```

## Cache Tags

Group related items for bulk invalidation:

```php
// Store with tags
Cache::tags(['products', 'category:electronics'])->put('product:42', $product, 600);

// Retrieve tagged item (use same tags as when stored)
$product = Cache::tags(['products', 'category:electronics'])->get('product:42');

// Invalidate all products at once
Cache::tags('products')->flush();
```

## Atomic Increment/Decrement

```php
Cache::increment('page_views:home');
Cache::increment('api:rate_limit:user:99', 1);
Cache::decrement('stock:product:42');
```

## Cache Lock for Concurrency Control

```php
$lock = Cache::lock('generate_report', 30);

if ($lock->get()) {
    try {
        $this->generateReport();
    } finally {
        $lock->release();
    }
} else {
    return response()->json(['error' => 'Report generation already in progress'], 409);
}
```

## Inspect Cache Keys

```bash
redis-cli -n 1 keys "laravel_cache_*"
redis-cli -n 1 ttl "laravel_cache_product:42"
redis-cli -n 1 get "laravel_cache_product:42"
```

## Summary

Laravel's Redis cache driver requires only `.env` changes to enable. Once configured, cache tags enable bulk invalidation of related data, atomic increment/decrement support counters without race conditions, and distributed locks prevent duplicate background work. Separating cache data to a dedicated Redis database (`REDIS_CACHE_DB`) keeps cache keys isolated from session and queue data.
