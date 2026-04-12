# How to Use Redis Lists in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, List, Queue, redis-rb

Description: Learn how to use Redis Lists in Ruby with redis-rb for stacks, queues, timelines, and blocking job consumers using LPUSH, RPOP, and BRPOP.

---

Redis Lists are ordered sequences that support push and pop from both ends. In Ruby applications they are commonly used for job queues, activity feeds, and bounded history buffers.

## Basic List Operations

```ruby
require 'redis'

redis = Redis.new

# Push to head (left)
redis.lpush('queue', 'job-3')
redis.lpush('queue', 'job-2')
redis.lpush('queue', 'job-1')

# Push to tail (right)
redis.rpush('history', 'event-1')
redis.rpush('history', 'event-2')

# Pop from tail (FIFO queue)
item = redis.rpop('queue')
puts item  # job-3

# Pop from head (LIFO stack)
item = redis.lpop('queue')
puts item  # job-1
```

## Viewing List Contents

```ruby
# Full range
items = redis.lrange('queue', 0, -1)
puts items.inspect  # ["job-2"]

# First 5 elements
redis.lrange('queue', 0, 4)

# Length
redis.llen('queue')  # number of elements

# Element at index
redis.lindex('queue', 0)  # first element
redis.lindex('queue', -1) # last element
```

## Job Queue with Blocking Pop

`brpop` blocks until an item is available, making it ideal for worker processes:

```ruby
# worker.rb
redis = Redis.new

def process_job(job)
  # do the actual work
  puts "Done: #{job.inspect}"
end

loop do
  result = redis.brpop('jobs:email', 'jobs:sms', timeout: 30)

  if result.nil?
    # Timeout - continue loop
    next
  end

  queue, payload = result
  job = JSON.parse(payload)
  puts "Processing #{job['type']} from #{queue}"
  process_job(job)
end
```

## Enqueuing Jobs

```ruby
def enqueue(redis, queue, job)
  redis.lpush(queue, job.to_json)
end

enqueue(redis, 'jobs:email', { type: 'welcome', user_id: 7 })
enqueue(redis, 'jobs:sms',   { type: 'otp',     phone: '+1555...' })
```

## Reliable Queue (with Processing List)

Protect against job loss if the worker crashes:

```ruby
def dequeue_reliable(redis, src, processing)
  payload = redis.lmove(src, processing, 'RIGHT', 'LEFT')
  return nil unless payload
  JSON.parse(payload)
end

def ack(redis, processing, job)
  redis.lrem(processing, 1, job.to_json)
end

job = dequeue_reliable(redis, 'jobs:email', 'jobs:email:processing')
if job
  process_job(job)
  ack(redis, 'jobs:email:processing', job)
end
```

## Capped Activity Feed

```ruby
def record_event(redis, user_id, event)
  key = "feed:#{user_id}"
  redis.lpush(key, event.to_json)
  redis.ltrim(key, 0, 99)  # keep last 100 events
end

def get_feed(redis, user_id, limit: 20)
  redis.lrange("feed:#{user_id}", 0, limit - 1).map { |e| JSON.parse(e) }
end

record_event(redis, 42, { type: 'login', at: Time.now.iso8601 })
feed = get_feed(redis, 42)
```

## Inserting at a Specific Position

```ruby
# Insert 'new-item' before 'existing-item'
redis.linsert('mylist', 'BEFORE', 'existing-item', 'new-item')

# Insert after
redis.linsert('mylist', 'AFTER', 'existing-item', 'new-item')
```

## Summary

Redis Lists in Ruby support both stack and queue patterns with constant-time push and pop at either end. Use `brpop` for efficient blocking workers, `lmove` for reliable queues that survive crashes, and `ltrim` for bounded activity feeds. redis-rb provides direct access to all List commands with a clean Ruby interface.
