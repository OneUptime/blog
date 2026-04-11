# How to Use Redis with Symfony in PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Symfony, PHP, Caching, Session

Description: Learn how to integrate Redis with Symfony in PHP for caching, session storage, and queued jobs using Symfony Cache and Messenger components.

---

Symfony provides first-class support for Redis through its Cache, Session, and Messenger components. This guide covers how to configure Redis in Symfony for caching responses, storing sessions, and dispatching background messages.

## Installing Dependencies

```bash
composer require symfony/cache symfony/messenger predis/predis
```

## Configuring Redis in services.yaml

```yaml
# config/services.yaml
services:
  Redis:
    class: Redis
    calls:
      - connect:
          - '%env(REDIS_HOST)%'
          - '%env(int:REDIS_PORT)%'
```

## Cache Component with Redis

Symfony's Cache component wraps Redis through a `RedisAdapter`.

```yaml
# config/packages/cache.yaml
framework:
  cache:
    default_redis_provider: 'redis://%env(REDIS_HOST)%:%env(REDIS_PORT)%'
    pools:
      app.cache.products:
        adapter: cache.adapter.redis
        default_lifetime: 120
```

Use the cache pool in a controller:

```php
<?php
// src/Controller/ProductController.php
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Component\HttpFoundation\JsonResponse;

class ProductController
{
    public function __construct(private CacheInterface $appCacheProducts) {}

    public function list(): JsonResponse
    {
        $products = $this->appCacheProducts->get('all_products', function (ItemInterface $item) {
            $item->expiresAfter(120);
            // Simulate DB fetch
            return [['id' => 1, 'name' => 'Widget']];
        });

        return new JsonResponse($products);
    }
}
```

## Session Storage with Redis

```yaml
# config/packages/framework.yaml
framework:
  session:
    handler_id: 'redis://%env(REDIS_HOST)%:%env(REDIS_PORT)%'
    cookie_secure: true
    cookie_httponly: true
    gc_maxlifetime: 86400
```

## Messenger Transport with Redis

Symfony Messenger supports Redis as a transport for background jobs.

```yaml
# config/packages/messenger.yaml
framework:
  messenger:
    transports:
      async:
        dsn: 'redis://%env(REDIS_HOST)%:%env(REDIS_PORT)%/messages'
        options:
          auto_setup: true
    routing:
      'App\Message\SendEmail': async
```

Dispatch a message:

```php
<?php
use App\Message\SendEmail;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Messenger\MessageBusInterface;

class EmailController
{
    public function __construct(private MessageBusInterface $bus) {}

    public function send(): JsonResponse
    {
        $this->bus->dispatch(new SendEmail('user@example.com'));
        return new JsonResponse(['queued' => true]);
    }
}
```

Consume the queue:

```bash
php bin/console messenger:consume async --limit=50
```

## Manual Redis Operations

For direct Redis access, inject the configured Redis service.

```php
<?php
use Predis\Client;
use Symfony\Component\HttpFoundation\JsonResponse;

class StatsController
{
    public function __construct(private Client $redis) {}

    public function increment(string $event): JsonResponse
    {
        $count = $this->redis->incr("stats:{$event}");
        return new JsonResponse(['count' => $count]);
    }
}
```

## Summary

Symfony integrates with Redis through the Cache component for TTL-based caching, framework session configuration for persistent sessions, and the Messenger transport for async job queuing. Use Predis or the native PHP Redis extension for direct key operations when you need low-level control.
