# How to Use RedisBloom for Probabilistic Data Structures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisBloom, Bloom Filter, Probabilistic, Cuckoo Filter, Count-Min Sketch, Top-K

Description: A comprehensive guide to using RedisBloom for probabilistic data structures, covering Bloom filters, Cuckoo filters, Count-Min Sketch, and Top-K for memory-efficient approximate operations.

---

RedisBloom is a Redis module that provides probabilistic data structures - data structures that trade perfect accuracy for massive memory savings and O(1) operations. These are essential tools for handling large-scale data when exact answers are not required.

## Why Probabilistic Data Structures?

Consider these scenarios:

- Check if a username exists among 1 billion users
- Count unique visitors to a website
- Find the top 100 most frequent search terms
- Estimate how many times each API endpoint was called

Exact solutions would require storing all data, consuming massive memory. Probabilistic structures solve these with:

- **Constant Memory**: Fixed size regardless of data volume
- **O(1) Operations**: Constant time adds and queries
- **Acceptable Error Rates**: Configurable accuracy trade-offs

## Installation

### Using Redis Stack

```bash
# Docker
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

# Verify
redis-cli BF.ADD test_filter test_item
```

### Using RedisBloom Module

```bash
# Load module
redis-server --loadmodule /path/to/redisbloom.so
```

## Python Client Setup

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
```

## Bloom Filter

A Bloom filter is a space-efficient probabilistic structure that answers: "Is this element possibly in the set?" It may return false positives but never false negatives.

### Basic Operations

```python
# Create a Bloom filter
# Parameters: error_rate (0.01 = 1%), initial_capacity
r.bf().create("bf:emails", 0.01, 1000000)

# Add items
r.bf().add("bf:emails", "user1@example.com")

# Add multiple items
r.bf().madd("bf:emails", "user2@example.com", "user3@example.com", "user4@example.com")

# Check if exists
exists = r.bf().exists("bf:emails", "user1@example.com")  # True
not_exists = r.bf().exists("bf:emails", "unknown@example.com")  # False (probably)

# Check multiple
results = r.bf().mexists("bf:emails", "user1@example.com", "user5@example.com")
# Returns [True, False]

# Get info
info = r.bf().info("bf:emails")
print(f"Capacity: {info.capacity}")
print(f"Size: {info.size}")
print(f"Number of filters: {info.filterNum}")
print(f"Items inserted: {info.insertedNum}")
```

### Scaling Bloom Filters

```python
# Create a scaling Bloom filter (grows automatically)
r.bf().create(
    "bf:scaling",
    0.01,  # Error rate
    1000,  # Initial capacity
    expansion=2,  # Growth factor when full
    nonscaling=False  # Allow scaling
)

# Insert more items than initial capacity
for i in range(5000):
    r.bf().add("bf:scaling", f"item_{i}")

# Check info - will show multiple sub-filters
info = r.bf().info("bf:scaling")
print(f"Number of sub-filters: {info.filterNum}")
```

### Practical Example: Username Uniqueness Check

```python
class UsernameChecker:
    def __init__(self, redis_client, error_rate=0.001, capacity=10000000):
        self.r = redis_client
        self.key = "bf:usernames"

        # Create filter if not exists
        try:
            self.r.bf().create(self.key, error_rate, capacity)
        except redis.ResponseError:
            pass  # Already exists

    def is_username_taken(self, username):
        """
        Check if username is taken.
        Returns: True if definitely available, False if possibly taken.
        """
        normalized = username.lower().strip()

        if self.r.bf().exists(self.key, normalized):
            # Might be a false positive - verify in database
            return True  # Probably taken

        return False  # Definitely not taken

    def register_username(self, username):
        """Register a new username."""
        normalized = username.lower().strip()
        self.r.bf().add(self.key, normalized)

    def check_availability(self, username):
        """
        Full availability check.
        Only hits database if Bloom filter says 'maybe exists'.
        """
        normalized = username.lower().strip()

        # Fast path: Bloom filter says definitely not exists
        if not self.r.bf().exists(self.key, normalized):
            return True, "Username is available"

        # Slow path: Bloom filter says maybe exists, check database
        # exists_in_db = database_check(normalized)
        exists_in_db = False  # Placeholder

        if exists_in_db:
            return False, "Username is taken"
        else:
            return True, "Username is available (false positive from filter)"


