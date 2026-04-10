# How to Use Redis Pub/Sub in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, Pub/Sub, Messaging, redis-rb

Description: Learn how to implement Redis Pub/Sub in Ruby with redis-rb to build real-time event broadcasting between decoupled publisher and subscriber processes.

---

Redis Pub/Sub allows one process to publish messages to a channel and other processes to receive them instantly. It is useful for event broadcasting, notifications, and loosely coupled inter-service communication.

## Publishing Messages

```ruby
# publisher.rb
require 'redis'
require 'json'

redis = Redis.new

message = JSON.generate({
  event:    'order.placed',
  order_id: 1042,
  user_id:  7,
  total:    99.99,
  at:       Time.now.iso8601
})

receivers = redis.publish('orders', message)
puts "Delivered to #{receivers} subscriber(s)"
```

## Subscribing to a Channel

```ruby
# subscriber.rb
require 'redis'
require 'json'

redis = Redis.new

redis.subscribe('orders') do |on|
  on.subscribe do |channel, count|
    puts "Subscribed to #{channel} (#{count} total)"
  end

  on.message do |channel, message|
    data = JSON.parse(message)
    puts "#{channel}: #{data['event']} - order #{data['order_id']}"

    # Unsubscribe after processing a shutdown event
    redis.unsubscribe if data['event'] == 'shutdown'
  end

  on.unsubscribe do |channel, count|
    puts "Unsubscribed from #{channel}"
  end
end
```

## Pattern Subscriptions

Subscribe to multiple channels matching a glob pattern:

```ruby
redis.psubscribe('orders:*', 'users:*') do |on|
  on.pmessage do |pattern, channel, message|
    puts "Pattern: #{pattern} | Channel: #{channel}"
    puts "Message: #{message}"
  end
end
```

## Multiple Channel Subscription

```ruby
redis.subscribe('notifications', 'alerts', 'system') do |on|
  on.message do |channel, message|
    case channel
    when 'notifications' then handle_notification(message)
    when 'alerts'        then handle_alert(message)
    when 'system'        then handle_system(message)
    end
  end
end
```

## Running in a Thread

Subscriber blocks the current thread. In a Rails or Rack app, run it in a background thread:

```ruby
Thread.new do
  subscriber = Redis.new

  subscriber.subscribe('events') do |on|
    on.message do |channel, message|
      Rails.logger.info("[PubSub] #{channel}: #{message}")
      EventBroadcaster.dispatch(JSON.parse(message))
    end
  end
end
```

## Important Constraint

A connection in subscribe mode cannot issue regular commands. Use separate Redis connections for publishing and subscribing:

```ruby
publisher  = Redis.new  # for publishing
subscriber = Redis.new  # for subscribing only
```

## Broadcast from Rails Controller

```ruby
class OrdersController < ApplicationController
  def create
    order = Order.create!(order_params)

    $redis.publish('orders', {
      event:    'order.created',
      order_id: order.id,
      user_id:  current_user.id
    }.to_json)

    render json: order, status: :created
  end
end
```

## Checking Subscribers

```ruby
# Check number of subscribers on a channel
info = redis.pubsub(:numsub, 'orders')
puts info  # ["orders", 3]

# List active patterns
patterns = redis.pubsub(:numpat)
puts "Active patterns: #{patterns}"
```

## Summary

Redis Pub/Sub in Ruby is straightforward with redis-rb. Publish messages from any Redis connection and subscribe with a dedicated connection running a blocking loop. Pattern subscriptions let you fan out to multiple channels with a single subscriber, and threading keeps the subscriber running without blocking your main application.
