# How to Count Unique Visitors with Redis HyperLogLog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HyperLogLog, Analytics, Cardinality, Unique Visitors, Performance

Description: Learn how to use Redis HyperLogLog to count unique visitors and other high-cardinality sets with minimal memory. This guide covers the algorithm basics, practical implementation, and real-world analytics use cases.

---

> Counting unique visitors seems simple until you need to track millions of them. Traditional approaches using sets consume memory proportional to the number of unique elements. HyperLogLog provides an elegant solution, using just 12KB of memory regardless of how many items you count.

Redis HyperLogLog is a probabilistic data structure that estimates the cardinality (number of unique elements) of a set with a standard error of 0.81%. For analytics where approximate counts are acceptable, it provides massive memory savings compared to exact counting methods.

---

## Why HyperLogLog?

Consider tracking unique visitors to a website. With 10 million unique visitors per day, storing their identifiers in a Redis Set would require approximately 400-600MB of memory. HyperLogLog achieves the same goal with just 12KB per counter.

| Method | 1M Uniques | 10M Uniques | 100M Uniques |
|--------|-----------|------------|--------------|
| Redis Set | ~40MB | ~400MB | ~4GB |
| HyperLogLog | 12KB | 12KB | 12KB |

The tradeoff is accuracy: HyperLogLog provides an estimate with approximately 0.81% error. For most analytics purposes, this is perfectly acceptable.

---

## Basic HyperLogLog Operations

Redis provides three commands for HyperLogLog:

```bash
# PFADD: Add elements to a HyperLogLog
# Returns 1 if the cardinality estimate changed, 0 otherwise
PFADD visitors:2026-01-25 "user_abc123"
PFADD visitors:2026-01-25 "user_def456" "user_ghi789"

# PFCOUNT: Get the estimated cardinality
# Works on single or multiple keys
PFCOUNT visitors:2026-01-25

# PFMERGE: Merge multiple HyperLogLogs into one
# Useful for combining daily counts into weekly or monthly totals
PFMERGE visitors:week-04 visitors:2026-01-25 visitors:2026-01-24 visitors:2026-01-23
```

---

## Python Implementation for Visitor Tracking

Here is a complete analytics implementation using HyperLogLog:

