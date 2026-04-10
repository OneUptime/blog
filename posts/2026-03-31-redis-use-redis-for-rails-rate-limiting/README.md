# How to Use Redis for Rails Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby On Rail, Rate Limiting, Rack Attack, Ruby

Description: Implement Redis-backed rate limiting in Rails using Rack::Attack to protect API endpoints and prevent abuse with configurable throttle rules.

---

## Introduction

Rate limiting protects Rails applications from abuse, brute-force attacks, and accidental overload. `rack-attack` is the standard Rails gem for this, and it uses the Rails cache store (Redis) to count requests per client. This guide covers installation, throttle rules, and custom responses.

## Installation

```ruby
# Gemfile
gem "rack-attack"
gem "redis"
```

```bash
bundle install
```

## Configuration

In `config/application.rb`, add Rack::Attack to the middleware stack:

```ruby
config.middleware.use Rack::Attack
```

Set up the cache store to Redis in `config/environments/production.rb`:

```ruby
config.cache_store = :redis_cache_store, {
  url: ENV.fetch("REDIS_URL", "redis://localhost:6379/1"),
}
```

Tell Rack::Attack to use the Rails cache:

```ruby
# config/initializers/rack_attack.rb
Rack::Attack.cache.store = Rails.cache
```

## Basic Throttle Rules

```ruby
# config/initializers/rack_attack.rb

# Throttle all API requests to 300 per 5 minutes by IP
Rack::Attack.throttle("api/ip", limit: 300, period: 5.minutes) do |req|
  req.ip if req.path.start_with?("/api/")
end

# Stricter limit on login endpoint
Rack::Attack.throttle("logins/ip", limit: 5, period: 1.minute) do |req|
  req.ip if req.path == "/api/v1/sessions" && req.post?
end

# Per-user rate limit for authenticated requests
Rack::Attack.throttle("api/user", limit: 1000, period: 1.hour) do |req|
  req.env["HTTP_X_USER_ID"] if req.path.start_with?("/api/")
end
```

## Blocking Repeated Failed Logins

```ruby
# Block IPs that hit login 20+ times in 15 minutes
Rack::Attack.blocklist("block_brute_force") do |req|
  Rack::Attack::Fail2Ban.filter(req.ip, maxretry: 20, findtime: 15.minutes, bantime: 1.hour) do
    req.path == "/api/v1/sessions" && req.post?
  end
end
```

## Custom Throttle Response

```ruby
Rack::Attack.throttled_responder = lambda do |request|
  match_data = request.env["rack.attack.match_data"]
  now         = match_data[:epoch_time]
  retry_after = match_data[:period] - (now % match_data[:period])

  [
    429,
    {
      "Content-Type"  => "application/json",
      "Retry-After"   => retry_after.to_s,
      "X-RateLimit-Limit"     => match_data[:limit].to_s,
      "X-RateLimit-Remaining" => "0",
      "X-RateLimit-Reset"     => (now + retry_after).to_s,
    },
    [{ error: "Too Many Requests", retry_after: retry_after }.to_json],
  ]
end
```

## Safelist Trusted IPs

```ruby
# Always allow internal services and health checks
Rack::Attack.safelist("allow_internal") do |req|
  req.ip == "127.0.0.1" || req.path == "/health"
end

# Allow trusted API partners
TRUSTED_IPS = %w[203.0.113.10 203.0.113.20].freeze
Rack::Attack.safelist("trusted_partners") do |req|
  TRUSTED_IPS.include?(req.ip)
end
```

## Manual Rate Limiting in Controllers

For complex per-resource rate limits, use Redis directly:

```ruby
class ApiController < ApplicationController
  def check_rate_limit(action, limit, period)
    key = "rl:#{action}:#{current_user.id}"
    count = Rails.cache.increment(key, 1, expires_in: period)

    if count > limit
      render json: { error: "Rate limit exceeded" }, status: :too_many_requests
      return false
    end
    true
  end
end
```

## Summary

Redis-backed rate limiting in Rails is most effectively implemented with `rack-attack`, which hooks into the Rack middleware layer and uses the Rails cache (Redis) to count requests per throttle key. Throttle rules are defined with a `limit` per `period` and a block that returns the key to throttle on (usually IP or user ID). Custom responders return proper `429 Too Many Requests` responses with `Retry-After` headers for well-behaved API clients.
