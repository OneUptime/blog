# How to Handle Redis Connection Errors in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, Error Handling, Reliability, redis-rb

Description: Learn how to handle Redis connection failures, timeouts, and reconnection in Ruby applications using redis-rb with retry logic and graceful degradation.

---

Redis is often a critical dependency in Ruby applications. When Redis is unavailable, unhandled exceptions can take down your entire app. Proper error handling ensures graceful degradation rather than cascading failures.

## Redis Error Hierarchy

redis-rb raises errors under `Redis::BaseError`:

```text
Redis::BaseError
  Redis::CommandError          - Redis rejected the command
  Redis::BaseConnectionError   - base class for connection-related errors
    Redis::CannotConnectError  - cannot establish a connection
    Redis::ConnectionError     - connection lost after being established
    Redis::TimeoutError        - connection or read timed out
```

## Basic Error Handling

```ruby
require 'redis'

redis = Redis.new(host: '127.0.0.1', port: 6379, connect_timeout: 2, read_timeout: 1)

begin
  redis.set('key', 'value')
rescue Redis::CannotConnectError => e
  Rails.logger.error("Redis connection failed: #{e.message}")
rescue Redis::TimeoutError => e
  Rails.logger.error("Redis timeout: #{e.message}")
rescue Redis::BaseError => e
  Rails.logger.error("Redis error: #{e.message}")
end
```

## Retry with Exponential Backoff

```ruby
def redis_with_retry(redis, retries: 3, &block)
  attempts = 0
  begin
    block.call(redis)
  rescue Redis::CannotConnectError, Redis::TimeoutError => e
    attempts += 1
    raise if attempts >= retries
    sleep_ms = (100 * (2 ** attempts)).to_f / 1000
    sleep(sleep_ms)
    retry
  end
end

redis_with_retry(redis) { |r| r.set('key', 'value') }
```

## Graceful Degradation

Fall back to the source of truth when Redis is unavailable:

```ruby
def fetch_with_cache(redis, key, ttl: 300, &fallback)
  begin
    cached = redis.get(key)
    return JSON.parse(cached) if cached
  rescue Redis::BaseError => e
    Rails.logger.warn("Redis unavailable for #{key}: #{e.message}")
    return fallback.call
  end

  data = fallback.call
  begin
    redis.setex(key, ttl, data.to_json)
  rescue Redis::BaseError
    # ignore write failure
  end
  data
end

user = fetch_with_cache(redis, "user:#{id}") { User.find(id) }
```

## Circuit Breaker

```ruby
class RedisCircuitBreaker
  THRESHOLD     = 5
  RESET_TIMEOUT = 30

  def initialize
    @failures  = 0
    @opened_at = nil
  end

  def open?
    return false if @opened_at.nil?
    if Time.now - @opened_at > RESET_TIMEOUT
      @opened_at = nil
      @failures  = 0
      return false
    end
    true
  end

  def call(redis, &block)
    raise Redis::CannotConnectError, "Circuit open" if open?

    begin
      result = block.call(redis)
      @failures = 0
      result
    rescue Redis::BaseError => e
      @failures += 1
      @opened_at = Time.now if @failures >= THRESHOLD
      raise
    end
  end
end

breaker = RedisCircuitBreaker.new

begin
  breaker.call(redis) { |r| r.set('key', 'value') }
rescue Redis::BaseError => e
  # serve from cache or return nil
end
```

## Connection Timeout Configuration

```ruby
redis = Redis.new(
  host:            '127.0.0.1',
  port:            6379,
  connect_timeout: 2,    # seconds to establish TCP connection
  read_timeout:    1,    # seconds to wait for response
  write_timeout:   1,    # seconds to write a command
  reconnect_attempts: 2  # auto-reconnect on connection loss
)
```

## Health Check Helper

```ruby
def redis_healthy?(redis)
  redis.ping == 'PONG'
rescue Redis::BaseError
  false
end

# In a health check endpoint
get '/health' do
  { redis: redis_healthy?(redis) ? 'ok' : 'down' }.to_json
end
```

## Summary

Handling Redis errors in Ruby means rescuing from `Redis::BaseError` and its subclasses. Use retry with exponential backoff for transient failures, graceful degradation to serve live data when Redis is down, and circuit breakers to avoid hammering a failing instance. Proper timeout configuration prevents long request stalls during Redis outages.