```python
import redis
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import hashlib

class VisitorAnalytics:
    """
    Track unique visitors using Redis HyperLogLog.
    Provides daily, weekly, and monthly unique visitor counts.
    """

    def __init__(self, redis_client: redis.Redis, prefix: str = "analytics"):
        """
        Initialize the visitor analytics tracker.

        Args:
            redis_client: Redis connection
            prefix: Key prefix for all analytics data
        """
        self.redis = redis_client
        self.prefix = prefix

    def _get_visitor_id(self, request_data: dict) -> str:
        """
        Generate a consistent visitor ID from request data.
        Uses multiple signals for better accuracy.
        """
        # Combine user agent, IP, and any available identifiers
        components = [
            request_data.get('user_agent', ''),
            request_data.get('ip_address', ''),
            request_data.get('user_id', ''),
            request_data.get('session_id', '')
        ]

        # Create a hash to normalize the identifier length
        combined = '|'.join(filter(None, components))
        return hashlib.sha256(combined.encode()).hexdigest()[:16]

    def _daily_key(self, date: datetime, page: Optional[str] = None) -> str:
        """Generate Redis key for daily visitor tracking."""
        date_str = date.strftime('%Y-%m-%d')
        if page:
            return f"{self.prefix}:visitors:page:{page}:{date_str}"
        return f"{self.prefix}:visitors:daily:{date_str}"

    def _hourly_key(self, date: datetime) -> str:
        """Generate Redis key for hourly visitor tracking."""
        return f"{self.prefix}:visitors:hourly:{date.strftime('%Y-%m-%d-%H')}"

    def track_visit(self, request_data: dict, page: Optional[str] = None) -> bool:
        """
        Track a page visit.

        Args:
            request_data: Dictionary containing visitor identification data
            page: Optional page identifier for per-page tracking

        Returns:
            True if this appears to be a new visitor (cardinality changed)
        """
        visitor_id = self._get_visitor_id(request_data)
        now = datetime.utcnow()

        # Track in multiple time granularities using a pipeline
        pipe = self.redis.pipeline()

        # Daily total
        daily_key = self._daily_key(now)
        pipe.pfadd(daily_key, visitor_id)
        pipe.expire(daily_key, 86400 * 90)  # Keep 90 days

        # Hourly for real-time dashboards
        hourly_key = self._hourly_key(now)
        pipe.pfadd(hourly_key, visitor_id)
        pipe.expire(hourly_key, 86400 * 7)  # Keep 7 days

        # Per-page tracking if specified
        if page:
            page_key = self._daily_key(now, page)
            pipe.pfadd(page_key, visitor_id)
            pipe.expire(page_key, 86400 * 30)  # Keep 30 days

        results = pipe.execute()

        # First result indicates if daily cardinality changed
        return results[0] == 1

    def get_daily_count(self, date: datetime) -> int:
        """
        Get unique visitor count for a specific day.

        Args:
            date: The date to query

        Returns:
            Estimated unique visitor count
        """
        key = self._daily_key(date)
        return self.redis.pfcount(key)

    def get_page_count(self, page: str, date: datetime) -> int:
        """
        Get unique visitors for a specific page on a specific day.
        """
        key = self._daily_key(date, page)
        return self.redis.pfcount(key)

    def get_range_count(self, start_date: datetime, end_date: datetime) -> int:
        """
        Get unique visitors across a date range.
        Uses PFMERGE to combine HyperLogLogs without double-counting.

        Args:
            start_date: Start of the range (inclusive)
            end_date: End of the range (inclusive)

        Returns:
            Estimated unique visitors in the range
        """
        keys = []
        current = start_date

        while current <= end_date:
            keys.append(self._daily_key(current))
            current += timedelta(days=1)

        if not keys:
            return 0

        # Use PFCOUNT with multiple keys (merges temporarily)
        return self.redis.pfcount(*keys)

    def get_weekly_count(self, date: datetime) -> int:
        """Get unique visitors for the week containing the given date."""
        # Find start of week (Monday)
        start_of_week = date - timedelta(days=date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        return self.get_range_count(start_of_week, end_of_week)

    def get_monthly_count(self, year: int, month: int) -> int:
        """Get unique visitors for an entire month."""
        from calendar import monthrange

        start_date = datetime(year, month, 1)
        _, last_day = monthrange(year, month)
        end_date = datetime(year, month, last_day)

        return self.get_range_count(start_date, end_date)

    def get_hourly_breakdown(self, date: datetime) -> Dict[int, int]:
        """
        Get hourly unique visitor breakdown for a day.

        Returns:
            Dictionary mapping hour (0-23) to visitor count
        """
        results = {}
        pipe = self.redis.pipeline()

        for hour in range(24):
            hour_date = date.replace(hour=hour, minute=0, second=0, microsecond=0)
            key = self._hourly_key(hour_date)
            pipe.pfcount(key)

        counts = pipe.execute()

        for hour, count in enumerate(counts):
            results[hour] = count

        return results

    def compare_periods(
        self,
        period1_start: datetime,
        period1_end: datetime,
        period2_start: datetime,
        period2_end: datetime
    ) -> Dict[str, any]:
        """
        Compare unique visitors between two time periods.
        Useful for week-over-week or month-over-month analysis.
        """
        period1_count = self.get_range_count(period1_start, period1_end)
        period2_count = self.get_range_count(period2_start, period2_end)

        if period2_count > 0:
            change_percent = ((period1_count - period2_count) / period2_count) * 100
        else:
            change_percent = 0

        return {
            "current_period": period1_count,
            "previous_period": period2_count,
            "change": period1_count - period2_count,
            "change_percent": round(change_percent, 2)
        }


# Usage example
if __name__ == '__main__':
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    analytics = VisitorAnalytics(redis_client)

    # Simulate tracking visits
    visit_data = {
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'ip_address': '192.168.1.100',
        'session_id': 'sess_abc123'
    }

    # Track a visit
    is_new = analytics.track_visit(visit_data, page='/home')
    print(f"New visitor: {is_new}")

    # Get counts
    today = datetime.utcnow()
    daily_visitors = analytics.get_daily_count(today)
    print(f"Today's unique visitors: {daily_visitors}")

    weekly_visitors = analytics.get_weekly_count(today)
    print(f"This week's unique visitors: {weekly_visitors}")
```

---

## Node.js Implementation

Here is the equivalent implementation in Node.js:

