# How to Handle Redis Connection Errors in PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, Error Handling, Reliability, Predis

Description: Learn how to handle Redis connection failures, timeouts, and reconnection in PHP using Predis and phpredis with retry logic and fallback strategies.

---

Redis is often a critical dependency in PHP applications. Handling connection errors gracefully prevents cascading failures and keeps your app running when Redis is temporarily unavailable.

## Connection Errors with phpredis

phpredis throws a `RedisException` on connection failure. Enable exception mode and wrap connections:

```php
$redis = new Redis();

try {
    $result = $redis->connect('127.0.0.1', 6379, 2.0); // 2 second timeout
    if (!$result) {
        throw new \RuntimeException('Redis connect returned false');
    }
} catch (RedisException $e) {
    error_log("Redis connection failed: " . $e->getMessage());
    // Fall back to database or return null
}
```

## Handling Command Errors in phpredis

phpredis throws `RedisException` by default on connection and communication errors. Wrap commands in try-catch blocks:

```php
try {
    $redis->get('key');
} catch (RedisException $e) {
    // handle any command error
    error_log($e->getMessage());
}
```

## Retry Logic with Exponential Backoff

```php
function connectWithRetry(string $host, int $port, int $maxRetries = 3): Redis
{
    $redis = new Redis();
    $delay = 100; // ms

    for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
        try {
            $redis->connect($host, $port, 2.0);
            return $redis;
        } catch (RedisException $e) {
            if ($attempt === $maxRetries) {
                throw new \RuntimeException(
                    "Redis unavailable after {$maxRetries} attempts: " . $e->getMessage()
                );
            }
            error_log("Redis attempt $attempt failed. Retrying in {$delay}ms...");
            usleep($delay * 1000);
            $delay *= 2; // exponential backoff
        }
    }

    throw new \RuntimeException('Unreachable');
}
```

## Connection Errors with Predis

```php
use Predis\Client;
use Predis\Connection\ConnectionException;

$client = new Client([
    'host'               => '127.0.0.1',
    'port'               => 6379,
    'read_write_timeout' => 5,
]);

try {
    $client->ping();
} catch (ConnectionException $e) {
    error_log("Predis connection error: " . $e->getMessage());
}
```

## Circuit Breaker Pattern

```php
class RedisCircuitBreaker
{
    private int $failures = 0;
    private int $threshold = 5;
    private ?float $openedAt = null;
    private float $resetTimeout = 30.0;

    public function isOpen(): bool
    {
        if ($this->openedAt === null) return false;

        if (microtime(true) - $this->openedAt > $this->resetTimeout) {
            // Half-open: try again
            $this->openedAt = null;
            $this->failures = 0;
            return false;
        }

        return true;
    }

    public function recordFailure(): void
    {
        $this->failures++;
        if ($this->failures >= $this->threshold) {
            $this->openedAt = microtime(true);
        }
    }

    public function recordSuccess(): void
    {
        $this->failures = 0;
        $this->openedAt = null;
    }
}
```

## Graceful Degradation

```php
function getCached(Redis $redis, string $key, callable $fallback): mixed
{
    try {
        $value = $redis->get($key);
        if ($value !== false) {
            return json_decode($value, true);
        }
    } catch (RedisException $e) {
        error_log("Redis unavailable for key $key: " . $e->getMessage());
        // Fall through to source of truth
    }

    $data = $fallback();

    try {
        $redis->setex($key, 300, json_encode($data));
    } catch (RedisException $e) {
        // Ignore write failure - just return the live data
    }

    return $data;
}
```

## Health Check Endpoint

```php
function checkRedisHealth(Redis $redis): bool
{
    try {
        return $redis->ping() === true;
    } catch (RedisException $e) {
        return false;
    }
}
```

## Summary

Handling Redis connection errors in PHP requires catching `RedisException` and implementing retry or fallback logic. Graceful degradation - falling through to your database when Redis is down - keeps your application functional during Redis outages. Use circuit breakers for high-traffic systems to avoid hammering a failing Redis instance.
