# How to Mock Redis in Ruby Unit Tests (mock_redis)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, Testing, Mock, RSpec

Description: Learn how to mock Redis in Ruby unit tests using the mock_redis gem to test Redis-dependent code without a live Redis server.

---

Testing code that uses Redis against a real server is slow and introduces external dependencies. The `mock_redis` gem provides an in-memory Redis implementation that mirrors the real client API, making unit tests fast and deterministic.

## Installation

```bash
gem install mock_redis
```

Or in your Gemfile:

```ruby
# Gemfile
group :test do
  gem 'mock_redis', '~> 0.43'
end
```

## Basic Usage

```ruby
require 'mock_redis'

redis = MockRedis.new

redis.set('user:1', 'alice')
puts redis.get('user:1')  # alice

redis.hset('profile:1', 'name', 'Alice', 'age', '30')
puts redis.hget('profile:1', 'name')  # Alice

redis.lpush('queue', 'job-1', 'job-2')
puts redis.rpop('queue')  # job-1
```

## RSpec with Dependency Injection

The cleanest pattern is to inject the Redis client so tests can swap it:

```ruby
# app/services/user_cache.rb
class UserCache
  def initialize(redis)
    @redis = redis
  end

  def fetch(user_id)
    cached = @redis.get("user:#{user_id}")
    return JSON.parse(cached) if cached
    nil
  end

  def store(user_id, data, ttl: 300)
    @redis.setex("user:#{user_id}", ttl, data.to_json)
  end

  def invalidate(user_id)
    @redis.del("user:#{user_id}")
  end
end
```

```ruby
# spec/services/user_cache_spec.rb
require 'mock_redis'
require 'user_cache'

RSpec.describe UserCache do
  let(:redis) { MockRedis.new }
  let(:cache) { UserCache.new(redis) }

  describe '#fetch' do
    it 'returns nil when key does not exist' do
      expect(cache.fetch(1)).to be_nil
    end

    it 'returns parsed data when key exists' do
      cache.store(1, { name: 'Alice', age: 30 })
      result = cache.fetch(1)
      expect(result['name']).to eq('Alice')
    end
  end

  describe '#invalidate' do
    it 'removes the key from Redis' do
      cache.store(1, { name: 'Bob' })
      cache.invalidate(1)
      expect(cache.fetch(1)).to be_nil
    end
  end
end
```

## Stubbing Redis in RSpec with `before`

```ruby
RSpec.describe MyService do
  let(:mock_redis) { MockRedis.new }

  before do
    allow(Redis).to receive(:new).and_return(mock_redis)
  end

  it 'increments a counter' do
    service = MyService.new
    service.track_visit('home')
    expect(mock_redis.get('visits:home').to_i).to eq(1)
  end
end
```

## Testing Expiry

MockRedis does not automatically advance time, but you can test TTL values:

```ruby
it 'sets a TTL on the key' do
  cache.store(1, { name: 'Alice' }, ttl: 600)
  ttl = redis.ttl("user:1")
  expect(ttl).to be_between(599, 600)
end
```

## Minitest Example

```ruby
require 'minitest/autorun'
require 'mock_redis'

class UserCacheTest < Minitest::Test
  def setup
    @redis = MockRedis.new
    @cache = UserCache.new(@redis)
  end

  def test_store_and_fetch
    @cache.store(42, { role: 'admin' })
    result = @cache.fetch(42)
    assert_equal 'admin', result['role']
  end
end
```

## Summary

The `mock_redis` gem provides a drop-in in-memory replacement for the Redis client that supports all common commands. Injecting the Redis dependency into your classes makes it trivial to swap in `MockRedis.new` during tests, keeping your test suite fast, isolated, and free of external dependencies.
