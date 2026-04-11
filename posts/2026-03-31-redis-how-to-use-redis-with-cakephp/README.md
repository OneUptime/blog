# How to Use Redis with CakePHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CakePHP, PHP, Caching, Session

Description: Learn how to configure Redis with CakePHP for caching, sessions, and queue management using the built-in Cache engine and practical examples.

---

CakePHP has built-in support for Redis through its `Cache` and `Session` components. By swapping the default cache engine to Redis, you gain fast in-memory storage that scales across multiple application servers. This guide covers setup, caching, and sessions.

## Installing Dependencies

CakePHP's built-in `RedisEngine` requires the phpredis PHP extension:

```bash
pecl install redis
```

Make sure the extension is enabled in your `php.ini`:

```ini
extension=redis
```

If you also want to use Predis for manual Redis operations (shown later), install it via Composer:

```bash
composer require predis/predis
```

## Configuring Redis Cache Engine

Add a Redis cache configuration in `config/app.php`.

```php
// config/app.php
'Cache' => [
    'default' => [
        'className' => \Cake\Cache\Engine\RedisEngine::class,
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'port' => env('REDIS_PORT', 6379),
        'password' => env('REDIS_PASSWORD', false),
        'database' => 0,
        'duration' => '+2 minutes',
        'prefix' => 'myapp_',
    ],
    'long_term' => [
        'className' => \Cake\Cache\Engine\RedisEngine::class,
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'port' => env('REDIS_PORT', 6379),
        'duration' => '+1 day',
        'prefix' => 'myapp_lt_',
    ],
],
```

## Caching in Controllers

Use the `Cache` facade to read and write from Redis.

```php
<?php
// src/Controller/ProductsController.php
use Cake\Cache\Cache;

class ProductsController extends AppController
{
    public function index()
    {
        $products = Cache::remember('all_products', function () {
            return $this->Products->find('all')->toArray();
        }, 'default');

        $this->set(compact('products'));
        $this->viewBuilder()->setOption('serialize', ['products']);
    }

    public function clearCache()
    {
        Cache::delete('all_products', 'default');
        return $this->response->withStringBody('Cache cleared');
    }
}
```

## Model-Level Query Caching

CakePHP supports query-level result caching.

```php
// src/Model/Table/ProductsTable.php
public function findCachedAll(Query $query, array $options): Query
{
    return $query->cache('products_table_cache', 'default');
}
```

## Session Storage with Redis

Configure sessions to use Redis in `config/app.php`.

```php
'Session' => [
    'defaults' => 'cache',
    'handler' => [
        'config' => 'default',
    ],
    'cookie' => 'myapp_session',
    'timeout' => 1440,
],
```

## Manual Redis Operations with Predis

For operations outside of CakePHP's cache layer, use Predis directly.

```php
<?php
use Predis\Client;

class RateLimiterComponent extends Component
{
    private Client $redis;

    public function initialize(array $config): void
    {
        $this->redis = new Client([
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => env('REDIS_PORT', 6379),
        ]);
    }

    public function check(string $userId): bool
    {
        $key = "ratelimit:{$userId}";
        $count = $this->redis->incr($key);
        if ($count === 1) {
            $this->redis->expire($key, 60);
        }
        return $count <= 50;
    }
}
```

## Summary

CakePHP integrates with Redis through the built-in `RedisEngine` cache class, which requires only configuration changes in `app.php`. Use `Cache::remember()` for automatic read-through caching and configure the `CacheSession` handler to store sessions in Redis for multi-server deployments.
