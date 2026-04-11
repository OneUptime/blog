# How to Connect to Redis from Ruby with redis-rb

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, redis-rb, Data Type, Operation

Description: Learn how to use redis-rb in Ruby to perform operations on all Redis data types including strings, hashes, lists, sets, sorted sets, and how to use pipelining.

---

## Basic Connection and Operations

```ruby
require 'redis'

redis = Redis.new(url: ENV.fetch('REDIS_URL', 'redis://localhost:6379'))

# Test connection
puts redis.ping # PONG
```

## String Operations

```ruby
require 'redis'

redis = Redis.new

# Basic set/get
redis.set('username', 'alice')
value = redis.get('username')
puts value # alice

# Set with expiry
redis.setex('session:abc', 3600, 'session_data')

# SET with options (Redis 2.6+)
redis.set('token', 'xyz', ex: 3600, nx: true)  # Set only if not exists

# Multiple set/get
redis.mset('key1', 'val1', 'key2', 'val2')
values = redis.mget('key1', 'key2')
puts values.inspect # ["val1", "val2"]

# Increment
redis.set('counter', 0)
redis.incr('counter')
redis.incrby('counter', 5)
puts redis.get('counter') # 6

# Append
redis.set('log', 'line1')
redis.append('log', "\nline2")

# String range
redis.set('greeting', 'Hello, World!')
puts redis.getrange('greeting', 0, 4)  # Hello

# Existence and deletion
puts redis.exists?('username')  # true
redis.del('username')

# TTL management
puts redis.ttl('session:abc')     # remaining seconds
puts redis.pttl('session:abc')    # remaining milliseconds
redis.persist('session:abc')      # remove TTL
redis.expire('session:abc', 7200) # set new TTL
```

## Hash Operations

```ruby
require 'redis'
require 'json'

redis = Redis.new

# Set multiple fields
redis.hset('user:1001',
  'name',  'Alice',
  'email', 'alice@example.com',
  'age',   '30',
  'role',  'admin'
)

# Get single field
name = redis.hget('user:1001', 'name')
puts name

# Get multiple fields
email, role = redis.hmget('user:1001', 'email', 'role')
puts "#{email} - #{role}"

# Get all fields
user = redis.hgetall('user:1001')
puts user.inspect

# Get all keys
puts redis.hkeys('user:1001').inspect

# Count fields
puts redis.hlen('user:1001')

# Check field existence
puts redis.hexists('user:1001', 'email') # true

# Update field
redis.hset('user:1001', 'age', '31')

# Delete field
redis.hdel('user:1001', 'age')

# Numeric increment on hash field
redis.hset('user:1001', 'login_count', 0)
redis.hincrby('user:1001', 'login_count', 1)
redis.hincrbyfloat('user:1001', 'score', 0.5)
```

## List Operations

```ruby
require 'redis'

redis = Redis.new

# Push to tail
redis.rpush('tasks', ['task:1', 'task:2', 'task:3'])

# Push to head
redis.lpush('tasks', 'urgent:task')

# Pop from head (FIFO)
task = redis.lpop('tasks')
puts "Processing: #{task}"

# Pop from tail (LIFO)
last = redis.rpop('tasks')

# Get all elements
all = redis.lrange('tasks', 0, -1)
puts all.inspect

# Get length
puts redis.llen('tasks')

# Get by index
puts redis.lindex('tasks', 0)

# Trim list to fixed size
redis.ltrim('recent:activity', 0, 99)  # Keep latest 100

# Blocking pop (waits up to 5 seconds)
result = redis.blpop('queue:jobs', timeout: 5)
if result
  key, value = result
  puts "Got from #{key}: #{value}"
end
```

## Set Operations

```ruby
require 'redis'

redis = Redis.new

# Add members
redis.sadd('tags:post:1', 'redis', 'ruby', 'backend', 'caching')

# Check membership
puts redis.sismember('tags:post:1', 'redis') # true

# Get all members
tags = redis.smembers('tags:post:1')
puts tags.inspect

# Count
puts redis.scard('tags:post:1')

# Remove member
redis.srem('tags:post:1', 'caching')

# Random member
puts redis.srandmember('tags:post:1')

# Set operations
redis.sadd('user:1:skills', 'ruby', 'redis', 'sql')
redis.sadd('user:2:skills', 'ruby', 'python', 'redis')

puts redis.sinter('user:1:skills', 'user:2:skills').inspect # common
puts redis.sunion('user:1:skills', 'user:2:skills').inspect # all
puts redis.sdiff('user:1:skills', 'user:2:skills').inspect  # unique to user 1
```

## Sorted Set Operations

```ruby
require 'redis'

redis = Redis.new

# Add members with scores
redis.zadd('leaderboard', [
  [1500, 'alice'],
  [2300, 'bob'],
  [1800, 'carol']
])

# Get rank (0-indexed, desc order)
rank = redis.zrevrank('leaderboard', 'alice')
puts "Alice rank: #{rank + 1}"

# Get score
score = redis.zscore('leaderboard', 'bob')
puts "Bob score: #{score}"

# Increment score
redis.zincrby('leaderboard', 200, 'alice')

# Get top N with scores (desc)
top = redis.zrevrange('leaderboard', 0, 9, with_scores: true)
top.each_with_index do |(player, score), i|
  puts "#{i + 1}. #{player}: #{score}"
end

# Score range query
mid = redis.zrangebyscore('leaderboard', 1500, 2000, with_scores: true)

# Count in range
puts redis.zcount('leaderboard', 1000, '+inf')
```

## Pipelining

```ruby
require 'redis'

redis = Redis.new

# Execute multiple commands in one network round trip
results = redis.pipelined do |pipe|
  pipe.set('key1', 'value1')
  pipe.set('key2', 'value2')
  pipe.get('key1')
  pipe.get('key2')
  pipe.incr('counter')
end

puts results.inspect
# ["OK", "OK", "value1", "value2", 1]
```

## Summary

redis-rb provides an idiomatic Ruby API that closely mirrors Redis commands. Use `mset`/`mget` for bulk string operations, `hset` with multiple key-value pairs for hash creation, `rpush`/`lpop` for FIFO queues, and `zadd` with arrays for bulk sorted set loading. Pipelining with the `pipelined` block reduces network overhead for bulk operations. All blocking commands like `blpop` accept a `timeout:` keyword argument for clean timeout handling.
