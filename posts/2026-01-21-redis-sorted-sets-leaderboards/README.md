# How to Use Redis Sorted Sets for Leaderboards and Rankings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Sets, Leaderboards, Rankings, Data Structures, ZADD, ZRANGE, Gaming

Description: A comprehensive guide to using Redis Sorted Sets for building leaderboards and ranking systems, covering ZADD, ZRANGE, ZRANK commands, score-based queries, and practical examples in Python, Node.js, and Go for gaming, analytics, and competitive applications.

---

Redis Sorted Sets combine the uniqueness guarantee of Sets with a score-based ordering system. Each member has an associated score that determines its position in the sorted order. This makes Sorted Sets perfect for leaderboards, rankings, priority queues, and time-series data.

In this guide, we will explore Redis Sorted Sets in depth, covering essential commands, score-based operations, and practical implementations for leaderboards and ranking systems.

## Understanding Sorted Sets

Sorted Sets are collections where each element has:
- A unique member (string)
- A score (floating-point number)

Elements are automatically sorted by score (low to high). For equal scores, members are sorted lexicographically.

Key characteristics:
- O(log N) for add, remove, and update operations
- O(log N + M) for range queries (M = number of elements returned)
- Scores are 64-bit floating-point numbers
- Maximum 2^32 - 1 members

Common use cases:
- Gaming leaderboards
- Activity feeds with timestamps
- Priority queues
- Rate limiting with sliding windows
- Scheduling systems

## Essential Sorted Set Commands

### Adding Elements

```bash
# Add single element
ZADD leaderboard 100 "player1"

# Add multiple elements
ZADD leaderboard 200 "player2" 150 "player3" 175 "player4"

# Add with options
ZADD leaderboard NX 300 "player5"  # Only if not exists
ZADD leaderboard XX 250 "player1"  # Only if exists (update)
ZADD leaderboard GT 180 "player3"  # Only if new score > current
ZADD leaderboard LT 140 "player3"  # Only if new score < current

# Get number of elements added/updated
ZADD leaderboard CH 400 "player1"  # Returns 1 if changed
```

### Retrieving by Rank

```bash
# Get elements by rank (0-based, ascending by score)
ZRANGE leaderboard 0 2
# Returns lowest 3 scores

# Get elements by rank with scores
ZRANGE leaderboard 0 2 WITHSCORES

# Get elements by rank (descending - highest first)
ZRANGE leaderboard 0 2 REV
# or
ZREVRANGE leaderboard 0 2

# Get all elements
ZRANGE leaderboard 0 -1

# Top 10 leaderboard (highest scores first)
ZREVRANGE leaderboard 0 9 WITHSCORES
```

### Retrieving by Score

```bash
# Get elements within score range
ZRANGEBYSCORE leaderboard 100 200
# Elements with scores 100-200 (inclusive)

ZRANGEBYSCORE leaderboard (100 200
# Exclusive lower bound: 100 < score <= 200

ZRANGEBYSCORE leaderboard 100 +inf
# Scores >= 100

ZRANGEBYSCORE leaderboard -inf 200
# Scores <= 200

# With LIMIT (pagination)
ZRANGEBYSCORE leaderboard 0 1000 LIMIT 10 20
# Skip 10, return 20

# Using ZRANGE with BYSCORE (Redis 6.2+)
ZRANGE leaderboard 100 200 BYSCORE WITHSCORES LIMIT 0 10
```

### Rank Operations

```bash
# Get rank of member (ascending, 0-based)
ZRANK leaderboard "player1"
# Returns position from lowest score

# Get rank of member (descending)
ZREVRANK leaderboard "player1"
# Returns position from highest score

# Get score of member
ZSCORE leaderboard "player1"
```

### Modifying Scores

```bash
# Increment score
ZINCRBY leaderboard 50 "player1"
# Returns new score

# Decrement (use negative value)
ZINCRBY leaderboard -20 "player1"
```

### Removing Elements

