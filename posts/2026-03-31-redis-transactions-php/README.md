# How to Use Redis Transactions in PHP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, Transaction, MULTI, EXEC

Description: Learn how to use Redis MULTI/EXEC transactions in PHP with Predis and phpredis to execute groups of commands atomically.

---

Redis transactions group multiple commands so they execute as a single isolated unit - no other client's commands will be interleaved between them. In PHP you use MULTI/EXEC blocks with either Predis or phpredis.

## MULTI/EXEC with Predis

```php
use Predis\Client;

$client = new Client();

$results = $client->transaction(function ($tx) {
    $tx->set('balance:user:1', 100);
    $tx->set('balance:user:2', 200);
    $tx->decrBy('balance:user:1', 50);
    $tx->incrBy('balance:user:2', 50);
});

// Results: [Status("OK"), Status("OK"), 50, 250]
// SET results are Predis\Response\Status objects (castable to string "OK")
print_r($results);
```

## MULTI/EXEC with phpredis

```php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$redis->multi();
$redis->set('balance:user:1', 100);
$redis->set('balance:user:2', 200);
$redis->decrBy('balance:user:1', 50);
$redis->incrBy('balance:user:2', 50);
$results = $redis->exec();

print_r($results);
// [true, true, 50, 250]
```

## Optimistic Locking with WATCH

WATCH lets you monitor keys and abort the transaction if any watched key changes before EXEC:

```php
$redis->watch('balance:user:1');

$current = (int) $redis->get('balance:user:1');

if ($current < 50) {
    $redis->unwatch();
    throw new \RuntimeException('Insufficient funds');
}

$redis->multi();
$redis->decrBy('balance:user:1', 50);
$redis->incrBy('balance:user:2', 50);
$results = $redis->exec();

if ($results === false) {
    // Another client modified balance:user:1 - retry
    echo "Transaction aborted, retry needed\n";
}
```

## Retry Pattern for WATCH Conflicts

```php
function transfer(Redis $redis, string $from, string $to, int $amount): bool
{
    $retries = 3;
    while ($retries-- > 0) {
        $redis->watch($from);
        $balance = (int) $redis->get($from);

        if ($balance < $amount) {
            $redis->unwatch();
            return false;
        }

        $redis->multi();
        $redis->decrBy($from, $amount);
        $redis->incrBy($to, $amount);
        $result = $redis->exec();

        if ($result !== false) {
            return true; // success
        }
        // Transaction was aborted - retry
    }
    return false;
}
```

## Discarding a Transaction

```php
$redis->multi();
$redis->set('key', 'value');
// Changed mind - abort
$redis->discard();
```

## What Transactions Do NOT Do

Redis transactions do not roll back on errors. If a command fails after EXEC has started (for example, calling INCR on a non-numeric value), the other commands still execute. DISCARD only works before EXEC.

```php
$redis->multi();
$redis->set('key', 'hello');
$redis->incr('key');   // Will fail at exec time - key is not numeric
$redis->set('other', 'ok');
$results = $redis->exec();
// $results[0] = true (set succeeded)
// $results[1] = false (incr failed)
// $results[2] = true (set succeeded despite error at index 1)
```

## Summary

Redis MULTI/EXEC transactions in PHP guarantee that commands execute without interruption from other clients. Use WATCH for optimistic locking when you need to read a value and then conditionally update it. Remember that Redis does not roll back commands that fail mid-transaction.
