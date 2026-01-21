# How to Use Redis HyperLogLog for Cardinality Estimation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HyperLogLog, Cardinality, Analytics, Unique Visitors, Probabilistic, Memory Efficient

Description: A comprehensive guide to using Redis HyperLogLog for estimating unique counts with minimal memory, covering PFADD, PFCOUNT, PFMERGE commands, and practical examples in Python, Node.js, and Go for counting unique visitors, tracking unique events, and analytics applications.

---

Redis HyperLogLog is a probabilistic data structure that estimates the cardinality (count of unique elements) of a set using only 12 KB of memory, regardless of the number of elements. With a standard error of 0.81%, HyperLogLog is perfect for counting unique visitors, unique events, or any scenario where approximate counts are acceptable.

In this guide, we will explore Redis HyperLogLog in depth, covering essential commands, use cases, and practical implementations for analytics and tracking applications.

## Understanding HyperLogLog

HyperLogLog is a probabilistic algorithm that trades perfect accuracy for extreme memory efficiency:

- **Fixed memory**: Always 12 KB per HyperLogLog
- **Standard error**: 0.81% (99% of estimates within 2% of actual)
- **No element retrieval**: Cannot get back individual elements
- **Supports union**: Can merge multiple HyperLogLogs

When to use HyperLogLog:
- Counting unique visitors/users
- Counting unique events
- Cardinality estimation for large sets
- When memory is a concern
- When ~1% error is acceptable

When NOT to use HyperLogLog:
- Need exact counts
- Need to retrieve individual elements
- Small sets (< 1000 elements) where a Set is more practical

## Essential HyperLogLog Commands

### PFADD - Add Elements

```bash
# Add single element
PFADD visitors "user123"
# Returns 1 if cardinality changed, 0 otherwise

# Add multiple elements
PFADD visitors "user456" "user789" "user101"

# Returns 1 even if only some elements are new
PFADD visitors "user123" "user999"
# Returns 1 (user999 is new)
```

### PFCOUNT - Get Cardinality

```bash
# Count unique elements
PFCOUNT visitors
# Returns approximate count

# Count across multiple HyperLogLogs (union)
PFCOUNT visitors:2024-01-01 visitors:2024-01-02 visitors:2024-01-03
# Returns approximate unique count across all days
```

### PFMERGE - Merge HyperLogLogs

```bash
# Merge multiple HyperLogLogs into one
PFMERGE visitors:weekly visitors:day1 visitors:day2 visitors:day3 visitors:day4 visitors:day5 visitors:day6 visitors:day7

# The result is a HyperLogLog that represents the union
PFCOUNT visitors:weekly
```

## Memory Comparison

Consider counting 10 million unique user IDs (average 20 bytes each):

| Method | Memory Usage |
|--------|--------------|
| Set | ~200 MB |
| HyperLogLog | 12 KB |

That's a 17,000x memory reduction!

## Practical Examples

### Python Implementation

