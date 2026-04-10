# How to Use Redis Pipelining in PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, Pipelining, Performance, Predis

Description: Learn how to use Redis pipelining in PHP with both Predis and phpredis to batch multiple commands and reduce round-trip latency.

---

Every Redis command in PHP normally requires a round-trip to the server. Pipelining buffers multiple commands and sends them in one batch, dramatically improving throughput when you need to execute many commands at once.

## Pipelining with Predis

```php
use Predis\Client;

$client = new Client();

// Without pipeline: 3 round-trips
$client->set('key1', 'val1');
$client->set('key2', 'val2');
$client->set('key3', 'val3');

// With pipeline: 1 round-trip
$results = $client->pipeline(function ($pipe) {
    $pipe->set('key1', 'val1');
    $pipe->set('key2', 'val2');
    $pipe->set('key3', 'val3');
    $pipe->get('key1');
    $pipe->get('key2');
});

// $results[3] === 'val1'
// $results[4] === 'val2'
echo $results[3]; // val1
```

## Pipelining with phpredis

```php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$pipe = $redis->pipeline();
$pipe->set('counter', 0);
$pipe->incr('counter');
$pipe->incr('counter');
$pipe->incr('counter');
$pipe->get('counter');
$results = $pipe->exec();

echo $results[4]; // 3
```

## Batch Loading Data

Pipelining is ideal for bulk imports. Here is an example loading product data:

```php
function batchInsertProducts(Redis $redis, array $products): void
{
    $chunkSize = 500;
    $chunks = array_chunk($products, $chunkSize);

    foreach ($chunks as $chunk) {
        $pipe = $redis->pipeline();
        foreach ($chunk as $product) {
            $key = "product:{$product['id']}";
            $pipe->hMSet($key, $product);
            $pipe->expire($key, 86400);
        }
        $pipe->exec();
    }
}

$products = [
    ['id' => 1, 'name' => 'Laptop', 'price' => '999'],
    ['id' => 2, 'name' => 'Mouse',  'price' => '29'],
    // ...thousands more
];

batchInsertProducts($redis, $products);
```

## Collecting Pipeline Results

Each command result corresponds to its position in the pipeline:

```php
$pipe = $redis->pipeline();
$pipe->set('a', 'hello');  // index 0: OK
$pipe->set('b', 'world');  // index 1: OK
$pipe->get('a');            // index 2: 'hello'
$pipe->strlen('b');         // index 3: 5
$pipe->del('a', 'b');       // index 4: 2 (keys deleted)
$results = $pipe->exec();

[$setA, $setB, $getA, $lenB, $delCount] = $results;
echo $getA;    // hello
echo $lenB;    // 5
echo $delCount; // 2
```

## Performance Comparison

```text
1000 individual SET commands:  ~120ms
1000 pipelined SET commands:   ~4ms
```

The speedup is especially dramatic when Redis is on a remote host with high network latency.

## When NOT to Pipeline

- When you need the result of one command before issuing the next
- When using MULTI/EXEC transactions (use transactions instead)
- When commands must be executed atomically

## Summary

Redis pipelining in PHP reduces the number of network round-trips by batching commands. Both Predis and phpredis support it with a simple pipeline block. For bulk operations or any scenario where you issue many independent commands, pipelining delivers a 10-30x throughput improvement.