```bash
# Remove specific members
ZREM leaderboard "player1" "player2"

# Remove by rank range
ZREMRANGEBYRANK leaderboard 0 9
# Remove lowest 10

# Remove by score range
ZREMRANGEBYSCORE leaderboard -inf 100
# Remove all with score <= 100

# Pop elements
ZPOPMIN leaderboard 1  # Remove and return lowest
ZPOPMAX leaderboard 3  # Remove and return 3 highest

# Blocking pop
BZPOPMIN leaderboard 30  # Block up to 30 seconds
BZPOPMAX leaderboard 0   # Block indefinitely
```

### Set Operations

```bash
# Union of sorted sets
ZUNIONSTORE result 2 set1 set2 WEIGHTS 1 2 AGGREGATE SUM
# Combines sets, multiplies scores by weights, sums duplicates

ZUNIONSTORE result 2 set1 set2 AGGREGATE MAX
# Takes maximum score for duplicates

# Intersection
ZINTERSTORE result 2 set1 set2 WEIGHTS 1 1 AGGREGATE MIN
```

### Cardinality and Count

```bash
# Get set size
ZCARD leaderboard

# Count elements in score range
ZCOUNT leaderboard 100 200

# Count elements in lex range (for same scores)
ZLEXCOUNT leaderboard [a [z
```

## Practical Examples

### Python Implementation