# Usage
checker = UsernameChecker(r)

# Register some usernames
checker.register_username("alice")
checker.register_username("bob")

# Check availability
print(checker.check_availability("alice"))  # (False, "Username is taken")
print(checker.check_availability("charlie"))  # (True, "Username is available")
```

## Cuckoo Filter

Cuckoo filters are similar to Bloom filters but support deletion and often have better space efficiency for low false positive rates.

### Basic Operations

```python
# Create a Cuckoo filter
r.cf().create("cf:sessions", 1000000)

# Add items
r.cf().add("cf:sessions", "session_abc123")

# Add only if not exists
added = r.cf().addnx("cf:sessions", "session_xyz789")  # Returns 1 if added

# Check if exists
exists = r.cf().exists("cf:sessions", "session_abc123")  # True

# Delete an item (not possible with Bloom filter!)
deleted = r.cf().delete("cf:sessions", "session_abc123")  # Returns 1 if deleted

# Get info
info = r.cf().info("cf:sessions")
print(f"Size: {info.size}")
print(f"Number of buckets: {info.num_buckets}")
print(f"Number of items: {info.num_items}")
```

### Practical Example: Session Management

```python
class SessionManager:
    def __init__(self, redis_client, capacity=1000000):
        self.r = redis_client
        self.filter_key = "cf:active_sessions"

        try:
            self.r.cf().create(self.filter_key, capacity)
        except redis.ResponseError:
            pass

    def create_session(self, session_id, user_id, ttl=3600):
        """Create a new session."""
        # Store session data
        self.r.hset(f"session:{session_id}", mapping={
            "user_id": user_id,
            "created_at": int(time.time())
        })
        self.r.expire(f"session:{session_id}", ttl)

        # Add to Cuckoo filter for fast existence check
        self.r.cf().add(self.filter_key, session_id)

    def is_session_active(self, session_id):
        """Quick check if session might be active."""
        return self.r.cf().exists(self.filter_key, session_id)

    def validate_session(self, session_id):
        """
        Full session validation.
        Uses Cuckoo filter to avoid unnecessary Redis lookups.
        """
        # Fast path: filter says definitely not active
        if not self.r.cf().exists(self.filter_key, session_id):
            return None

        # Slow path: might be active, check full data
        session_data = self.r.hgetall(f"session:{session_id}")

        if not session_data:
            # False positive from filter, clean it up
            self.r.cf().delete(self.filter_key, session_id)
            return None

        return session_data

    def end_session(self, session_id):
        """End a session."""
        self.r.delete(f"session:{session_id}")
        self.r.cf().delete(self.filter_key, session_id)


# Usage
sessions = SessionManager(r)

# Create session
sessions.create_session("sess_123", "user_456")

# Validate
data = sessions.validate_session("sess_123")
print(f"Session data: {data}")

# End session
sessions.end_session("sess_123")
```

## Count-Min Sketch

Count-Min Sketch estimates the frequency of items in a stream. It may overestimate counts but never underestimates.

### Basic Operations

```python
# Create a Count-Min Sketch
# initbyprob: error_rate, probability_of_error
r.cms().initbyprob("cms:pageviews", 0.01, 0.001)

# Or by dimensions
# initbydim: width (columns), depth (rows)
r.cms().initbydim("cms:clicks", 2000, 10)

# Increment counts
r.cms().incrby("cms:pageviews", ["page:/home", 1])
r.cms().incrby("cms:pageviews", ["page:/about", 1, "page:/home", 1, "page:/contact", 1])

