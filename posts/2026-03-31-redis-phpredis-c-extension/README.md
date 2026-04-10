# How to Use phpredis C Extension for High Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, phpredis, Performance, Extension

Description: Learn how to install and use the phpredis C extension for high-performance Redis access in PHP, including connection setup, commands, and serialization options.

---

phpredis is a PHP extension written in C that provides a low-level interface to Redis. Because it runs as a compiled extension rather than pure PHP, it is significantly faster than Predis for high-throughput workloads.

## Installation

On Ubuntu/Debian:

```bash
sudo apt-get install php-redis
```

Using PECL:

```bash
pecl install redis
echo "extension=redis.so" >> /etc/php/8.2/cli/php.ini
```

Verify the installation:

```bash
php -m | grep redis
```

## Connecting to Redis

```php
<?php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

// With authentication
$redis->auth('your-password');

// Persistent connection (reused across requests)
$redis->pconnect('127.0.0.1', 6379);
```

## Basic Commands

```php
// String operations
$redis->set('user:1', 'alice');
$redis->setex('session:abc', 3600, json_encode(['uid' => 1]));
$value = $redis->get('user:1');

// Increment
$redis->incr('page_views');
$redis->incrBy('cart:total', 5);

// Check existence and delete
$redis->exists('user:1');
$redis->del('user:1');
```

## Configuring Serialization

phpredis supports built-in serialization, removing the need for manual `json_encode`/`json_decode`:

```php
$redis->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_JSON);

$redis->set('product:1', ['name' => 'Laptop', 'price' => 999]);
$product = $redis->get('product:1');
echo $product['name']; // Laptop
```

Other serializers: `Redis::SERIALIZER_PHP`, `Redis::SERIALIZER_IGBINARY`.

## Setting Prefix for All Keys

```php
$redis->setOption(Redis::OPT_PREFIX, 'myapp:');
// All keys will be prefixed: myapp:user:1
$redis->set('user:1', 'alice');
```

## Working with Hashes

```php
$redis->hSet('user:profile:1', 'name', 'Alice');
$redis->hSet('user:profile:1', 'email', 'alice@example.com');
$redis->hMSet('user:profile:1', ['name' => 'Alice', 'age' => '30']);

$name = $redis->hGet('user:profile:1', 'name');
$all = $redis->hGetAll('user:profile:1');
```

## Pipeline for Batching Commands

```php
$pipe = $redis->pipeline();
$pipe->set('key1', 'val1');
$pipe->set('key2', 'val2');
$pipe->get('key1');
$results = $pipe->exec();
// $results[2] === 'val1'
```

## Compression

Enable LZF compression to reduce memory usage:

```php
$redis->setOption(Redis::OPT_COMPRESSION, Redis::COMPRESSION_LZF);
```

## Scanning Keys Safely

Use `SCAN` instead of `KEYS` in production to avoid blocking:

```php
$iterator = null;
do {
    $keys = $redis->scan($iterator, 'user:*', 100);
    if ($keys !== false) {
        foreach ($keys as $key) {
            echo $key . PHP_EOL;
        }
    }
} while ($iterator != 0);
```

## Summary

phpredis delivers top-tier Redis performance in PHP through its C extension architecture. Built-in serialization, compression, and pipelining support make it an excellent choice for high-traffic applications that need to squeeze every millisecond out of Redis operations.