```python
import redis
import time
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import json

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# Gaming Leaderboard
# =============================================================================

class Leaderboard:
    def __init__(self, name: str):
        self.key = f"leaderboard:{name}"

    def add_score(self, player_id: str, score: float) -> None:
        """Add or update player score."""
        client.zadd(self.key, {player_id: score})

    def increment_score(self, player_id: str, points: float) -> float:
        """Increment player score."""
        return client.zincrby(self.key, points, player_id)

    def get_rank(self, player_id: str) -> Optional[int]:
        """Get player rank (1-based, highest score = rank 1)."""
        rank = client.zrevrank(self.key, player_id)
        return rank + 1 if rank is not None else None

    def get_score(self, player_id: str) -> Optional[float]:
        """Get player score."""
        return client.zscore(self.key, player_id)

    def get_top(self, count: int = 10) -> List[Tuple[str, float]]:
        """Get top N players."""
        return client.zrevrange(self.key, 0, count - 1, withscores=True)

    def get_around_player(self, player_id: str, count: int = 5) -> List[Tuple[str, float]]:
        """Get players around a specific player."""
        rank = client.zrevrank(self.key, player_id)
        if rank is None:
            return []

        start = max(0, rank - count)
        end = rank + count

        return client.zrevrange(self.key, start, end, withscores=True)

    def get_player_info(self, player_id: str) -> Dict:
        """Get comprehensive player info."""
        pipe = client.pipeline()
        pipe.zrevrank(self.key, player_id)
        pipe.zscore(self.key, player_id)
        pipe.zcard(self.key)
        rank, score, total = pipe.execute()

        if rank is None:
            return None

        return {
            "player_id": player_id,
            "rank": rank + 1,
            "score": score,
            "total_players": total,
            "percentile": round((1 - rank / total) * 100, 2) if total > 0 else 0
        }

    def get_page(self, page: int, page_size: int = 20) -> List[Tuple[str, float]]:
        """Get paginated leaderboard."""
        start = (page - 1) * page_size
        end = start + page_size - 1
        return client.zrevrange(self.key, start, end, withscores=True)

    def get_total_players(self) -> int:
        """Get total number of players."""
        return client.zcard(self.key)

    def remove_player(self, player_id: str) -> None:
        """Remove player from leaderboard."""
        client.zrem(self.key, player_id)


# =============================================================================
# Time-Based Leaderboard (Daily/Weekly/Monthly)
# =============================================================================

class TimedLeaderboard:
    def __init__(self, name: str):
        self.name = name

    def _get_key(self, period: str, date: datetime) -> str:
        if period == "daily":
            return f"leaderboard:{self.name}:daily:{date.strftime('%Y-%m-%d')}"
        elif period == "weekly":
            week = date.isocalendar()[1]
            return f"leaderboard:{self.name}:weekly:{date.year}-W{week}"
        elif period == "monthly":
            return f"leaderboard:{self.name}:monthly:{date.strftime('%Y-%m')}"
        else:  # all-time
            return f"leaderboard:{self.name}:alltime"

    def add_score(self, player_id: str, score: float, timestamp: datetime = None) -> None:
        """Add score to all relevant leaderboards."""
        if timestamp is None:
            timestamp = datetime.now()

        pipe = client.pipeline()

        # Update all time periods
        for period in ["daily", "weekly", "monthly", "alltime"]:
            key = self._get_key(period, timestamp)
            pipe.zincrby(key, score, player_id)

            # Set expiration for periodic leaderboards
            if period == "daily":
                pipe.expire(key, 86400 * 7)  # Keep for 7 days
            elif period == "weekly":
                pipe.expire(key, 86400 * 30)  # Keep for 30 days
            elif period == "monthly":
                pipe.expire(key, 86400 * 365)  # Keep for 1 year

        pipe.execute()

    def get_top(self, period: str, date: datetime = None, count: int = 10) -> List[Tuple[str, float]]:
        """Get top players for a time period."""
        if date is None:
            date = datetime.now()
        key = self._get_key(period, date)
        return client.zrevrange(key, 0, count - 1, withscores=True)


# =============================================================================
# Activity Feed with Timestamps
# =============================================================================

class ActivityFeed:
    def __init__(self, user_id: str, max_items: int = 1000):
        self.key = f"feed:{user_id}"
        self.max_items = max_items

    def add_activity(self, activity_id: str, timestamp: float = None) -> None:
        """Add activity with timestamp as score."""
        if timestamp is None:
            timestamp = time.time()

        pipe = client.pipeline()
        pipe.zadd(self.key, {activity_id: timestamp})
        # Keep only recent items
        pipe.zremrangebyrank(self.key, 0, -(self.max_items + 1))
        pipe.execute()

    def get_recent(self, count: int = 20, before: float = None) -> List[Tuple[str, float]]:
        """Get recent activities."""
        if before is None:
            return client.zrevrange(self.key, 0, count - 1, withscores=True)
        else:
            return client.zrevrangebyscore(
                self.key,
                before,
                "-inf",
                start=0,
                num=count,
                withscores=True
            )

    def get_between(self, start_time: float, end_time: float) -> List[Tuple[str, float]]:
        """Get activities between timestamps."""
        return client.zrangebyscore(self.key, start_time, end_time, withscores=True)

    def remove_old(self, older_than: float) -> int:
        """Remove activities older than timestamp."""
        return client.zremrangebyscore(self.key, "-inf", older_than)


# =============================================================================
# Rate Limiter with Sliding Window
# =============================================================================

class SlidingWindowRateLimiter:
    def __init__(self, key_prefix: str, limit: int, window_seconds: int):
        self.key_prefix = key_prefix
        self.limit = limit
        self.window = window_seconds

    def _get_key(self, identifier: str) -> str:
        return f"ratelimit:{self.key_prefix}:{identifier}"

    def is_allowed(self, identifier: str) -> Tuple[bool, Dict]:
        """Check if request is allowed."""
        key = self._get_key(identifier)
        now = time.time()
        window_start = now - self.window

        pipe = client.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, "-inf", window_start)

        # Count current entries
        pipe.zcard(key)

        # Add new entry
        pipe.zadd(key, {f"{now}": now})

        # Set expiration
        pipe.expire(key, self.window)

        results = pipe.execute()
        current_count = results[1]

        allowed = current_count < self.limit

        return allowed, {
            "allowed": allowed,
            "current_count": current_count,
            "limit": self.limit,
            "remaining": max(0, self.limit - current_count - 1),
            "reset_at": now + self.window
        }


# =============================================================================
# Priority Queue
# =============================================================================

class PriorityQueue:
    def __init__(self, name: str):
        self.key = f"pq:{name}"

    def push(self, item: str, priority: float) -> None:
        """Add item with priority (lower = higher priority)."""
        client.zadd(self.key, {item: priority})

    def pop(self) -> Optional[Tuple[str, float]]:
        """Remove and return highest priority item."""
        result = client.zpopmin(self.key, 1)
        return result[0] if result else None

    def pop_blocking(self, timeout: int = 0) -> Optional[Tuple[str, float]]:
        """Block until item available."""
        result = client.bzpopmin(self.key, timeout)
        if result:
            return (result[1], result[2])
        return None

    def peek(self) -> Optional[Tuple[str, float]]:
        """View highest priority item without removing."""
        result = client.zrange(self.key, 0, 0, withscores=True)
        return result[0] if result else None

    def size(self) -> int:
        """Get queue size."""
        return client.zcard(self.key)

    def remove(self, item: str) -> bool:
        """Remove specific item."""
        return client.zrem(self.key, item) > 0


# =============================================================================
# Scheduled Tasks
# =============================================================================

class TaskScheduler:
    def __init__(self, name: str):
        self.key = f"scheduler:{name}"

    def schedule(self, task_id: str, run_at: float) -> None:
        """Schedule task to run at specific timestamp."""
        client.zadd(self.key, {task_id: run_at})

    def schedule_delay(self, task_id: str, delay_seconds: float) -> None:
        """Schedule task to run after delay."""
        run_at = time.time() + delay_seconds
        self.schedule(task_id, run_at)

    def get_due_tasks(self, limit: int = 100) -> List[str]:
        """Get tasks that are due for execution."""
        now = time.time()
        tasks = client.zrangebyscore(self.key, "-inf", now, start=0, num=limit)
        return tasks

    def complete_task(self, task_id: str) -> None:
        """Mark task as completed (remove from schedule)."""
        client.zrem(self.key, task_id)

    def reschedule(self, task_id: str, new_time: float) -> None:
        """Reschedule a task."""
        client.zadd(self.key, {task_id: new_time})

    def get_next_task_time(self) -> Optional[float]:
        """Get timestamp of next scheduled task."""
        result = client.zrange(self.key, 0, 0, withscores=True)
        return result[0][1] if result else None


# =============================================================================
# Trending Items
# =============================================================================

class TrendingTracker:
    def __init__(self, name: str, decay_factor: float = 0.9):
        self.name = name
        self.decay_factor = decay_factor

    def _get_key(self) -> str:
        return f"trending:{self.name}"

    def record_event(self, item_id: str, weight: float = 1.0) -> float:
        """Record an event for an item."""
        return client.zincrby(self._get_key(), weight, item_id)

    def get_trending(self, count: int = 10) -> List[Tuple[str, float]]:
        """Get top trending items."""
        return client.zrevrange(self._get_key(), 0, count - 1, withscores=True)

    def decay_scores(self) -> None:
        """Apply decay to all scores (run periodically)."""
        key = self._get_key()
        items = client.zrange(key, 0, -1, withscores=True)

        if items:
            pipe = client.pipeline()
            for item, score in items:
                new_score = score * self.decay_factor
                if new_score < 0.1:
                    pipe.zrem(key, item)
                else:
                    pipe.zadd(key, {item: new_score})
            pipe.execute()


# =============================================================================
# Usage Examples
# =============================================================================

# Gaming Leaderboard
leaderboard = Leaderboard("global")
leaderboard.add_score("player1", 1000)
leaderboard.add_score("player2", 1500)
leaderboard.add_score("player3", 1200)
leaderboard.increment_score("player1", 200)

print("Top 10:", leaderboard.get_top(10))
print("Player info:", leaderboard.get_player_info("player1"))
print("Around player1:", leaderboard.get_around_player("player1", 2))

# Time-based Leaderboard
timed = TimedLeaderboard("game")
timed.add_score("player1", 100)
timed.add_score("player2", 150)
timed.add_score("player1", 50)

print("Daily top:", timed.get_top("daily"))
print("All-time top:", timed.get_top("alltime"))

# Activity Feed
feed = ActivityFeed("user123")
for i in range(5):
    feed.add_activity(f"activity_{i}")
    time.sleep(0.01)

print("Recent activities:", feed.get_recent(3))

# Rate Limiter
limiter = SlidingWindowRateLimiter("api", limit=10, window_seconds=60)
for i in range(12):
    allowed, info = limiter.is_allowed("user1")
    print(f"Request {i+1}: {allowed}, remaining: {info['remaining']}")

# Priority Queue
pq = PriorityQueue("tasks")
pq.push("low_priority_task", 10)
pq.push("high_priority_task", 1)
pq.push("medium_priority_task", 5)

print("Next task:", pq.pop())  # high_priority_task
print("Next task:", pq.pop())  # medium_priority_task

# Task Scheduler
scheduler = TaskScheduler("jobs")
scheduler.schedule_delay("task1", 5)
scheduler.schedule_delay("task2", 10)
scheduler.schedule("task3", time.time() - 1)  # Due immediately

print("Due tasks:", scheduler.get_due_tasks())
print("Next task time:", scheduler.get_next_task_time())

# Trending Items
trending = TrendingTracker("articles")
trending.record_event("article1", 5)
trending.record_event("article2", 3)
trending.record_event("article1", 2)

print("Trending:", trending.get_trending(5))
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// Gaming Leaderboard
// =============================================================================

class Leaderboard {
  constructor(name) {
    this.key = `leaderboard:${name}`;
  }

  async addScore(playerId, score) {
    await redis.zadd(this.key, score, playerId);
  }

  async incrementScore(playerId, points) {
    return await redis.zincrby(this.key, points, playerId);
  }

  async getRank(playerId) {
    const rank = await redis.zrevrank(this.key, playerId);
    return rank !== null ? rank + 1 : null;
  }

  async getScore(playerId) {
    return await redis.zscore(this.key, playerId);
  }

  async getTop(count = 10) {
    return await redis.zrevrange(this.key, 0, count - 1, 'WITHSCORES');
  }

  async getAroundPlayer(playerId, count = 5) {
    const rank = await redis.zrevrank(this.key, playerId);
    if (rank === null) return [];

    const start = Math.max(0, rank - count);
    const end = rank + count;

    return await redis.zrevrange(this.key, start, end, 'WITHSCORES');
  }

  async getPlayerInfo(playerId) {
    const pipeline = redis.pipeline();
    pipeline.zrevrank(this.key, playerId);
    pipeline.zscore(this.key, playerId);
    pipeline.zcard(this.key);

    const [[, rank], [, score], [, total]] = await pipeline.exec();

    if (rank === null) return null;

    return {
      playerId,
      rank: rank + 1,
      score: parseFloat(score),
      totalPlayers: total,
      percentile: total > 0 ? Math.round((1 - rank / total) * 10000) / 100 : 0,
    };
  }

  async getPage(page, pageSize = 20) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    return await redis.zrevrange(this.key, start, end, 'WITHSCORES');
  }
}

// =============================================================================
// Activity Feed
// =============================================================================

class ActivityFeed {
  constructor(userId, maxItems = 1000) {
    this.key = `feed:${userId}`;
    this.maxItems = maxItems;
  }

  async addActivity(activityId, timestamp = null) {
    if (timestamp === null) {
      timestamp = Date.now() / 1000;
    }

    const pipeline = redis.pipeline();
    pipeline.zadd(this.key, timestamp, activityId);
    pipeline.zremrangebyrank(this.key, 0, -(this.maxItems + 1));
    await pipeline.exec();
  }

  async getRecent(count = 20) {
    return await redis.zrevrange(this.key, 0, count - 1, 'WITHSCORES');
  }

  async getBetween(startTime, endTime) {
    return await redis.zrangebyscore(this.key, startTime, endTime, 'WITHSCORES');
  }
}

// =============================================================================
// Sliding Window Rate Limiter
// =============================================================================

class SlidingWindowRateLimiter {
  constructor(keyPrefix, limit, windowSeconds) {
    this.keyPrefix = keyPrefix;
    this.limit = limit;
    this.window = windowSeconds;
  }

  async isAllowed(identifier) {
    const key = `ratelimit:${this.keyPrefix}:${identifier}`;
    const now = Date.now() / 1000;
    const windowStart = now - this.window;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}`);
    pipeline.expire(key, this.window);

    const results = await pipeline.exec();
    const currentCount = results[1][1];

    const allowed = currentCount < this.limit;

    return {
      allowed,
      currentCount,
      limit: this.limit,
      remaining: Math.max(0, this.limit - currentCount - 1),
      resetAt: now + this.window,
    };
  }
}