# Bulk increment
r.cms().incrby("cms:pageviews", [
    "page:/home", 5,
    "page:/products", 10,
    "page:/checkout", 3
])

# Query counts
counts = r.cms().query("cms:pageviews", "page:/home", "page:/about", "page:/unknown")
print(f"Counts: {counts}")  # [7, 1, 0]

# Get info
info = r.cms().info("cms:pageviews")
print(f"Width: {info.width}")
print(f"Depth: {info.depth}")
print(f"Count: {info.count}")
```

### Practical Example: API Rate Tracking

```python
import time

class APIRateTracker:
    def __init__(self, redis_client):
        self.r = redis_client
        self.setup_sketches()

    def setup_sketches(self):
        """Create sketches for different time windows."""
        # Per-minute sketch
        try:
            self.r.cms().initbyprob("cms:api:minute", 0.001, 0.0001)
        except redis.ResponseError:
            pass

        # Per-hour sketch
        try:
            self.r.cms().initbyprob("cms:api:hour", 0.001, 0.0001)
        except redis.ResponseError:
            pass

    def _get_minute_key(self):
        return f"cms:api:minute:{int(time.time() // 60)}"

    def _get_hour_key(self):
        return f"cms:api:hour:{int(time.time() // 3600)}"

    def record_request(self, endpoint, user_id=None, ip=None):
        """Record an API request."""
        minute_key = self._get_minute_key()
        hour_key = self._get_hour_key()

        # Create time-windowed sketches if needed
        pipe = self.r.pipeline()

        # Record by endpoint
        pipe.cms().incrby(minute_key, [endpoint, 1])
        pipe.expire(minute_key, 120)  # Keep 2 minutes

        pipe.cms().incrby(hour_key, [endpoint, 1])
        pipe.expire(hour_key, 7200)  # Keep 2 hours

        # Record by user if provided
        if user_id:
            user_key = f"{minute_key}:user"
            pipe.cms().incrby(user_key, [user_id, 1])
            pipe.expire(user_key, 120)

        # Record by IP
        if ip:
            ip_key = f"{minute_key}:ip"
            pipe.cms().incrby(ip_key, [ip, 1])
            pipe.expire(ip_key, 120)

        pipe.execute()

    def get_endpoint_rate(self, endpoint, window="minute"):
        """Get approximate request count for an endpoint."""
        if window == "minute":
            key = self._get_minute_key()
        else:
            key = self._get_hour_key()

        try:
            counts = self.r.cms().query(key, endpoint)
            return counts[0] if counts else 0
        except redis.ResponseError:
            return 0

    def get_user_rate(self, user_id):
        """Get approximate request count for a user in current minute."""
        key = f"{self._get_minute_key()}:user"
        try:
            counts = self.r.cms().query(key, user_id)
            return counts[0] if counts else 0
        except redis.ResponseError:
            return 0

    def check_rate_limit(self, identifier, limit, window="minute"):
        """Check if identifier has exceeded rate limit."""
        if window == "minute":
            key = self._get_minute_key()
        else:
            key = self._get_hour_key()

        try:
            counts = self.r.cms().query(key, identifier)
            current = counts[0] if counts else 0
            return current >= limit, current
        except redis.ResponseError:
            return False, 0


# Usage
tracker = APIRateTracker(r)

# Record requests
for i in range(100):
    tracker.record_request("/api/users", user_id="user_123", ip="192.168.1.1")

for i in range(50):
    tracker.record_request("/api/products", user_id="user_456")

# Check rates
print(f"/api/users rate: {tracker.get_endpoint_rate('/api/users')}")
print(f"/api/products rate: {tracker.get_endpoint_rate('/api/products')}")
print(f"user_123 rate: {tracker.get_user_rate('user_123')}")

