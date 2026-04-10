# How to Use Redis Sets and Sorted Sets in Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby, Set, Sorted Set, Leaderboard

Description: Learn how to use Redis Sets and Sorted Sets in Ruby with redis-rb for unique collections, set operations, and score-ranked data like leaderboards.

---

Redis Sets store unique unordered members, while Sorted Sets attach a floating-point score to each member for ordered retrieval. Both types support powerful operations out of the box with redis-rb.

## Redis Sets

```ruby
require 'redis'

redis = Redis.new

# Add members
redis.sadd('tags:post:1', ['ruby', 'redis', 'tutorial'])

# Add multiple
redis.sadd('tags:post:2', ['ruby', 'rails', 'web'])

# Check membership
redis.sismember('tags:post:1', 'redis')  # true
redis.sismember('tags:post:1', 'rails')  # false

# Count members
redis.scard('tags:post:1')  # 3

# Get all members
redis.smembers('tags:post:1')  # ["ruby", "redis", "tutorial"]

# Remove a member
redis.srem('tags:post:1', 'tutorial')
```

## Set Operations

```ruby
# Union (all unique tags across posts)
union = redis.sunion('tags:post:1', 'tags:post:2')
# ["ruby", "redis", "rails", "web"]

# Intersection (tags on both posts)
inter = redis.sinter('tags:post:1', 'tags:post:2')
# ["ruby"]

# Difference (tags in post:1 not in post:2)
diff = redis.sdiff('tags:post:1', 'tags:post:2')
# ["redis"]

# Store results in a new key
redis.sinterstore('common:tags', 'tags:post:1', 'tags:post:2')
```

## Redis Sorted Sets

```ruby
# Add members with scores
redis.zadd('leaderboard', 1500, 'alice')
redis.zadd('leaderboard', 2300, 'bob')
redis.zadd('leaderboard', 1900, 'carol')
redis.zadd('leaderboard', 3100, 'dave')

# Get top 3 with scores (highest first)
top3 = redis.zrevrange('leaderboard', 0, 2, with_scores: true)
# [["dave", 3100.0], ["bob", 2300.0], ["carol", 1900.0]]

# Rank (0-based, ascending)
redis.zrank('leaderboard', 'alice')      # 0 (lowest score)
redis.zrevrank('leaderboard', 'dave')    # 0 (highest score)

# Score of a member
redis.zscore('leaderboard', 'bob')       # 2300.0
```

## Score Range Queries

```ruby
# Members with scores between 1500 and 2500
redis.zrangebyscore('leaderboard', 1500, 2500)
# ["alice", "carol", "bob"]

# With scores
redis.zrangebyscore('leaderboard', 1500, 2500, with_scores: true)
# [["alice", 1500.0], ["carol", 1900.0], ["bob", 2300.0]]

# Limit results
redis.zrangebyscore('leaderboard', '-inf', '+inf', limit: [0, 2])
```

## Incrementing Scores

```ruby
new_score = redis.zincrby('leaderboard', 200, 'alice')
puts "Alice new score: #{new_score}"  # 1700.0
```

## Removing Members

```ruby
redis.zrem('leaderboard', 'alice')

# Remove by rank range
redis.zremrangebyrank('leaderboard', 0, 0)  # remove lowest ranked

# Remove by score range
redis.zremrangebyscore('leaderboard', 0, 1000)
```

## Practical Example - Trending Articles

```ruby
def record_view(redis, article_id)
  redis.zincrby('trending:articles', 1, "article:#{article_id}")
end

def top_articles(redis, n: 10)
  redis.zrevrange('trending:articles', 0, n - 1, with_scores: true)
end

record_view(redis, 42)
record_view(redis, 42)
record_view(redis, 99)

top = top_articles(redis, n: 5)
top.each { |id, views| puts "#{id}: #{views.to_i} views" }
```

## Summary

Redis Sets and Sorted Sets are powerful primitives for unique collections and ranked data in Ruby. Sets support fast membership tests and union/intersection operations. Sorted Sets add score-based ordering for leaderboards, priority queues, and trending content. redis-rb exposes the full command set with an idiomatic Ruby API.