// =============================================================================
// Priority Queue
// =============================================================================

class PriorityQueue {
  constructor(name) {
    this.key = `pq:${name}`;
  }

  async push(item, priority) {
    await redis.zadd(this.key, priority, item);
  }

  async pop() {
    const result = await redis.zpopmin(this.key, 1);
    return result.length ? [result[0], parseFloat(result[1])] : null;
  }

  async popBlocking(timeout = 0) {
    const result = await redis.bzpopmin(this.key, timeout);
    return result ? [result[1], parseFloat(result[2])] : null;
  }

  async peek() {
    const result = await redis.zrange(this.key, 0, 0, 'WITHSCORES');
    return result.length ? [result[0], parseFloat(result[1])] : null;
  }

  async size() {
    return await redis.zcard(this.key);
  }
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  // Gaming Leaderboard
  const leaderboard = new Leaderboard('global');
  await leaderboard.addScore('player1', 1000);
  await leaderboard.addScore('player2', 1500);
  await leaderboard.addScore('player3', 1200);
  await leaderboard.incrementScore('player1', 200);

  console.log('Top 10:', await leaderboard.getTop(10));
  console.log('Player info:', await leaderboard.getPlayerInfo('player1'));

  // Activity Feed
  const feed = new ActivityFeed('user123');
  for (let i = 0; i < 5; i++) {
    await feed.addActivity(`activity_${i}`);
  }
  console.log('Recent activities:', await feed.getRecent(3));

