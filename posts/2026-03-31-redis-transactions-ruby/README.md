# How to Use Redis Transactions in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, Transaction, MULTI, EXEC

Description: Learn how to use Redis MULTI/EXEC transactions and WATCH-based optimistic locking in Ruby with redis-rb for atomic command execution.

---

Redis transactions group commands so they execute atomically without interference from other clients. In Ruby, redis-rb provides a `multi` block and `watch` method for both basic transactions and optimistic locking.

## Basic MULTI/EXEC Transaction

```ruby
require 'redis'

redis = Redis.new

results = redis.multi do |tx|
  tx.set('balance:alice', 500)
  tx.set('balance:bob',   300)
  tx.decrby('balance:alice', 100)
  tx.incrby('balance:bob',   100)
end

p results
# ["OK", "OK", 400, 400]
```

All commands inside `multi` are queued and executed together. No other client can interleave between them.

## Optimistic Locking with WATCH

`watch` monitors keys. If any watched key changes before `exec`, the transaction is aborted (returns nil):

```ruby
def transfer(redis, from_key, to_key, amount)
  redis.watch(from_key) do
    balance = redis.get(from_key).to_i

    if balance < amount
      redis.unwatch
      return false
    end

    result = redis.multi do |tx|
      tx.decrby(from_key, amount)
      tx.incrby(to_key, amount)
    end

    # result is nil if another client modified from_key
    !result.nil?
  end
end

success = transfer(redis, 'balance:alice', 'balance:bob', 100)
puts success ? "Transfer complete" : "Conflict - try again"
```

## Retry on Conflict

```ruby
def transfer_with_retry(redis, from_key, to_key, amount, max_retries: 3)
  max_retries.times do |attempt|
    return true if transfer(redis, from_key, to_key, amount)
    sleep(0.01 * (2 ** attempt)) # brief exponential backoff
  end
  false
end
```

## Discarding a Transaction

In redis-rb v5+, `multi` must be called with a block. To discard a transaction, raise an exception inside the block - redis-rb sends DISCARD automatically:

```ruby
begin
  redis.multi do |tx|
    tx.set('key', 'value')
    raise "Abort transaction"  # triggers DISCARD instead of EXEC
  end
rescue RuntimeError
  puts "Transaction discarded"
end
```

## Watching Multiple Keys

```ruby
redis.watch('inventory:item:1', 'inventory:item:2') do
  qty1 = redis.get('inventory:item:1').to_i
  qty2 = redis.get('inventory:item:2').to_i

  if qty1 > 0 && qty2 > 0
    redis.multi do |tx|
      tx.decr('inventory:item:1')
      tx.decr('inventory:item:2')
    end
  else
    redis.unwatch
    nil
  end
end
```

## Error Behavior

Redis does not roll back commands that fail at execution time. If one command errors (e.g., calling INCR on a non-numeric value), the others still run. In redis-rb v5+, a `Redis::CommandError` is raised, but the successful commands have already been applied:

```ruby
redis.set('str_key', 'hello')

begin
  redis.multi do |tx|
    tx.set('counter', 0)   # succeeds
    tx.incr('str_key')     # fails - value is not numeric
    tx.incr('counter')     # still runs
  end
rescue Redis::CommandError => e
  puts e.message
end

# Despite the error, successful commands were applied
p redis.get('counter')  # "1"
```

## Using Transactions with Connection Pool

```ruby
require 'connection_pool'

POOL = ConnectionPool.new(size: 5) { Redis.new }

POOL.with do |redis|
  redis.multi do |tx|
    tx.set('order:status', 'processing')
    tx.incr('order:count')
  end
end
```

## Summary

Redis MULTI/EXEC transactions in Ruby guarantee atomic execution of command groups. Use `watch` for optimistic locking when you need to read a value and conditionally write it. Implement retry logic for watch conflicts in high-contention scenarios, and remember that Redis does not roll back mid-transaction command errors.
