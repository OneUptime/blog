# How to Use Redis Cluster with PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, Cluster, Scaling, phpredis

Description: Learn how to connect to and use Redis Cluster in PHP with both phpredis and Predis, including slot routing, multi-key operations, and error handling.

---

Redis Cluster distributes data across multiple nodes using hash slots, enabling horizontal scaling beyond a single Redis instance. PHP clients handle slot routing automatically, but there are important limitations to understand.

## Connecting with phpredis

```php
$redis = new RedisCluster(null, [
    '127.0.0.1:7000',
    '127.0.0.1:7001',
    '127.0.0.1:7002',
], 1.5, 1.5, true); // timeout, read timeout, persistent
```

## Connecting with Predis

```php
use Predis\Client;

$client = new Client([
    ['host' => '127.0.0.1', 'port' => 7000],
    ['host' => '127.0.0.1', 'port' => 7001],
    ['host' => '127.0.0.1', 'port' => 7002],
], [
    'cluster' => 'redis',
]);
```

## Basic Operations

Standard single-key operations work the same as with a standalone Redis instance:

```php
$redis->set('user:1', 'alice');
$redis->set('user:2', 'bob');

echo $redis->get('user:1'); // alice
$redis->incr('page_views');
$redis->expire('session:abc', 3600);
```

## Multi-Key Operations and Hash Tags

Multi-key commands like MGET, MSET, and KEYS only work when all keys map to the same slot. Use hash tags `{}` to force keys to the same slot:

```php
// This will FAIL in cluster mode - keys may be on different nodes
// $redis->mSet(['key1' => 'a', 'key2' => 'b']); // ERROR

// Use hash tags to ensure same slot
$redis->mSet([
    '{user:1}:name'  => 'Alice',
    '{user:1}:email' => 'alice@example.com',
]);

$values = $redis->mGet(['{user:1}:name', '{user:1}:email']);
print_r($values);
```

## Handling MOVED and ASK Redirections

phpredis and Predis handle MOVED redirections automatically. You do not need to manage slot routing manually:

```php
try {
    $redis->set('mykey', 'value');
} catch (RedisClusterException $e) {
    error_log("Cluster error: " . $e->getMessage());
}
```

## Failover and Read from Replicas

```php
// Read from replica nodes to distribute read load
$redis = new RedisCluster(null, [
    '127.0.0.1:7000',
    '127.0.0.1:7001',
    '127.0.0.1:7002',
]);

// Set read preference to replica
$redis->setOption(RedisCluster::OPT_SLAVE_FAILOVER, RedisCluster::FAILOVER_DISTRIBUTE_SLAVES);
```

## Scanning Keys in Cluster Mode

In cluster mode, SCAN must run on each node separately:

```php
$nodes = $redis->_masters();
foreach ($nodes as $node) {
    $cursor = null;
    do {
        $keys = $redis->scan($cursor, $node, 'user:*', 100);
        if ($keys !== false) {
            foreach ($keys as $key) {
                echo $key . PHP_EOL;
            }
        }
    } while ($cursor > 0);
}
```

## Pipelining in Cluster Mode

Pipelining with cluster is supported but pipelines are split by slot:

```php
// With Predis - pipelines are split automatically by key hash
$client->pipeline(function ($pipe) {
    $pipe->set('{session}:user1', 'alice');
    $pipe->set('{session}:user2', 'bob');
    $pipe->get('{session}:user1');
});
```

## Cluster Information

```php
// Get cluster nodes info
$masters = $redis->_masters();
foreach ($masters as $host) {
    echo implode(':', $host) . PHP_EOL;
}
```

## Summary

PHP applications can connect to Redis Cluster with minimal code changes using phpredis or Predis. The main adjustment is using hash tags for multi-key operations to ensure related keys land on the same slot. Both clients handle slot routing and MOVED redirections automatically, making cluster adoption straightforward.