# Check rate limit
exceeded, count = tracker.check_rate_limit("user_123", 50, "minute")
print(f"Rate limit exceeded: {exceeded}, count: {count}")
```

## Top-K

Top-K tracks the most frequent items in a stream using minimal memory.

### Basic Operations

```python
# Create a Top-K structure
# Parameters: key, k (top items to track), width, depth, decay
r.topk().create("topk:searches", 10, 2000, 7, 0.9)

# Add items
r.topk().add("topk:searches", "redis tutorial", "python redis", "how to cache")

# Add with counts
r.topk().incrby("topk:searches", ["redis tutorial", 5, "python redis", 3])

# Get the top-k list
top_items = r.topk().list("topk:searches")
print(f"Top searches: {top_items}")

# List with counts
top_with_counts = r.topk().list("topk:searches", withcount=True)
print(f"Top searches with counts: {top_with_counts}")

# Check if item is in top-k
is_top = r.topk().query("topk:searches", "redis tutorial", "unknown query")
# Returns [1, 0] - 1 if in top-k, 0 otherwise

# Get count for specific items
counts = r.topk().count("topk:searches", "redis tutorial", "python redis")
print(f"Counts: {counts}")

# Get info
info = r.topk().info("topk:searches")
print(f"K: {info.k}")
print(f"Width: {info.width}")
print(f"Depth: {info.depth}")
print(f"Decay: {info.decay}")
```

### Practical Example: Trending Topics

```python
import time

class TrendingTracker:
    def __init__(self, redis_client, top_k=100):
        self.r = redis_client
        self.k = top_k
        self.setup_trackers()

    def setup_trackers(self):
        """Create Top-K structures for different time windows."""
        trackers = [
            "topk:trending:hour",
            "topk:trending:day",
            "topk:trending:week"
        ]

        for tracker in trackers:
            try:
                # k, width, depth, decay
                self.r.topk().create(tracker, self.k, 8000, 7, 0.9)
            except redis.ResponseError:
                pass  # Already exists

    def record_topic(self, topic, weight=1):
        """Record a topic mention/interaction."""
        # Normalize topic
        topic = topic.lower().strip()

        # Record in all time windows
        pipe = self.r.pipeline()
        pipe.topk().incrby("topk:trending:hour", [topic, weight])
        pipe.topk().incrby("topk:trending:day", [topic, weight])
        pipe.topk().incrby("topk:trending:week", [topic, weight])
        pipe.execute()

    def get_trending(self, window="hour", limit=10):
        """Get trending topics for a time window."""
        key = f"topk:trending:{window}"

        try:
            # Get top items with counts
            items = self.r.topk().list(key, withcount=True)

            # Format results
            trending = []
            for i in range(0, len(items), 2):
                if i + 1 < len(items):
                    trending.append({
                        "topic": items[i],
                        "score": items[i + 1]
                    })

            return trending[:limit]
        except redis.ResponseError:
            return []

    def is_trending(self, topic, window="hour"):
        """Check if a topic is trending."""
        topic = topic.lower().strip()
        key = f"topk:trending:{window}"

        try:
            result = self.r.topk().query(key, topic)
            return result[0] == 1
        except redis.ResponseError:
            return False

    def get_topic_rank(self, topic, window="hour"):
        """Get the rank of a topic in trending."""
        topic = topic.lower().strip()
        key = f"topk:trending:{window}"

        try:
            items = self.r.topk().list(key)
            if topic in items:
                return items.index(topic) + 1
            return None
        except redis.ResponseError:
            return None


# Usage
trending = TrendingTracker(r, top_k=50)

# Simulate topic mentions
topics = [
    ("redis", 100),
    ("python", 80),
    ("machine learning", 60),
    ("kubernetes", 50),
    ("docker", 40),
    ("aws", 30),
    ("redis", 20),  # More redis mentions
    ("python", 15),
]

for topic, count in topics:
    for _ in range(count):
        trending.record_topic(topic)

