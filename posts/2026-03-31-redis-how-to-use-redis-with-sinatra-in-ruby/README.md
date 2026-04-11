# How to Use Redis with Sinatra in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sinatra, Ruby, Caching, Session

Description: Learn how to integrate Redis with Sinatra in Ruby for caching, session storage, and rate limiting using the redis gem with practical examples.

---

Sinatra is a minimal Ruby DSL for building web applications. Pairing it with Redis gives you fast, shared storage for caching, sessions, and rate limiting without adding heavy dependencies. This guide shows the most common patterns.

## Installing Dependencies

Add to your `Gemfile`:

```ruby
gem 'sinatra'
gem 'redis'
gem 'rack-protection'
```

Then run:

```bash
bundle install
```

## Connecting to Redis

```ruby
require 'sinatra'
require 'redis'
require 'json'

REDIS = Redis.new(
  host: ENV.fetch('REDIS_HOST', '127.0.0.1'),
  port: ENV.fetch('REDIS_PORT', 6379).to_i,
  password: ENV['REDIS_PASSWORD']
)

REDIS.ping
puts "Redis connected"
```

## Caching Route Responses

```ruby
get '/products' do
  content_type :json
  cache_key = 'products:all'
  cached = REDIS.get(cache_key)

  if cached
    headers['X-Cache'] = 'HIT'
    return cached
  end

  products = [{ id: 1, name: 'Widget' }] # Simulate DB fetch
  result = products.to_json
  REDIS.set(cache_key, result, ex: 120) # 2-minute TTL
  headers['X-Cache'] = 'MISS'
  result
end

delete '/products/cache' do
  REDIS.del('products:all')
  { message: 'Cache cleared' }.to_json
end
```

## Session Storage with Redis

Use `redis-rack` for Redis-backed sessions in Sinatra.

```bash
bundle add redis-rack
```

```ruby
require 'rack/session/redis'

use Rack::Session::Redis,
    redis_server: 'redis://127.0.0.1:6379/0',
    expire_after: 86400

post '/login' do
  body = JSON.parse(request.body.read)
  session[:user] = body['username']
  { message: 'Logged in' }.to_json
end

get '/profile' do
  halt 401, { error: 'Unauthorized' }.to_json unless session[:user]
  { user: session[:user] }.to_json
end
```

## Rate Limiting Middleware

```ruby
before do
  ip = request.ip
  key = "ratelimit:#{ip}"
  count = REDIS.incr(key)
  REDIS.expire(key, 60) if count == 1
  halt 429, { error: 'Too many requests' }.to_json if count > 100
end
```

## Counters and Analytics

Redis counters are lightweight and atomic, making them ideal for tracking page views or API usage.

```ruby
post '/track/:event' do
  event = params[:event]
  date = Time.now.strftime('%Y-%m-%d')
  key = "events:#{event}:#{date}"
  count = REDIS.incr(key)
  REDIS.expire(key, 30 * 24 * 60 * 60) # Retain for 30 days
  { event: event, count: count }.to_json
end
```

## Graceful Shutdown

```ruby
at_exit do
  REDIS.close
  puts 'Redis connection closed'
end
```

## Summary

Sinatra works with Redis through the `redis` gem for direct key-value operations and `redis-rack` for persistent sessions. Use `INCR` with `EXPIRE` for atomic rate limiting, `SET` with `EX` for TTL-based caching, and attach cleanup to `at_exit` for graceful shutdown.
