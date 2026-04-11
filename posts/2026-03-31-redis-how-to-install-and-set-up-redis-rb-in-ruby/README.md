# How to Install and Set Up redis-rb in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, redis-rb, Installation, Setup, Bundler

Description: Learn how to install and configure redis-rb, the official Ruby Redis client, using Bundler, verify your setup, and configure connection pooling for production use.

---

## What Is redis-rb?

redis-rb is the official Ruby client for Redis. Key features:

- Simple, idiomatic Ruby API
- Support for all Redis data types and commands
- Connection pooling via `connection_pool` gem
- Sentinel and Cluster support
- SSL/TLS support

## Installation

### With Bundler (Recommended)

Add to your `Gemfile`:

```ruby
gem 'redis', '~> 5.0'
```

Then install:

```bash
bundle install
```

### Without Bundler

```bash
gem install redis
```

### With Connection Pool (Recommended for Production)

```ruby
# Gemfile
gem 'redis', '~> 5.0'
gem 'connection_pool', '~> 2.4'
```

## Basic Connection

```ruby
require 'redis'

# Connect to local Redis
redis = Redis.new

# Or with explicit options
redis = Redis.new(
  host: 'localhost',
  port: 6379,
  db: 0
)

# With password
redis = Redis.new(
  host: 'localhost',
  port: 6379,
  password: 'yourpassword',
  db: 0
)

# Test the connection
pong = redis.ping
puts pong # PONG
```

## Connecting with a URL

```ruby
require 'redis'

# Simple URL
redis = Redis.new(url: 'redis://localhost:6379/0')

# With password
redis = Redis.new(url: 'redis://:yourpassword@localhost:6379/0')

# TLS
redis = Redis.new(url: 'rediss://redis.example.com:6380/0')

# From environment variable (Heroku-style)
redis = Redis.new(url: ENV['REDIS_URL'])
```

## TLS Connection

```ruby
require 'redis'

redis = Redis.new(
  host: 'redis.example.com',
  port: 6380,
  password: 'yourpassword',
  ssl: true,
  ssl_params: {
    ca_file: '/path/to/ca.crt',
    cert: OpenSSL::X509::Certificate.new(File.read('/path/to/client.crt')),
    key: OpenSSL::PKey::RSA.new(File.read('/path/to/client.key')),
    verify_mode: OpenSSL::SSL::VERIFY_PEER
  }
)
```

## Connection Timeouts

```ruby
require 'redis'

redis = Redis.new(
  host: 'localhost',
  port: 6379,
  connect_timeout: 2,                  # Seconds to wait for connection
  read_timeout: 1,                     # Seconds to wait for reads
  write_timeout: 1,                    # Seconds to wait for writes
  reconnect_attempts: [0, 0.5, 1, 2]  # Array of sleep durations between retries
)
```

## Using Connection Pool

For multi-threaded environments (Puma, Sidekiq), use connection pooling:

```ruby
require 'redis'
require 'connection_pool'

# Create a pool of 10 Redis connections
$redis_pool = ConnectionPool.new(size: 10, timeout: 5) do
  Redis.new(url: ENV['REDIS_URL'] || 'redis://localhost:6379')
end

# Use a connection from the pool
$redis_pool.with do |redis|
  redis.set('key', 'value')
  value = redis.get('key')
  puts value
end

# Or in a method
def get_user(user_id)
  $redis_pool.with do |redis|
    data = redis.get("user:#{user_id}")
    data ? JSON.parse(data) : nil
  end
end
```

## Verifying Your Setup

```ruby
require 'redis'
require 'json'

def verify_redis_setup(host: 'localhost', port: 6379)
  begin
    redis = Redis.new(host: host, port: port)

    puts "=== Redis Setup Verification ==="
    puts "PING: #{redis.ping}"

    # Basic operations test
    redis.set('setup:test', 'hello')
    value = redis.get('setup:test')
    puts "Basic GET/SET: #{value == 'hello' ? 'PASS' : 'FAIL'}"

    # String with TTL
    redis.setex('setup:ttl', 60, 'expires_soon')
    puts "SETEX TTL: #{redis.ttl('setup:ttl')}s"

    # Hash test
    redis.hset('setup:hash', 'field', 'value')
    puts "HSET/HGET: #{redis.hget('setup:hash', 'field')}"

    # Server info
    info = redis.info('server')
    puts "Redis version: #{info['redis_version']}"
    puts "OS: #{info['os']}"

    # Cleanup
    redis.del('setup:test', 'setup:ttl', 'setup:hash')

    puts "=== All checks passed! ==="

  rescue Redis::CannotConnectError => e
    puts "Connection failed: #{e.message}"
    exit 1
  rescue => e
    puts "Error: #{e.message}"
    exit 1
  end
end

verify_redis_setup
```

## Configuration in a Rails Application

In `config/initializers/redis.rb`:

```ruby
require 'redis'
require 'connection_pool'

REDIS = ConnectionPool::Wrapper.new(size: 10, timeout: 5) do
  Redis.new(
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
    connect_timeout: 2,
    read_timeout: 1,
    reconnect_attempts: 3
  )
end
```

Usage in Rails:

```ruby
# In any model or service
REDIS.set('key', 'value')
REDIS.get('key')
```

## Summary

Installing redis-rb is done with `gem install redis` or via Bundler in your `Gemfile`. Configure connections using URL strings for simplicity or explicit host/port/password options. For production multi-threaded environments like Puma or Sidekiq, always use `connection_pool` with an appropriate pool size. Verify your setup with a basic test script that exercises ping, get/set, and hash operations before deploying to production.