# Get trending
print("Trending topics (hour):")
for item in trending.get_trending("hour", 5):
    print(f"  {item['topic']}: {item['score']}")

# Check if specific topic is trending
print(f"\nIs 'redis' trending? {trending.is_trending('redis')}")
print(f"'redis' rank: {trending.get_topic_rank('redis')}")
```

## Combining Structures

### Unique Visitors with Approximate Counts

```python
class VisitorAnalytics:
    def __init__(self, redis_client):
        self.r = redis_client

    def setup(self, page_id):
        """Setup tracking for a page."""
        # Bloom filter for unique visitor detection
        try:
            self.r.bf().create(f"bf:visitors:{page_id}", 0.01, 100000)
        except redis.ResponseError:
            pass

        # Count-Min Sketch for view counts
        try:
            self.r.cms().initbyprob(f"cms:views:{page_id}", 0.001, 0.0001)
        except redis.ResponseError:
            pass

    def record_visit(self, page_id, visitor_id):
        """Record a page visit."""
        bf_key = f"bf:visitors:{page_id}"
        cms_key = f"cms:views:{page_id}"

        # Check if new visitor
        is_new = not self.r.bf().exists(bf_key, visitor_id)

        pipe = self.r.pipeline()

        # Add to Bloom filter
        pipe.bf().add(bf_key, visitor_id)

        # Increment total views
        pipe.cms().incrby(cms_key, ["total", 1])

        # Increment unique views if new visitor
        if is_new:
            pipe.cms().incrby(cms_key, ["unique", 1])

        pipe.execute()

        return is_new

    def get_stats(self, page_id):
        """Get page statistics."""
        cms_key = f"cms:views:{page_id}"

        try:
            counts = self.r.cms().query(cms_key, "total", "unique")
            return {
                "total_views": counts[0],
                "unique_visitors": counts[1]
            }
        except redis.ResponseError:
            return {"total_views": 0, "unique_visitors": 0}


# Usage
analytics = VisitorAnalytics(r)
analytics.setup("homepage")

# Simulate visits
visitors = ["user1", "user2", "user1", "user3", "user1", "user2", "user4"]
for visitor in visitors:
    is_new = analytics.record_visit("homepage", visitor)
    print(f"Visitor {visitor}: {'new' if is_new else 'returning'}")

# Get stats
stats = analytics.get_stats("homepage")
print(f"\nPage stats: {stats}")
# total_views: 7, unique_visitors: 4
```

## Choosing the Right Structure

| Use Case | Structure | Why |
|----------|-----------|-----|
| Membership test (no deletes) | Bloom Filter | Space efficient, no false negatives |
| Membership test (with deletes) | Cuckoo Filter | Supports deletion |
| Frequency estimation | Count-Min Sketch | Approximate counts |
| Heavy hitters / Top items | Top-K | Track frequent items |
| Cardinality estimation | HyperLogLog (built-in Redis) | Count distinct |

## Conclusion

RedisBloom provides powerful probabilistic data structures for handling large-scale data efficiently:

- **Bloom Filters**: Fast membership testing with configurable false positive rate
- **Cuckoo Filters**: Like Bloom filters but with deletion support
- **Count-Min Sketch**: Frequency estimation for streams
- **Top-K**: Track most frequent items with minimal memory

Key takeaways:

- Understand the **trade-offs** between accuracy and memory
- Configure **error rates** based on your requirements
- Use **appropriate structures** for your use case
- Combine structures for **comprehensive analytics**

## Related Resources

- [RedisBloom Documentation](https://redis.io/docs/stack/bloom/)
- [RedisBloom Commands](https://redis.io/commands/?group=bf)
- [Bloom Filter Theory](https://en.wikipedia.org/wiki/Bloom_filter)
- [Count-Min Sketch Paper](https://www.cse.unsw.edu.au/~cs9314/07s1/lectures/Lin_CS9314_References/cm-latin.pdf)