```javascript
// visitor-analytics.js
const Redis = require('ioredis');
const crypto = require('crypto');

class VisitorAnalytics {
    constructor(redisClient, prefix = 'analytics') {
        this.redis = redisClient;
        this.prefix = prefix;
    }

    _getVisitorId(requestData) {
        // Combine signals for visitor identification
        const components = [
            requestData.userAgent || '',
            requestData.ipAddress || '',
            requestData.userId || '',
            requestData.sessionId || ''
        ].filter(Boolean).join('|');

        return crypto.createHash('sha256')
            .update(components)
            .digest('hex')
            .substring(0, 16);
    }

    _formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    _dailyKey(date, page = null) {
        const dateStr = this._formatDate(date);
        if (page) {
            return `${this.prefix}:visitors:page:${page}:${dateStr}`;
        }
        return `${this.prefix}:visitors:daily:${dateStr}`;
    }

    async trackVisit(requestData, page = null) {
        const visitorId = this._getVisitorId(requestData);
        const now = new Date();
        const dailyKey = this._dailyKey(now);

        const pipeline = this.redis.pipeline();

        // Track daily visitors
        pipeline.pfadd(dailyKey, visitorId);
        pipeline.expire(dailyKey, 86400 * 90);

        // Track per-page if specified
        if (page) {
            const pageKey = this._dailyKey(now, page);
            pipeline.pfadd(pageKey, visitorId);
            pipeline.expire(pageKey, 86400 * 30);
        }

        const results = await pipeline.exec();
        return results[0][1] === 1;
    }

    async getDailyCount(date) {
        const key = this._dailyKey(date);
        return await this.redis.pfcount(key);
    }

    async getRangeCount(startDate, endDate) {
        const keys = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            keys.push(this._dailyKey(current));
            current.setDate(current.getDate() + 1);
        }

        if (keys.length === 0) return 0;

        return await this.redis.pfcount(...keys);
    }

    async getWeeklyCount(date) {
        const dayOfWeek = date.getDay();
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - dayOfWeek);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        return await this.getRangeCount(startOfWeek, endOfWeek);
    }
}

// Express middleware for automatic tracking
function visitorTrackingMiddleware(analytics) {
    return async (req, res, next) => {
        const requestData = {
            userAgent: req.headers['user-agent'],
            ipAddress: req.headers['x-forwarded-for'] || req.ip,
            sessionId: req.sessionID
        };

        // Track visit asynchronously to not block response
        analytics.trackVisit(requestData, req.path).catch(err => {
            console.error('Failed to track visit:', err);
        });

        next();
    };
}

module.exports = { VisitorAnalytics, visitorTrackingMiddleware };
```

---

## Advanced Use Cases

### Feature Usage Tracking

Track which users have used specific features:

```python
class FeatureUsageTracker:
    """Track unique users of specific features."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def track_feature_usage(self, user_id: str, feature_name: str) -> None:
        """Record that a user used a specific feature."""
        today = datetime.utcnow().strftime('%Y-%m-%d')
        key = f"feature:{feature_name}:users:{today}"

        self.redis.pfadd(key, user_id)
        self.redis.expire(key, 86400 * 30)

    def get_feature_adoption(self, feature_name: str, days: int = 7) -> dict:
        """Get feature adoption metrics over a time period."""
        keys = []
        today = datetime.utcnow()

        for i in range(days):
            date = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            keys.append(f"feature:{feature_name}:users:{date}")

        unique_users = self.redis.pfcount(*keys)

        return {
            "feature": feature_name,
            "period_days": days,
            "unique_users": unique_users
        }
```

### A/B Test Participant Counting

```python
class ABTestTracker:
    """Track unique participants in A/B tests."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def assign_variant(self, user_id: str, experiment: str, variant: str) -> None:
        """Assign a user to an experiment variant."""
        key = f"experiment:{experiment}:variant:{variant}"
        self.redis.pfadd(key, user_id)

    def get_experiment_stats(self, experiment: str, variants: List[str]) -> dict:
        """Get participant counts for all variants."""
        stats = {}

        for variant in variants:
            key = f"experiment:{experiment}:variant:{variant}"
            stats[variant] = self.redis.pfcount(key)

        total = sum(stats.values())

        return {
            "experiment": experiment,
            "total_participants": total,
            "variants": stats
        }
```

---

## Accuracy Considerations

HyperLogLog provides estimates, not exact counts. Here is what to expect:

- Standard error: approximately 0.81%
- For 1 million unique items: count will typically be within 8,100 of actual
- For 100 million unique items: count will typically be within 810,000 of actual

For most analytics purposes, this accuracy is sufficient. If you need exact counts for small sets (under 10,000 items), consider using Redis Sets instead and only switching to HyperLogLog when counts exceed your threshold.

---

## Best Practices

1. **Use meaningful time buckets**: Daily keys balance granularity with manageability

2. **Set appropriate TTLs**: Clean up old data automatically to prevent unbounded growth

3. **Leverage PFCOUNT with multiple keys**: It merges HyperLogLogs efficiently without creating intermediate data

4. **Combine with exact counting for small sets**: Use Sets for low-cardinality data and HyperLogLog for high-cardinality

5. **Consider visitor identification carefully**: The accuracy of your tracking depends on consistent visitor identification

Redis HyperLogLog provides an efficient, scalable solution for counting unique elements at any scale. Whether you are tracking millions of visitors, feature usage, or any other high-cardinality metric, it delivers accurate estimates with minimal memory overhead.
