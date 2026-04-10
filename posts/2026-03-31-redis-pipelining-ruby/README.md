# How to Use Redis Pipelining in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, Pipelining, Performance, redis-rb

Description: Learn how to use Redis pipelining in Ruby with redis-rb to batch commands into a single network round-trip and significantly improve throughput.

---

Every Redis command normally requires a round-trip to the server. Pipelining buffers multiple commands and sends them together, reducing latency from N round-trips to 1. The redis-rb gem makes this easy with a `pipelined` block.

## Basic Pipelining

```ruby
require 'redis'

redis = Redis.new

# Without pipeline: 4 round-trips
redis.set('a', 1)
redis.set('b', 2)
redis.get('a')
redis.get('b')

# With pipeline: 1 round-trip
results = redis.pipelined do |pipe|
  pipe.set('a', 1)
  pipe.set('b', 2)
  pipe.get('a')
  pipe.get('b')
end

# results is an array of return values
p results # ["OK", "OK", "1", "2"]
```

## Bulk Data Loading

Pipelining is ideal for importing large datasets:

```ruby
def bulk_import(redis, records)
  records.each_slice(500) do |batch|
    redis.pipelined do |pipe|
      batch.each do |record|
        pipe.hset("product:#{record[:id]}", record)
        pipe.expire("product:#{record[:id]}", 86400)
      end
    end
  end
end

products = (1..5000).map { |i| { id: i, name: "Product #{i}", price: rand(10..500) } }
bulk_import(redis, products)
```

## Collecting Results

Each command's result is returned in order:

```ruby
results = redis.pipelined do |pipe|
  pipe.set('x', 10)        # index 0: "OK"
  pipe.incr('x')           # index 1: 11
  pipe.incr('x')           # index 2: 12
  pipe.get('x')            # index 3: "12"
  pipe.strlen('x')         # index 4: 2
end

set_result, first_incr, second_incr, final_val, str_len = results
puts final_val  # "12"
puts str_len    # 2
```

## Pipelining with a Connection Pool

```ruby
require 'connection_pool'

POOL = ConnectionPool.new(size: 5) { Redis.new }

POOL.with do |redis|
  redis.pipelined do |pipe|
    100.times { |i| pipe.set("key:#{i}", i * 2) }
  end
end
```

## When Pipelining Helps Most

```ruby
require 'benchmark'

redis = Redis.new

Benchmark.bm do |x|
  x.report('individual:') do
    1000.times { |i| redis.set("bench:#{i}", i) }
  end

  x.report('pipelined:') do
    redis.pipelined do |pipe|
      1000.times { |i| pipe.set("bench:#{i}", i) }
    end
  end
end
# individual:   ~120ms
# pipelined:    ~4ms
```

## Conditional Logic Inside a Pipeline

You cannot use results of pipeline commands within the same pipeline block because results are not yet available. Use multiple pipelines if you need conditional branching:

```ruby
# First pipeline: batch reads
keys_exist = redis.pipelined do |pipe|
  %w[a b c].each { |k| pipe.exists(k) }
end

# Second pipeline: conditionally set missing keys
redis.pipelined do |pipe|
  %w[a b c].each_with_index do |k, i|
    pipe.set(k, 'default') unless keys_exist[i] == 1
  end
end
```

## Pipelining vs Transactions

Pipelining batches commands for throughput - commands are not atomic. Use `multi`/`exec` if you need atomicity:

```ruby
# Atomic transaction
redis.multi do |tx|
  tx.decr('stock')
  tx.incr('sold')
end
```

## Summary

Redis pipelining in Ruby cuts network overhead from multiple commands down to a single round-trip. Use `pipelined` blocks in redis-rb for bulk imports, cache warming, and any scenario where you issue many independent commands. For atomic operations, use transactions instead.