  // Rate Limiter
  const limiter = new SlidingWindowRateLimiter('api', 10, 60);
  for (let i = 0; i < 12; i++) {
    const result = await limiter.isAllowed('user1');
    console.log(`Request ${i + 1}: ${result.allowed}, remaining: ${result.remaining}`);
  }

  // Priority Queue
  const pq = new PriorityQueue('tasks');
  await pq.push('low_priority', 10);
  await pq.push('high_priority', 1);
  await pq.push('medium_priority', 5);

  console.log('Next task:', await pq.pop());
  console.log('Next task:', await pq.pop());

  redis.disconnect();
}

main().catch(console.error);
```

### Go Implementation

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
}

// =============================================================================
// Leaderboard
// =============================================================================

type Leaderboard struct {
    Key string
}

func NewLeaderboard(name string) *Leaderboard {
    return &Leaderboard{Key: fmt.Sprintf("leaderboard:%s", name)}
}

func (l *Leaderboard) AddScore(playerID string, score float64) error {
    return client.ZAdd(ctx, l.Key, redis.Z{Score: score, Member: playerID}).Err()
}

func (l *Leaderboard) IncrementScore(playerID string, points float64) (float64, error) {
    return client.ZIncrBy(ctx, l.Key, points, playerID).Result()
}

func (l *Leaderboard) GetRank(playerID string) (int64, error) {
    rank, err := client.ZRevRank(ctx, l.Key, playerID).Result()
    if err != nil {
        return -1, err
    }
    return rank + 1, nil
}

func (l *Leaderboard) GetTop(count int64) ([]redis.Z, error) {
    return client.ZRevRangeWithScores(ctx, l.Key, 0, count-1).Result()
}

type PlayerInfo struct {
    PlayerID     string
    Rank         int64
    Score        float64
    TotalPlayers int64
    Percentile   float64
}

func (l *Leaderboard) GetPlayerInfo(playerID string) (*PlayerInfo, error) {
    pipe := client.Pipeline()
    rankCmd := pipe.ZRevRank(ctx, l.Key, playerID)
    scoreCmd := pipe.ZScore(ctx, l.Key, playerID)
    totalCmd := pipe.ZCard(ctx, l.Key)

    _, err := pipe.Exec(ctx)
    if err != nil {
        return nil, err
    }

    rank := rankCmd.Val()
    score := scoreCmd.Val()
    total := totalCmd.Val()

    percentile := 0.0
    if total > 0 {
        percentile = (1 - float64(rank)/float64(total)) * 100
    }

    return &PlayerInfo{
        PlayerID:     playerID,
        Rank:         rank + 1,
        Score:        score,
        TotalPlayers: total,
        Percentile:   percentile,
    }, nil
}

// =============================================================================
// Rate Limiter
// =============================================================================

type SlidingWindowRateLimiter struct {
    KeyPrefix string
    Limit     int64
    Window    time.Duration
}

type RateLimitResult struct {
    Allowed      bool
    CurrentCount int64
    Limit        int64
    Remaining    int64
    ResetAt      float64
}

func NewRateLimiter(prefix string, limit int64, window time.Duration) *SlidingWindowRateLimiter {
    return &SlidingWindowRateLimiter{
        KeyPrefix: prefix,
        Limit:     limit,
        Window:    window,
    }
}

func (r *SlidingWindowRateLimiter) IsAllowed(identifier string) (*RateLimitResult, error) {
    key := fmt.Sprintf("ratelimit:%s:%s", r.KeyPrefix, identifier)
    now := float64(time.Now().UnixNano()) / 1e9
    windowStart := now - r.Window.Seconds()

    pipe := client.Pipeline()
    pipe.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%f", windowStart))
    countCmd := pipe.ZCard(ctx, key)
    pipe.ZAdd(ctx, key, redis.Z{Score: now, Member: fmt.Sprintf("%f", now)})
    pipe.Expire(ctx, key, r.Window)

    _, err := pipe.Exec(ctx)
    if err != nil {
        return nil, err
    }

    currentCount := countCmd.Val()
    allowed := currentCount < r.Limit

    return &RateLimitResult{
        Allowed:      allowed,
        CurrentCount: currentCount,
        Limit:        r.Limit,
        Remaining:    max(0, r.Limit-currentCount-1),
        ResetAt:      now + r.Window.Seconds(),
    }, nil
}

func max(a, b int64) int64 {
    if a > b {
        return a
    }
    return b
}

// =============================================================================
// Priority Queue
// =============================================================================

type PriorityQueue struct {
    Key string
}

func NewPriorityQueue(name string) *PriorityQueue {
    return &PriorityQueue{Key: fmt.Sprintf("pq:%s", name)}
}

func (p *PriorityQueue) Push(item string, priority float64) error {
    return client.ZAdd(ctx, p.Key, redis.Z{Score: priority, Member: item}).Err()
}

func (p *PriorityQueue) Pop() (string, float64, error) {
    result, err := client.ZPopMin(ctx, p.Key, 1).Result()
    if err != nil || len(result) == 0 {
        return "", 0, err
    }
    return result[0].Member.(string), result[0].Score, nil
}

func (p *PriorityQueue) Size() (int64, error) {
    return client.ZCard(ctx, p.Key).Result()
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    // Leaderboard
    lb := NewLeaderboard("global")
    lb.AddScore("player1", 1000)
    lb.AddScore("player2", 1500)
    lb.AddScore("player3", 1200)
    lb.IncrementScore("player1", 200)

    top, _ := lb.GetTop(10)
    fmt.Println("Top 10:")
    for _, item := range top {
        fmt.Printf("  %s: %.0f\n", item.Member, item.Score)
    }

    info, _ := lb.GetPlayerInfo("player1")
    fmt.Printf("Player info: %+v\n", info)

    // Rate Limiter
    limiter := NewRateLimiter("api", 10, time.Minute)
    for i := 0; i < 12; i++ {
        result, _ := limiter.IsAllowed("user1")
        fmt.Printf("Request %d: allowed=%v, remaining=%d\n",
            i+1, result.Allowed, result.Remaining)
    }

    // Priority Queue
    pq := NewPriorityQueue("tasks")
    pq.Push("low_priority", 10)
    pq.Push("high_priority", 1)
    pq.Push("medium_priority", 5)

    for i := 0; i < 3; i++ {
        item, priority, _ := pq.Pop()
        fmt.Printf("Task: %s (priority: %.0f)\n", item, priority)
    }
}
```

## Best Practices

1. **Use ZRANGEBYSCORE for time ranges** - Efficient for timestamp-based queries
2. **Use ZREVRANGE for leaderboards** - Highest scores first
3. **Implement pagination** - Use LIMIT for large result sets
4. **Consider memory** - Sorted sets use more memory than plain sets
5. **Use ZINCRBY for atomic updates** - Thread-safe score updates

## Conclusion

Redis Sorted Sets are incredibly versatile for any use case requiring ordered data with scores. Key takeaways:

- Use sorted sets for leaderboards, rankings, and priority queues
- Leverage score-based range queries for time-series data
- Use ZINCRBY for atomic score updates
- Implement pagination with LIMIT for large datasets
- Consider blocking operations (BZPOPMIN/MAX) for queue consumers

Redis Sorted Sets' logarithmic complexity and rich command set make them ideal for real-time leaderboards, activity feeds, rate limiting, and scheduling systems.
