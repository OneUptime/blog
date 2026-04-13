# How to Use Redis Connection Pooling in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, Connection Pool, Performance, Concurrency

Description: Learn how to use the connection_pool gem with redis-rb to safely share Redis connections across threads in multi-threaded Ruby applications.

---

The redis-rb client creates one connection per object. In redis-rb 5.x, each `Redis` instance is thread-safe - access to the underlying TCP connection is protected by a mutex. However, this means only one thread can execute a command at a time, making a single shared instance a performance bottleneck in multi-threaded applications (Puma, Sidekiq, concurrent workers). The `connection_pool` gem solves this by maintaining a pool of connections, allowing threads to execute Redis commands concurrently.

## Installation

```bash
gem install redis connection_pool
```

Or add to your Gemfile:

```ruby
# Gemfile
gem 'redis', '~> 5.0'
gem 'connection_pool', '~> 2.4'
```

## Creating a Connection Pool

```ruby
require 'redis'
require 'connection_pool'

REDIS_POOL = ConnectionPool.new(size: 10, timeout: 5) do
  Redis.new(
    host:     ENV.fetch('REDIS_HOST', '127.0.0.1'),
    port:     ENV.fetch('REDIS_PORT', 6379).to_i,
    password: ENV['REDIS_PASSWORD'],
    db:       0
  )
end
```

`size` sets the maximum number of connections. `timeout` is the maximum seconds to wait for a connection before raising an error.

## Using the Pool

```ruby
# Checkout a connection from the pool, return it automatically
REDIS_POOL.with do |redis|
  redis.set('key', 'value')
  redis.get('key')
end

# Fetch a value
result = REDIS_POOL.with { |r| r.get('page:home') }
```

## Integration with Rails

In a Rails initializer:

```ruby
# config/initializers/redis.rb
$redis_pool = ConnectionPool.new(size: ENV.fetch('REDIS_POOL_SIZE', 10).to_i, timeout: 5) do
  Redis.new(url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'))
end
```

In a model or service:

```ruby
class CacheService
  def self.get(key)
    $redis_pool.with { |r| r.get(key) }
  end

  def self.set(key, value, ex: 300)
    $redis_pool.with { |r| r.setex(key, ex, value) }
  end
end
```

## Pipelining with a Pool

```ruby
REDIS_POOL.with do |redis|
  redis.pipelined do |pipe|
    1000.times { |i| pipe.set("key:#{i}", i) }
  end
end
```

## Sizing the Pool

A good starting point for pool size:

- **Puma**: set pool size to match Puma threads per worker. Each forked worker process gets its own independent pool, so if Puma runs 5 threads per worker, use `size: 5`. With 3 workers, this results in up to 15 total connections to Redis (5 per worker).
- **Sidekiq**: `size` should be slightly larger than Sidekiq concurrency.

```ruby
# For Sidekiq
sidekiq_concurrency = Sidekiq.default_configuration.concurrency
REDIS_POOL = ConnectionPool.new(size: sidekiq_concurrency + 2, timeout: 5) do
  Redis.new(url: ENV['REDIS_URL'])
end
```

## Checking Pool Status

```ruby
puts REDIS_POOL.size          # max pool size
puts REDIS_POOL.available     # currently available connections
```

## Handling Pool Timeouts

```ruby
begin
  REDIS_POOL.with(timeout: 1) do |redis|
    redis.get('key')
  end
rescue ConnectionPool::TimeoutError => e
  Rails.logger.error("Redis pool timeout: #{e.message}")
  nil
end
```

## Summary

The `connection_pool` gem pairs naturally with redis-rb to provide thread-safe Redis access in Ruby applications. Set the pool size to match your concurrency level, use `with` blocks to check out connections automatically, and handle pool timeouts gracefully to prevent cascading failures under load.
