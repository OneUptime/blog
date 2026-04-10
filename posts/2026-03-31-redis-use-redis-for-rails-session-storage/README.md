# How to Use Redis for Rails Session Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby On Rail, Session, Authentication, Ruby

Description: Configure Ruby on Rails to store user sessions in Redis for cross-process session sharing in multi-instance deployments using redis-actionpack.

---

## Introduction

Rails stores sessions in cookies by default, which limits session size to 4KB. Server-side sessions with Redis remove this limitation, enable server-side invalidation, and allow all application instances in a cluster to share session state. This guide covers setup using the `redis-actionpack` gem.

## Installation

```ruby
# Gemfile
gem "redis-actionpack"
gem "redis"
```

```bash
bundle install
```

## Configuration

In `config/initializers/session_store.rb`:

```ruby
Rails.application.config.session_store(
  :redis_store,
  servers: [
    {
      host:     ENV.fetch("REDIS_HOST", "localhost"),
      port:     ENV.fetch("REDIS_PORT", "6379").to_i,
      db:       1,  # Use DB 1 for sessions
      password: ENV["REDIS_PASSWORD"],
      namespace: "sessions",
    }
  ],
  expire_after: 90.minutes,
  key: "_myapp_session",
  threadsafe: true,
  secure: Rails.env.production?,
  httponly: true,
  same_site: :lax
)
```

## Using Sessions in Controllers

Session access is identical to the default cookie store:

```ruby
class SessionsController < ApplicationController
  def create
    user = User.authenticate(params[:email], params[:password])

    if user
      session[:user_id]   = user.id
      session[:user_role] = user.role
      session[:logged_in_at] = Time.current.to_i
      redirect_to dashboard_path
    else
      flash.now[:error] = "Invalid email or password"
      render :new
    end
  end

  def destroy
    reset_session  # Clears all session data from Redis
    redirect_to root_path
  end
end
```

## Current User Helper

```ruby
class ApplicationController < ActionController::Base
  helper_method :current_user

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def authenticate!
    redirect_to login_path unless current_user
  end
end
```

## Storing Complex Objects in Session

Redis session storage supports serialized Ruby objects beyond simple strings:

```ruby
class CartController < ApplicationController
  def add_item
    cart = session[:cart] || {}
    product_id = params[:product_id].to_s
    cart[product_id] = (cart[product_id] || 0) + 1
    session[:cart] = cart
    render json: { cart_size: cart.values.sum }
  end

  def view
    render json: { cart: session[:cart] || {} }
  end
end
```

## Manually Invalidating a Session

```ruby
class AdminController < ApplicationController
  def force_logout_user
    user = User.find(params[:id])

    # Find and delete all session keys for this user
    redis = Redis.new(
      host: ENV.fetch("REDIS_HOST", "localhost"),
      port: ENV.fetch("REDIS_PORT", "6379").to_i,
      db: 1
    )

    # Sessions stored with key pattern sessions:<session_id>
    # This requires scanning - practical with session namespace
    redis.scan_each(match: "sessions:*") do |key|
      session_data = redis.get(key)
      if session_data&.include?("user_id")
        decoded = Marshal.load(session_data) rescue nil
        if decoded && decoded["user_id"] == user.id
          redis.del(key)
        end
      end
    end

    render json: { message: "User logged out" }
  end
end
```

## Monitoring Sessions

```bash
# Count active sessions
redis-cli -n 1 dbsize

# List session keys
redis-cli -n 1 keys "sessions:*" | head -20

# Check a specific session TTL
redis-cli -n 1 ttl "sessions:<session-id>"
```

## Summary

Redis session storage in Rails is configured via `redis-actionpack` in `config/initializers/session_store.rb`. Once configured, all `session[]` operations work identically to the default cookie store but store data server-side in Redis. This enables storing larger session payloads, immediate server-side session invalidation via `reset_session`, and seamless session sharing across multiple Rails application instances.
