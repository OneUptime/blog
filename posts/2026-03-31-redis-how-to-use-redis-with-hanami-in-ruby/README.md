# How to Use Redis with Hanami in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hanami, Ruby, Caching, Backend

Description: Learn how to integrate Redis with Hanami in Ruby for caching, rate limiting, and background job queuing using the redis gem with practical examples.

---

Hanami is a modern Ruby web framework that emphasizes clean architecture and minimal dependencies. It does not include a built-in cache layer tied to a specific store, so Redis is a natural fit for adding shared, persistent caching across Hanami slices and actions.

## Installing Dependencies

Add to your `Gemfile`:

```ruby
gem 'redis'
gem 'connection_pool'
```

```bash
bundle install
```

## Registering Redis as a Provider

Hanami uses a dependency injection container. Register Redis as a provider so it is available throughout the application.

```ruby
# config/providers/redis.rb
Hanami.app.register_provider(:redis) do
  prepare do
    require 'redis'
    require 'connection_pool'
  end

  start do
    pool = ConnectionPool.new(size: 5, timeout: 5) do
      Redis.new(
        host: ENV.fetch('REDIS_HOST', '127.0.0.1'),
        port: ENV.fetch('REDIS_PORT', 6379).to_i,
        password: ENV['REDIS_PASSWORD']
      )
    end
    register('redis.pool', pool)
  end
end
```

## Caching in Actions

Inject the Redis pool into Hanami actions via the container.

```ruby
# app/actions/products/index.rb
module MyApp
  module Actions
    module Products
      class Index < Hanami::Action
        include Deps[redis_pool: 'redis.pool']

        def handle(request, response)
          cache_key = 'products:all'
          cached = redis_pool.with { |r| r.get(cache_key) }

          if cached
            response.headers['X-Cache'] = 'HIT'
            response.body = cached
            return
          end

          products = [{ id: 1, name: 'Widget' }] # Simulate repo fetch
          json = products.to_json
          redis_pool.with { |r| r.set(cache_key, json, ex: 120) }
          response.headers['X-Cache'] = 'MISS'
          response.body = json
        end
      end
    end
  end
end
```

## Rate Limiting

```ruby
# app/actions/concerns/rate_limitable.rb
module RateLimitable
  def check_rate_limit(request, pool)
    ip = request.ip
    key = "ratelimit:#{ip}"
    count = pool.with { |r| r.incr(key) }
    pool.with { |r| r.expire(key, 60) } if count == 1
    count <= 100
  end
end
```

## Background Job Integration with Sidekiq

Sidekiq requires Redis. Registering the same Redis provider keeps configuration centralized.

```ruby
# config/providers/sidekiq.rb
Hanami.app.register_provider(:sidekiq) do
  start do
    require 'sidekiq'
    Sidekiq.configure_server do |config|
      config.redis = { url: "redis://#{ENV.fetch('REDIS_HOST', '127.0.0.1')}:6379" }
    end
    Sidekiq.configure_client do |config|
      config.redis = { url: "redis://#{ENV.fetch('REDIS_HOST', '127.0.0.1')}:6379" }
    end
  end
end
```

## Feature Flags with Redis

```ruby
def feature_enabled?(feature, pool)
  pool.with { |r| r.get("feature:#{feature}") } == '1'
end

def enable_feature(feature, pool)
  pool.with { |r| r.set("feature:#{feature}", '1') }
end
```

## Summary

Hanami integrates with Redis through a registered provider that exposes a connection pool to the dependency injection container. Inject the pool into actions and use `with` blocks for safe connection borrowing. This approach scales well and keeps your Redis configuration in one place.