```python
import redis
from datetime import datetime, timedelta
from typing import List, Dict
import random
import string

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# Unique Visitor Counter
# =============================================================================

class UniqueVisitorCounter:
    def __init__(self, namespace: str = "visitors"):
        self.namespace = namespace

    def _daily_key(self, date: datetime) -> str:
        return f"{self.namespace}:daily:{date.strftime('%Y-%m-%d')}"

    def _hourly_key(self, date: datetime) -> str:
        return f"{self.namespace}:hourly:{date.strftime('%Y-%m-%d-%H')}"

    def _monthly_key(self, date: datetime) -> str:
        return f"{self.namespace}:monthly:{date.strftime('%Y-%m')}"

    def track_visitor(self, visitor_id: str, timestamp: datetime = None) -> None:
        """Track a visitor."""
        if timestamp is None:
            timestamp = datetime.now()

        pipe = client.pipeline()
        pipe.pfadd(self._daily_key(timestamp), visitor_id)
        pipe.pfadd(self._hourly_key(timestamp), visitor_id)
        pipe.pfadd(self._monthly_key(timestamp), visitor_id)
        pipe.execute()

    def get_daily_unique(self, date: datetime) -> int:
        """Get unique visitors for a specific day."""
        return client.pfcount(self._daily_key(date))

    def get_hourly_unique(self, date: datetime) -> int:
        """Get unique visitors for a specific hour."""
        return client.pfcount(self._hourly_key(date))

    def get_monthly_unique(self, date: datetime) -> int:
        """Get unique visitors for a specific month."""
        return client.pfcount(self._monthly_key(date))

    def get_date_range_unique(self, start: datetime, end: datetime) -> int:
        """Get unique visitors across a date range."""
        keys = []
        current = start
        while current <= end:
            keys.append(self._daily_key(current))
            current += timedelta(days=1)

        if not keys:
            return 0

        return client.pfcount(*keys)

    def merge_daily_to_weekly(self, start: datetime) -> str:
        """Merge 7 daily HyperLogLogs into a weekly one."""
        weekly_key = f"{self.namespace}:weekly:{start.strftime('%Y-W%W')}"
        daily_keys = []

        for i in range(7):
            day = start + timedelta(days=i)
            daily_keys.append(self._daily_key(day))

        client.pfmerge(weekly_key, *daily_keys)
        return weekly_key


# =============================================================================
# Unique Event Counter
# =============================================================================

class UniqueEventCounter:
    def __init__(self, namespace: str = "events"):
        self.namespace = namespace

    def _key(self, event_type: str, period: str) -> str:
        return f"{self.namespace}:{event_type}:{period}"

    def track_event(self, event_type: str, entity_id: str, timestamp: datetime = None) -> None:
        """Track unique event occurrence."""
        if timestamp is None:
            timestamp = datetime.now()

        date_str = timestamp.strftime('%Y-%m-%d')
        month_str = timestamp.strftime('%Y-%m')

        pipe = client.pipeline()
        pipe.pfadd(self._key(event_type, date_str), entity_id)
        pipe.pfadd(self._key(event_type, month_str), entity_id)
        pipe.pfadd(self._key(event_type, "all"), entity_id)
        pipe.execute()

    def get_unique_count(self, event_type: str, period: str) -> int:
        """Get unique entities for event type in period."""
        return client.pfcount(self._key(event_type, period))

    def get_unique_across_events(self, event_types: List[str], period: str) -> int:
        """Get unique entities across multiple event types."""
        keys = [self._key(et, period) for et in event_types]
        return client.pfcount(*keys)


# =============================================================================
# Page View Analytics
# =============================================================================

class PageViewAnalytics:
    def __init__(self):
        self.namespace = "pageviews"

    def _key(self, page: str, period: str) -> str:
        # Sanitize page path
        safe_page = page.replace("/", "_").strip("_") or "home"
        return f"{self.namespace}:{safe_page}:{period}"

    def track_pageview(self, page: str, user_id: str, timestamp: datetime = None) -> None:
        """Track a page view."""
        if timestamp is None:
            timestamp = datetime.now()

        date_str = timestamp.strftime('%Y-%m-%d')

        pipe = client.pipeline()
        pipe.pfadd(self._key(page, date_str), user_id)
        pipe.pfadd(self._key("all", date_str), user_id)
        pipe.execute()

    def get_unique_visitors(self, page: str, date: datetime) -> int:
        """Get unique visitors for a page on a date."""
        date_str = date.strftime('%Y-%m-%d')
        return client.pfcount(self._key(page, date_str))

    def get_site_unique_visitors(self, date: datetime) -> int:
        """Get unique visitors for entire site on a date."""
        date_str = date.strftime('%Y-%m-%d')
        return client.pfcount(self._key("all", date_str))

    def get_page_comparison(self, pages: List[str], date: datetime) -> Dict[str, int]:
        """Compare unique visitors across pages."""
        date_str = date.strftime('%Y-%m-%d')
        return {
            page: client.pfcount(self._key(page, date_str))
            for page in pages
        }


# =============================================================================
# A/B Test Unique Users
# =============================================================================

class ABTestTracker:
    def __init__(self, test_name: str):
        self.test_name = test_name

    def _key(self, variant: str) -> str:
        return f"abtest:{self.test_name}:{variant}"

    def track_exposure(self, variant: str, user_id: str) -> None:
        """Track user exposure to variant."""
        client.pfadd(self._key(variant), user_id)

    def track_conversion(self, variant: str, user_id: str) -> None:
        """Track user conversion for variant."""
        client.pfadd(f"{self._key(variant)}:conversions", user_id)

    def get_unique_exposures(self, variant: str) -> int:
        """Get unique users exposed to variant."""
        return client.pfcount(self._key(variant))

    def get_unique_conversions(self, variant: str) -> int:
        """Get unique conversions for variant."""
        return client.pfcount(f"{self._key(variant)}:conversions")

    def get_conversion_rate(self, variant: str) -> float:
        """Get conversion rate for variant."""
        exposures = self.get_unique_exposures(variant)
        conversions = self.get_unique_conversions(variant)
        return conversions / exposures if exposures > 0 else 0

    def get_test_summary(self) -> Dict:
        """Get summary for all variants."""
        variants = ["control", "treatment"]
        return {
            variant: {
                "exposures": self.get_unique_exposures(variant),
                "conversions": self.get_unique_conversions(variant),
                "conversion_rate": self.get_conversion_rate(variant)
            }
            for variant in variants
        }


# =============================================================================
# Search Query Counter
# =============================================================================

class UniqueSearchCounter:
    def __init__(self):
        self.namespace = "search"

    def track_search(self, query: str, user_id: str, timestamp: datetime = None) -> None:
        """Track a search query."""
        if timestamp is None:
            timestamp = datetime.now()

        date_str = timestamp.strftime('%Y-%m-%d')

        # Track unique users who searched
        pipe = client.pipeline()
        pipe.pfadd(f"{self.namespace}:users:{date_str}", user_id)

        # Track unique queries
        pipe.pfadd(f"{self.namespace}:queries:{date_str}", query.lower())

        # Track users per query
        pipe.pfadd(f"{self.namespace}:query:{query.lower()}:{date_str}", user_id)
        pipe.execute()

    def get_unique_searchers(self, date: datetime) -> int:
        """Get unique users who searched."""
        date_str = date.strftime('%Y-%m-%d')
        return client.pfcount(f"{self.namespace}:users:{date_str}")

    def get_unique_queries(self, date: datetime) -> int:
        """Get unique search queries."""
        date_str = date.strftime('%Y-%m-%d')
        return client.pfcount(f"{self.namespace}:queries:{date_str}")

    def get_query_unique_users(self, query: str, date: datetime) -> int:
        """Get unique users for a specific query."""
        date_str = date.strftime('%Y-%m-%d')
        return client.pfcount(f"{self.namespace}:query:{query.lower()}:{date_str}")


# =============================================================================
# Accuracy Testing
# =============================================================================

def test_accuracy(num_elements: int) -> Dict:
    """Test HyperLogLog accuracy."""
    key = f"test:accuracy:{num_elements}"

    # Generate unique elements
    elements = [f"element_{i}" for i in range(num_elements)]

    # Add to HyperLogLog
    for element in elements:
        client.pfadd(key, element)

    # Get estimate
    estimate = client.pfcount(key)
    error = abs(estimate - num_elements) / num_elements * 100

    # Cleanup
    client.delete(key)

    return {
        "actual": num_elements,
        "estimate": estimate,
        "error_percent": round(error, 2)
    }


# =============================================================================
# Usage Examples
# =============================================================================

# Unique Visitor Counter
visitors = UniqueVisitorCounter()
today = datetime.now()

# Simulate visitor tracking
for i in range(10000):
    visitor_id = f"user_{random.randint(1, 5000)}"  # ~5000 unique users
    visitors.track_visitor(visitor_id, today)

print(f"Daily unique visitors: {visitors.get_daily_unique(today)}")
print(f"Monthly unique visitors: {visitors.get_monthly_unique(today)}")

# Page View Analytics
analytics = PageViewAnalytics()

# Simulate page views
pages = ["/home", "/products", "/about", "/contact"]
for i in range(5000):
    page = random.choice(pages)
    user_id = f"user_{random.randint(1, 1000)}"
    analytics.track_pageview(page, user_id, today)

print(f"Site unique visitors: {analytics.get_site_unique_visitors(today)}")
print(f"Page comparison: {analytics.get_page_comparison(pages, today)}")

# A/B Test Tracking
ab_test = ABTestTracker("homepage_redesign")

# Simulate test
for i in range(2000):
    user_id = f"user_{i}"
    variant = "control" if i % 2 == 0 else "treatment"
    ab_test.track_exposure(variant, user_id)

    # Simulate conversions (treatment has higher rate)
    if variant == "control" and random.random() < 0.05:
        ab_test.track_conversion(variant, user_id)
    elif variant == "treatment" and random.random() < 0.08:
        ab_test.track_conversion(variant, user_id)

print(f"A/B Test Summary: {ab_test.get_test_summary()}")

# Accuracy test
for size in [1000, 10000, 100000, 1000000]:
    result = test_accuracy(size)
    print(f"Size {size}: estimate={result['estimate']}, error={result['error_percent']}%")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// Unique Visitor Counter
// =============================================================================

class UniqueVisitorCounter {
  constructor(namespace = 'visitors') {
    this.namespace = namespace;
  }

  _dailyKey(date) {
    return `${this.namespace}:daily:${date.toISOString().split('T')[0]}`;
  }

  _monthlyKey(date) {
    return `${this.namespace}:monthly:${date.toISOString().slice(0, 7)}`;
  }

  async trackVisitor(visitorId, timestamp = new Date()) {
    const pipeline = redis.pipeline();
    pipeline.pfadd(this._dailyKey(timestamp), visitorId);
    pipeline.pfadd(this._monthlyKey(timestamp), visitorId);
    await pipeline.exec();
  }

  async getDailyUnique(date) {
    return await redis.pfcount(this._dailyKey(date));
  }

  async getMonthlyUnique(date) {
    return await redis.pfcount(this._monthlyKey(date));
  }

  async getDateRangeUnique(startDate, endDate) {
    const keys = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      keys.push(this._dailyKey(current));
      current.setDate(current.getDate() + 1);
    }

    if (keys.length === 0) return 0;
    return await redis.pfcount(...keys);
  }

  async mergeDailyToWeekly(startDate) {
    const weekKey = `${this.namespace}:weekly:${startDate.toISOString().split('T')[0]}`;
    const dailyKeys = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      dailyKeys.push(this._dailyKey(day));
    }

    await redis.pfmerge(weekKey, ...dailyKeys);
    return weekKey;
  }
}

// =============================================================================
// Unique Event Counter
// =============================================================================

class UniqueEventCounter {
  constructor(namespace = 'events') {
    this.namespace = namespace;
  }

  _key(eventType, period) {
    return `${this.namespace}:${eventType}:${period}`;
  }

  async trackEvent(eventType, entityId, timestamp = new Date()) {
    const dateStr = timestamp.toISOString().split('T')[0];
    const monthStr = timestamp.toISOString().slice(0, 7);

    const pipeline = redis.pipeline();
    pipeline.pfadd(this._key(eventType, dateStr), entityId);
    pipeline.pfadd(this._key(eventType, monthStr), entityId);
    pipeline.pfadd(this._key(eventType, 'all'), entityId);
    await pipeline.exec();
  }

  async getUniqueCount(eventType, period) {
    return await redis.pfcount(this._key(eventType, period));
  }

  async getUniqueAcrossEvents(eventTypes, period) {
    const keys = eventTypes.map((et) => this._key(et, period));
    return await redis.pfcount(...keys);
  }
}

// =============================================================================
// Page View Analytics
// =============================================================================

class PageViewAnalytics {
  constructor() {
    this.namespace = 'pageviews';
  }

  _key(page, period) {
    const safePage = page.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
    return `${this.namespace}:${safePage}:${period}`;
  }

  async trackPageview(page, userId, timestamp = new Date()) {
    const dateStr = timestamp.toISOString().split('T')[0];

    const pipeline = redis.pipeline();
    pipeline.pfadd(this._key(page, dateStr), userId);
    pipeline.pfadd(this._key('all', dateStr), userId);
    await pipeline.exec();
  }

  async getUniqueVisitors(page, date) {
    const dateStr = date.toISOString().split('T')[0];
    return await redis.pfcount(this._key(page, dateStr));
  }

  async getSiteUniqueVisitors(date) {
    const dateStr = date.toISOString().split('T')[0];
    return await redis.pfcount(this._key('all', dateStr));
  }

  async getPageComparison(pages, date) {
    const dateStr = date.toISOString().split('T')[0];
    const result = {};

    for (const page of pages) {
      result[page] = await redis.pfcount(this._key(page, dateStr));
    }

    return result;
  }
}

// =============================================================================
// A/B Test Tracker
// =============================================================================

class ABTestTracker {
  constructor(testName) {
    this.testName = testName;
  }

  _key(variant) {
    return `abtest:${this.testName}:${variant}`;
  }

  async trackExposure(variant, userId) {
    await redis.pfadd(this._key(variant), userId);
  }

  async trackConversion(variant, userId) {
    await redis.pfadd(`${this._key(variant)}:conversions`, userId);
  }

  async getUniqueExposures(variant) {
    return await redis.pfcount(this._key(variant));
  }

  async getUniqueConversions(variant) {
    return await redis.pfcount(`${this._key(variant)}:conversions`);
  }

  async getConversionRate(variant) {
    const exposures = await this.getUniqueExposures(variant);
    const conversions = await this.getUniqueConversions(variant);
    return exposures > 0 ? conversions / exposures : 0;
  }

  async getTestSummary() {
    const variants = ['control', 'treatment'];
    const result = {};

    for (const variant of variants) {
      result[variant] = {
        exposures: await this.getUniqueExposures(variant),
        conversions: await this.getUniqueConversions(variant),
        conversionRate: await this.getConversionRate(variant),
      };
    }

    return result;
  }
}

// =============================================================================
// Accuracy Test
// =============================================================================

async function testAccuracy(numElements) {
  const key = `test:accuracy:${numElements}`;

  // Add elements
  for (let i = 0; i < numElements; i++) {
    await redis.pfadd(key, `element_${i}`);
  }

  // Get estimate
  const estimate = await redis.pfcount(key);
  const error = (Math.abs(estimate - numElements) / numElements) * 100;

  // Cleanup
  await redis.del(key);

  return {
    actual: numElements,
    estimate,
    errorPercent: error.toFixed(2),
  };
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  const today = new Date();

  // Unique Visitor Counter
  const visitors = new UniqueVisitorCounter();

  for (let i = 0; i < 10000; i++) {
    const visitorId = `user_${Math.floor(Math.random() * 5000)}`;
    await visitors.trackVisitor(visitorId, today);
  }

  console.log('Daily unique visitors:', await visitors.getDailyUnique(today));
  console.log('Monthly unique visitors:', await visitors.getMonthlyUnique(today));

  // Page View Analytics
  const analytics = new PageViewAnalytics();
  const pages = ['/home', '/products', '/about', '/contact'];

  for (let i = 0; i < 5000; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    const userId = `user_${Math.floor(Math.random() * 1000)}`;
    await analytics.trackPageview(page, userId, today);
  }

  console.log('Site unique visitors:', await analytics.getSiteUniqueVisitors(today));
  console.log('Page comparison:', await analytics.getPageComparison(pages, today));

  // A/B Test Tracking
  const abTest = new ABTestTracker('homepage_redesign');

  for (let i = 0; i < 2000; i++) {
    const userId = `user_${i}`;
    const variant = i % 2 === 0 ? 'control' : 'treatment';
    await abTest.trackExposure(variant, userId);

    if (variant === 'control' && Math.random() < 0.05) {
      await abTest.trackConversion(variant, userId);
    } else if (variant === 'treatment' && Math.random() < 0.08) {
      await abTest.trackConversion(variant, userId);
    }
  }

  console.log('A/B Test Summary:', await abTest.getTestSummary());

  // Accuracy test
  for (const size of [1000, 10000, 100000]) {
    const result = await testAccuracy(size);
    console.log(`Size ${size}: estimate=${result.estimate}, error=${result.errorPercent}%`);
  }

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
    "math/rand"
    "time"

    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    rand.Seed(time.Now().UnixNano())
}

// =============================================================================
// Unique Visitor Counter
// =============================================================================

type UniqueVisitorCounter struct {
    Namespace string
}

func NewUniqueVisitorCounter(namespace string) *UniqueVisitorCounter {
    return &UniqueVisitorCounter{Namespace: namespace}
}

func (c *UniqueVisitorCounter) dailyKey(date time.Time) string {
    return fmt.Sprintf("%s:daily:%s", c.Namespace, date.Format("2006-01-02"))
}

func (c *UniqueVisitorCounter) monthlyKey(date time.Time) string {
    return fmt.Sprintf("%s:monthly:%s", c.Namespace, date.Format("2006-01"))
}

func (c *UniqueVisitorCounter) TrackVisitor(visitorID string, timestamp time.Time) error {
    pipe := client.Pipeline()
    pipe.PFAdd(ctx, c.dailyKey(timestamp), visitorID)
    pipe.PFAdd(ctx, c.monthlyKey(timestamp), visitorID)
    _, err := pipe.Exec(ctx)
    return err
}

func (c *UniqueVisitorCounter) GetDailyUnique(date time.Time) (int64, error) {
    return client.PFCount(ctx, c.dailyKey(date)).Result()
}

func (c *UniqueVisitorCounter) GetMonthlyUnique(date time.Time) (int64, error) {
    return client.PFCount(ctx, c.monthlyKey(date)).Result()
}

func (c *UniqueVisitorCounter) GetDateRangeUnique(start, end time.Time) (int64, error) {
    var keys []string
    current := start

    for !current.After(end) {
        keys = append(keys, c.dailyKey(current))
        current = current.AddDate(0, 0, 1)
    }

    if len(keys) == 0 {
        return 0, nil
    }

    return client.PFCount(ctx, keys...).Result()
}

// =============================================================================
// Page View Analytics
// =============================================================================

type PageViewAnalytics struct {
    Namespace string
}

func NewPageViewAnalytics() *PageViewAnalytics {
    return &PageViewAnalytics{Namespace: "pageviews"}
}

func (p *PageViewAnalytics) key(page, period string) string {
    return fmt.Sprintf("%s:%s:%s", p.Namespace, page, period)
}

func (p *PageViewAnalytics) TrackPageview(page, userID string, timestamp time.Time) error {
    dateStr := timestamp.Format("2006-01-02")

    pipe := client.Pipeline()
    pipe.PFAdd(ctx, p.key(page, dateStr), userID)
    pipe.PFAdd(ctx, p.key("all", dateStr), userID)
    _, err := pipe.Exec(ctx)
    return err
}

func (p *PageViewAnalytics) GetUniqueVisitors(page string, date time.Time) (int64, error) {
    dateStr := date.Format("2006-01-02")
    return client.PFCount(ctx, p.key(page, dateStr)).Result()
}

func (p *PageViewAnalytics) GetSiteUniqueVisitors(date time.Time) (int64, error) {
    dateStr := date.Format("2006-01-02")
    return client.PFCount(ctx, p.key("all", dateStr)).Result()
}

// =============================================================================
// A/B Test Tracker
// =============================================================================

type ABTestTracker struct {
    TestName string
}

func NewABTestTracker(testName string) *ABTestTracker {
    return &ABTestTracker{TestName: testName}
}

func (t *ABTestTracker) key(variant string) string {
    return fmt.Sprintf("abtest:%s:%s", t.TestName, variant)
}

func (t *ABTestTracker) TrackExposure(variant, userID string) error {
    return client.PFAdd(ctx, t.key(variant), userID).Err()
}

func (t *ABTestTracker) TrackConversion(variant, userID string) error {
    return client.PFAdd(ctx, t.key(variant)+":conversions", userID).Err()
}

func (t *ABTestTracker) GetUniqueExposures(variant string) (int64, error) {
    return client.PFCount(ctx, t.key(variant)).Result()
}

func (t *ABTestTracker) GetUniqueConversions(variant string) (int64, error) {
    return client.PFCount(ctx, t.key(variant)+":conversions").Result()
}

func (t *ABTestTracker) GetConversionRate(variant string) (float64, error) {
    exposures, err := t.GetUniqueExposures(variant)
    if err != nil || exposures == 0 {
        return 0, err
    }

    conversions, err := t.GetUniqueConversions(variant)
    if err != nil {
        return 0, err
    }

    return float64(conversions) / float64(exposures), nil
}

// =============================================================================
// Accuracy Test
// =============================================================================

func testAccuracy(numElements int) (int64, float64) {
    key := fmt.Sprintf("test:accuracy:%d", numElements)

    // Add elements
    for i := 0; i < numElements; i++ {
        client.PFAdd(ctx, key, fmt.Sprintf("element_%d", i))
    }

    // Get estimate
    estimate, _ := client.PFCount(ctx, key).Result()

    // Calculate error
    error := float64(abs(int(estimate)-numElements)) / float64(numElements) * 100

    // Cleanup
    client.Del(ctx, key)

    return estimate, error
}

func abs(x int) int {
    if x < 0 {
        return -x
    }
    return x
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    today := time.Now()

    // Unique Visitor Counter
    visitors := NewUniqueVisitorCounter("visitors")

    for i := 0; i < 10000; i++ {
        visitorID := fmt.Sprintf("user_%d", rand.Intn(5000))
        visitors.TrackVisitor(visitorID, today)
    }

    daily, _ := visitors.GetDailyUnique(today)
    monthly, _ := visitors.GetMonthlyUnique(today)
    fmt.Printf("Daily unique visitors: %d\n", daily)
    fmt.Printf("Monthly unique visitors: %d\n", monthly)

    // Page View Analytics
    analytics := NewPageViewAnalytics()
    pages := []string{"home", "products", "about", "contact"}

    for i := 0; i < 5000; i++ {
        page := pages[rand.Intn(len(pages))]
        userID := fmt.Sprintf("user_%d", rand.Intn(1000))
        analytics.TrackPageview(page, userID, today)
    }

    siteVisitors, _ := analytics.GetSiteUniqueVisitors(today)
    fmt.Printf("Site unique visitors: %d\n", siteVisitors)

    // A/B Test Tracking
    abTest := NewABTestTracker("homepage_redesign")

    for i := 0; i < 2000; i++ {
        userID := fmt.Sprintf("user_%d", i)
        variant := "control"
        if i%2 != 0 {
            variant = "treatment"
        }

        abTest.TrackExposure(variant, userID)

        if variant == "control" && rand.Float64() < 0.05 {
            abTest.TrackConversion(variant, userID)
        } else if variant == "treatment" && rand.Float64() < 0.08 {
            abTest.TrackConversion(variant, userID)
        }
    }

    controlRate, _ := abTest.GetConversionRate("control")
    treatmentRate, _ := abTest.GetConversionRate("treatment")
    fmt.Printf("Control conversion rate: %.2f%%\n", controlRate*100)
    fmt.Printf("Treatment conversion rate: %.2f%%\n", treatmentRate*100)

    // Accuracy test
    for _, size := range []int{1000, 10000, 100000} {
        estimate, errorPct := testAccuracy(size)
        fmt.Printf("Size %d: estimate=%d, error=%.2f%%\n", size, estimate, errorPct)
    }
}
```

## Best Practices

1. **Use for large counts** - HyperLogLog shines with millions of elements
2. **Acceptable error** - Ensure 0.81% standard error is acceptable
3. **Time-based keys** - Create separate HyperLogLogs for time periods
4. **Use PFMERGE** - Combine period-based HyperLogLogs efficiently
5. **Cannot retrieve elements** - Use Sets if you need member access

## Conclusion

Redis HyperLogLog provides an extremely memory-efficient way to count unique elements with acceptable accuracy. Key takeaways:

- Use only 12 KB regardless of element count
- Standard error of 0.81%
- Perfect for unique visitor counting and analytics
- Use PFMERGE to combine multiple HyperLogLogs
- Cannot retrieve individual elements

HyperLogLog is ideal for analytics applications where approximate unique counts are sufficient and memory efficiency is critical.
