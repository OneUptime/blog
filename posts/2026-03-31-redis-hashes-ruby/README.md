# How to Use Redis Hashes in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, Hash, Data Structure, redis-rb

Description: Learn how to use Redis Hashes in Ruby with redis-rb to store and manage structured objects with efficient field-level read and write operations.

---

Redis Hashes map field names to values within a single key. They are ideal for representing objects like user profiles, sessions, and product records where you want to update individual fields without loading the entire object.

## Basic Hash Operations

```ruby
require 'redis'

redis = Redis.new

# Set individual fields
redis.hset('user:42', 'name', 'Alice')
redis.hset('user:42', 'email', 'alice@example.com')
redis.hset('user:42', 'role', 'admin')

# Set multiple fields at once
redis.hset('user:42',
  'name',  'Alice',
  'email', 'alice@example.com',
  'age',   '30',
  'role',  'admin'
)
```

## Reading Fields

```ruby
# Get a single field
name = redis.hget('user:42', 'name')
puts name  # Alice

# Get multiple fields
values = redis.hmget('user:42', 'name', 'email')
puts values.inspect  # ["Alice", "alice@example.com"]

# Get all fields as a hash
profile = redis.hgetall('user:42')
puts profile['role']  # admin
```

## Checking and Deleting Fields

```ruby
# Does the field exist?
redis.hexists('user:42', 'role')  # true
redis.hexists('user:42', 'phone') # false

# Delete specific fields
redis.hdel('user:42', 'role')

# Number of fields
redis.hlen('user:42')  # 3
```

## Numeric Field Operations

```ruby
redis.hset('product:1', 'stock', '100', 'price', '49.99')

# Integer increment
redis.hincrby('product:1', 'stock', -5)    # 95

# Float increment
redis.hincrbyfloat('product:1', 'price', 5.0)  # 54.99
```

## Getting Keys and Values

```ruby
redis.hkeys('user:42')   # ["name", "email", "age"]
redis.hvals('user:42')   # ["Alice", "alice@example.com", "30"]
```

## Practical Example - Session Cache

```ruby
class SessionCache
  def initialize(redis)
    @redis = redis
  end

  def save(session_id, data, ttl: 3600)
    key = "session:#{session_id}"
    @redis.hset(key, data.transform_values(&:to_s))
    @redis.expire(key, ttl)
  end

  def load(session_id)
    @redis.hgetall("session:#{session_id}")
  end

  def update_field(session_id, field, value)
    @redis.hset("session:#{session_id}", field, value.to_s)
  end

  def delete(session_id)
    @redis.del("session:#{session_id}")
  end
end

sessions = SessionCache.new(redis)

sessions.save('abc123', { user_id: '7', ip: '10.0.0.1', role: 'admin' })
data = sessions.load('abc123')
puts data['role']  # admin

sessions.update_field('abc123', 'last_seen', Time.now.to_i.to_s)
```

## Memory Efficiency

Redis uses a compact ziplist/listpack encoding for small hashes (up to 128 fields and values up to 64 bytes by default). This makes hashes more memory-efficient than storing JSON strings:

```ruby
# Less efficient
redis.set('user:42', { name: 'Alice', age: 30 }.to_json)

# More efficient and supports field-level updates
redis.hset('user:42', 'name', 'Alice', 'age', '30')
```

## Scanning Hash Fields

For large hashes, use `hscan` to iterate without blocking:

```ruby
cursor = '0'
loop do
  cursor, fields = redis.hscan('large:hash', cursor, count: 100)
  fields.each { |field, value| puts "#{field}: #{value}" }
  break if cursor == '0'
end
```

## Summary

Redis Hashes in Ruby are a natural fit for structured object storage. redis-rb maps directly to all Hash commands, and field-level operations let you update a single attribute without touching the rest of the object. Use hashes for sessions, user profiles, and any entity with named fields.
