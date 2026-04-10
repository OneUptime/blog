# How to Use Redis Sentinel with PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, Sentinel, High Availability, Failover

Description: Learn how to connect PHP applications to Redis Sentinel for automatic failover and high availability using Predis and phpredis.

---

Redis Sentinel monitors Redis instances and automatically promotes a replica to primary when the primary fails. PHP clients that support Sentinel can connect transparently through this failover process.

## How Sentinel Works

Sentinel processes monitor your Redis primary and replicas. When the primary becomes unreachable, Sentinels vote and elect a new primary. Your application connects to Sentinel nodes rather than directly to Redis, and Sentinel tells the client which host is currently the primary.

## Setting Up a Sentinel Connection with Predis

Predis has native Sentinel support:

```php
use Predis\Client;

$client = new Client(
    [
        ['host' => '127.0.0.1', 'port' => 26379],
        ['host' => '127.0.0.1', 'port' => 26380],
        ['host' => '127.0.0.1', 'port' => 26381],
    ],
    [
        'replication' => 'sentinel',
        'service'     => 'mymaster', // name configured in sentinel.conf
    ]
);

// Automatic failover handled by Predis
$client->set('key', 'value');
echo $client->get('key'); // value
```

## Sentinel Configuration Reference

Your `sentinel.conf` should look like:

```text
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1
```

## Connecting with phpredis

phpredis provides the `RedisSentinel` class for Sentinel operations. Unlike Predis, the `Redis` class does not handle Sentinel discovery automatically, so you resolve the primary address before connecting:

```php
function getSentinelPrimary(array $sentinels, string $masterName): array
{
    foreach ($sentinels as [$host, $port]) {
        try {
            $sentinel = new RedisSentinel($host, $port, 1.0);
            $info = $sentinel->getMasterAddrByName($masterName);
            if ($info !== false) {
                return $info; // [$primaryHost, $primaryPort]
            }
        } catch (RedisException $e) {
            continue; // try next sentinel
        }
    }
    throw new \RuntimeException("No Sentinel available for master: $masterName");
}

$sentinels = [
    ['127.0.0.1', 26379],
    ['127.0.0.1', 26380],
    ['127.0.0.1', 26381],
];

[$primaryHost, $primaryPort] = getSentinelPrimary($sentinels, 'mymaster');

$redis = new Redis();
$redis->connect($primaryHost, (int) $primaryPort);
```

## Handling Failover Transparently with phpredis

Wrap commands in a function that reconnects on failure:

```php
function executeWithReconnect(array $sentinels, string $masterName, callable $fn): mixed
{
    static $redis = null;

    $connect = function () use ($sentinels, $masterName, &$redis) {
        [$host, $port] = getSentinelPrimary($sentinels, $masterName);
        $redis = new Redis();
        $redis->connect($host, (int) $port, 2.0);
    };

    if ($redis === null) $connect();

    try {
        return $fn($redis);
    } catch (RedisException $e) {
        // Primary may have changed - reconnect once
        $connect();
        return $fn($redis);
    }
}

$value = executeWithReconnect($sentinels, 'mymaster', function (Redis $r) {
    return $r->get('mykey');
});
```

## Read Scaling with Replicas

```php
// Predis can route read commands to replicas automatically
$client = new Client(
    [
        ['host' => '127.0.0.1', 'port' => 26379],
    ],
    [
        'replication' => 'sentinel',
        'service'     => 'mymaster',
    ]
);

// Read-only commands go to replica, writes go to primary
$value = $client->get('readonly-key');
$client->set('writable-key', 'value');
```

## Health Check

```php
function isSentinelHealthy(string $host, int $port): bool
{
    $s = new Redis();
    try {
        $s->connect($host, $port, 1.0);
        return $s->ping() === true;
    } catch (RedisException $e) {
        return false;
    }
}
```

## Summary

Redis Sentinel provides automatic failover for PHP applications. Predis offers the simplest integration with a built-in replication driver, while phpredis requires a manual Sentinel lookup step. In both cases, the client resolves the current primary through Sentinel nodes, ensuring your app reconnects seamlessly after a failover event.
