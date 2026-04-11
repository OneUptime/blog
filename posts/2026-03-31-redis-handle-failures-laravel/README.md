# How to Handle Redis Failures in Laravel Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Laravel, Resilience, Cache, PHP

Description: Learn strategies to gracefully handle Redis connection failures in Laravel so your app stays available when Redis goes down.

---

Redis is fast and reliable, but every external dependency can fail. If your Laravel app uses Redis for caching or sessions and Redis goes down, you need a plan that keeps your application running.

## Understand What Breaks Without Redis

In a typical Laravel app, Redis powers:

- The cache driver (`CACHE_DRIVER=redis`)
- The session driver (`SESSION_DRIVER=redis`)
- Queue connections (`QUEUE_CONNECTION=redis`)

If Redis is unavailable and you don't handle failures, requests that touch any of these will throw a `Predis\Connection\ConnectionException` or a similar error.

## Wrap Cache Calls in Try-Catch

The simplest defensive pattern is to catch Redis exceptions and fall back to hitting the database directly.

```php
use Illuminate\Support\Facades\Cache;
use Predis\Connection\ConnectionException;

function getProducts(): array
{
    try {
        return Cache::remember('products.all', 300, function () {
            return Product::all()->toArray();
        });
    } catch (ConnectionException $e) {
        logger()->error('Redis unavailable, falling back to DB', ['error' => $e->getMessage()]);
        return Product::all()->toArray();
    }
}
```

## Use a Fallback Cache Driver

Laravel lets you configure a fallback driver. Set your primary driver to Redis and your fallback to the database or array driver using a custom service provider.

```php
// config/cache.php
'default' => env('CACHE_DRIVER', 'redis'),

'stores' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'cache',
    ],
    'database' => [
        'driver' => 'database',
        'table'  => 'cache',
        'connection' => null,
    ],
],
```

Switch to the database store at runtime when Redis is unhealthy:

```php
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

function resolveCache()
{
    try {
        Redis::ping();
        return Cache::store('redis');
    } catch (\Exception $e) {
        return Cache::store('database');
    }
}
```

## Handle Queue Failures Gracefully

When Redis is down, queued jobs can't be dispatched. Use try-catch around dispatch calls and log failures so you can retry later.

```php
use App\Jobs\SendWelcomeEmail;

try {
    SendWelcomeEmail::dispatch($user);
} catch (\Exception $e) {
    logger()->critical('Queue unavailable', ['user' => $user->id, 'error' => $e->getMessage()]);
    // Optionally send the email synchronously as a last resort
    Mail::to($user->email)->send(new WelcomeEmail($user));
}
```

## Switch Session Driver on Failure

If Redis handles sessions, a failure will log out all users. Mitigate this by using database sessions as a fallback, or configure session redundancy with Redis Sentinel or Redis Cluster.

Redis Sentinel requires the Predis client and explicit configuration in `config/database.php`:

```php
// config/database.php
'redis' => [
    'client' => env('REDIS_CLIENT', 'predis'),

    'options' => [
        'replication' => 'sentinel',
        'service' => env('REDIS_SENTINEL_SERVICE', 'mymaster'),
    ],

    'default' => [
        [
            'host' => 'sentinel1',
            'port' => 26379,
        ],
        [
            'host' => 'sentinel2',
            'port' => 26379,
        ],
        [
            'host' => 'sentinel3',
            'port' => 26379,
        ],
    ],
],
```

## Implement a Health Check Endpoint

Add a health check route that tests Redis connectivity and alerts your monitoring system before failures cascade.

```php
// routes/web.php
Route::get('/health/redis', function () {
    try {
        Redis::ping();
        return response()->json(['redis' => 'ok']);
    } catch (\Exception $e) {
        return response()->json(['redis' => 'error', 'message' => $e->getMessage()], 503);
    }
});
```

Integrate this endpoint with OneUptime or another monitoring tool to receive alerts when Redis becomes unavailable.

## Summary

Handling Redis failures in Laravel requires defensive coding around cache, session, and queue operations. Wrap Redis calls in try-catch blocks, configure fallback cache drivers, and expose a health check endpoint so your monitoring system detects problems early. For high-availability requirements, use Redis Sentinel or Redis Cluster to eliminate single points of failure.
