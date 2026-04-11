# How to Use Redis with CodeIgniter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CodeIgniter, PHP, Caching, Session

Description: Learn how to configure Redis with CodeIgniter for caching and session storage using the built-in Cache library and Predis with practical examples.

---

CodeIgniter is a lightweight PHP framework known for its small footprint and ease of use. Its built-in Cache library supports Redis as a backend, making it straightforward to replace in-memory or file caching with a fast, shared Redis store.

## Installing Dependencies

```bash
composer require predis/predis
```

CodeIgniter's Redis cache driver uses the native PHP Redis extension by default. You can also use Predis. Ensure one is available:

```bash
# Check PHP Redis extension
php -m | grep redis

# Or install the extension
sudo apt-get install php-redis
```

## Configuring Redis as the Cache Driver

Edit `app/Config/Cache.php`:

```php
<?php
// app/Config/Cache.php
namespace Config;

use CodeIgniter\Config\BaseConfig;

class Cache extends BaseConfig
{
    public string $handler = 'redis';
    public string $backupHandler = 'file';
    public int $ttl = 60;
    public string $prefix = 'myapp_';

    public array $redis = [
        'host'     => '127.0.0.1',
        'password' => null,
        'port'     => 6379,
        'timeout'  => 0,
        'database' => 0,
    ];
}
```

## Caching in Controllers

Use the `cache()` helper for quick access to the Cache service.

```php
<?php
// app/Controllers/Products.php
namespace App\Controllers;

use CodeIgniter\Controller;

class Products extends Controller
{
    public function index()
    {
        $cache = \Config\Services::cache();
        $products = $cache->get('all_products');

        if ($products === null) {
            // Simulate database fetch
            $products = [['id' => 1, 'name' => 'Widget']];
            $cache->save('all_products', $products, 120); // 2-minute TTL
        }

        return $this->response->setJSON($products);
    }

    public function invalidate()
    {
        $cache = \Config\Services::cache();
        $cache->delete('all_products');
        return $this->response->setJSON(['message' => 'Cache cleared']);
    }
}
```

## Session Storage with Redis

Configure sessions to use Redis in `app/Config/Session.php`:

```php
<?php
// app/Config/Session.php
namespace Config;

use CodeIgniter\Config\BaseConfig;

class Session extends BaseConfig
{
    public string $driver = \CodeIgniter\Session\Handlers\RedisHandler::class;
    public string $cookieName = 'ci_session';
    public int $expiration = 7200;
    public string $savePath = 'tcp://127.0.0.1:6379';
    public bool $matchIP = false;
    public int $timeToUpdate = 300;
    public bool $regenerateDestroy = false;
}
```

## Rate Limiting with Direct Redis

For low-level Redis operations, use Predis directly.

```php
<?php
// app/Libraries/RateLimiter.php
namespace App\Libraries;

use Predis\Client;

class RateLimiter
{
    private Client $redis;
    private int $limit = 100;
    private int $window = 60; // seconds

    public function __construct()
    {
        $this->redis = new Client([
            'host' => '127.0.0.1',
            'port' => 6379,
        ]);
    }

    public function isAllowed(string $identifier): bool
    {
        $key = "ratelimit:{$identifier}";
        $count = $this->redis->incr($key);
        if ((int)$count === 1) {
            $this->redis->expire($key, $this->window);
        }
        return $count <= $this->limit;
    }
}
```

## Cache Prefix Best Practices

Use meaningful prefixes to group related keys and avoid collisions in shared Redis instances.

```php
$cache->save('products:list', $data, 120);
$cache->save('products:detail:' . $id, $product, 300);
$cache->deleteMatching('products:*');
```

## Summary

CodeIgniter integrates with Redis through its built-in `RedisHandler` for the Cache and Session libraries. Configure the Redis connection in `Config/Cache.php` and set the session driver to `RedisHandler` in `Config/Session.php` for shared session state across multiple servers.
