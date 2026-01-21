# How to Implement User Activity Tracking with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, User Activity, Analytics, Clickstream, Behavior Tracking, Sessions

Description: A comprehensive guide to implementing user activity tracking with Redis for clickstreams, sessions, behavior analysis, and real-time analytics.

---

User activity tracking is essential for understanding how users interact with your application. From page views and clicks to feature usage and session analysis, Redis provides the speed and data structures needed to capture and analyze user behavior in real-time.

## Core Concepts

User activity tracking typically involves:

- **Event collection**: Recording user actions as they happen
- **Session tracking**: Grouping events into user sessions
- **Activity feeds**: Maintaining timelines of user actions
- **Analytics**: Computing metrics like DAU, retention, and engagement
- **Behavior patterns**: Identifying common user journeys

## Event Collection

### Basic Event Tracking

```python
import redis
import time
import json
import uuid
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class EventTracker:
    def __init__(self, app_id='default'):
        self.app_id = app_id

    def track(self, user_id, event_type, properties=None):
        """Track a user event."""
        timestamp = int(time.time() * 1000)
        event_id = str(uuid.uuid4())

        event = {
            'id': event_id,
            'user_id': user_id,
            'type': event_type,
            'timestamp': timestamp,
            'properties': properties or {}
        }

        # Store event in user's activity stream
        user_stream = f"events:user:{user_id}"
        r.xadd(user_stream, event, maxlen=10000)

        # Store in global event stream for processing
        global_stream = f"events:global:{self.app_id}"
        r.xadd(global_stream, event, maxlen=1000000)

        # Update user's last activity
        r.hset(f"user:last_activity", user_id, timestamp)

        # Add to daily active users set
        day_key = datetime.utcnow().strftime('%Y-%m-%d')
        r.sadd(f"dau:{day_key}", user_id)
        r.expire(f"dau:{day_key}", 86400 * 30)  # 30-day retention

        return event_id

    def track_page_view(self, user_id, page, referrer=None, session_id=None):
        """Track a page view event."""
        properties = {
            'page': page,
            'referrer': referrer,
            'session_id': session_id
        }
        return self.track(user_id, 'page_view', properties)

    def track_click(self, user_id, element, page, session_id=None):
        """Track a click event."""
        properties = {
            'element': element,
            'page': page,
            'session_id': session_id
        }
        return self.track(user_id, 'click', properties)

    def track_feature_use(self, user_id, feature, metadata=None):
        """Track feature usage."""
        properties = {
            'feature': feature,
            'metadata': metadata or {}
        }
        return self.track(user_id, 'feature_use', properties)

# Usage
tracker = EventTracker('my_app')

# Track various events
tracker.track_page_view('user123', '/dashboard', referrer='/login')
tracker.track_click('user123', 'create_button', '/dashboard')
tracker.track_feature_use('user123', 'export_report', {'format': 'csv'})
```

### Node.js Event Tracker

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis();

class EventTracker {
  constructor(appId = 'default') {
    this.appId = appId;
  }

  async track(userId, eventType, properties = {}) {
    const timestamp = Date.now();
    const eventId = uuidv4();

    const event = {
      id: eventId,
      user_id: userId,
      type: eventType,
      timestamp: String(timestamp),
      properties: JSON.stringify(properties)
    };

    const pipeline = redis.pipeline();

    // User's activity stream
    pipeline.xadd(
      `events:user:${userId}`,
      'MAXLEN', '~', 10000,
      '*',
      ...Object.entries(event).flat()
    );

    // Global event stream
    pipeline.xadd(
      `events:global:${this.appId}`,
      'MAXLEN', '~', 1000000,
      '*',
      ...Object.entries(event).flat()
    );

    // Last activity
    pipeline.hset('user:last_activity', userId, timestamp);

    // Daily active users
    const dayKey = new Date().toISOString().split('T')[0];
    pipeline.sadd(`dau:${dayKey}`, userId);
    pipeline.expire(`dau:${dayKey}`, 86400 * 30);

    await pipeline.exec();
    return eventId;
  }

  async trackPageView(userId, page, options = {}) {
    return this.track(userId, 'page_view', {
      page,
      referrer: options.referrer,
      session_id: options.sessionId,
      user_agent: options.userAgent
    });
  }

  async trackEvent(userId, eventName, data = {}) {
    return this.track(userId, eventName, data);
  }
}

// Usage
const tracker = new EventTracker('my_app');

async function example() {
  await tracker.trackPageView('user123', '/home', {
    referrer: 'https://google.com',
    sessionId: 'sess_abc123'
  });

  await tracker.trackEvent('user123', 'button_click', {
    button: 'signup',
    page: '/home'
  });
}

example().catch(console.error);
```

## Session Tracking

### Session Management

```python
class SessionTracker:
    def __init__(self, session_timeout=1800):  # 30 minutes
        self.session_timeout = session_timeout

    def get_or_create_session(self, user_id, session_id=None):
        """Get existing session or create new one."""
        if session_id:
            session_key = f"session:{session_id}"
            if r.exists(session_key):
                # Refresh session TTL
                r.expire(session_key, self.session_timeout)
                return session_id

        # Create new session
        session_id = str(uuid.uuid4())
        session_key = f"session:{session_id}"

        session_data = {
            'user_id': user_id,
            'created_at': int(time.time() * 1000),
            'event_count': 0,
            'pages_viewed': 0
        }

        r.hset(session_key, mapping=session_data)
        r.expire(session_key, self.session_timeout)

        # Track session in user's session list
        r.zadd(f"user:sessions:{user_id}", {session_id: time.time()})

        return session_id

    def record_session_event(self, session_id, event_type, page=None):
        """Record an event within a session."""
        session_key = f"session:{session_id}"

        if not r.exists(session_key):
            return False

        pipe = r.pipeline()

        # Increment event count
        pipe.hincrby(session_key, 'event_count', 1)

        # Track page if provided
        if page:
            pipe.hincrby(session_key, 'pages_viewed', 1)
            pipe.rpush(f"session:{session_id}:pages", page)

        # Update last activity
        pipe.hset(session_key, 'last_activity', int(time.time() * 1000))

        # Refresh TTL
        pipe.expire(session_key, self.session_timeout)

        pipe.execute()
        return True

    def end_session(self, session_id):
        """Explicitly end a session."""
        session_key = f"session:{session_id}"

        session_data = r.hgetall(session_key)
        if not session_data:
            return None

        # Calculate session duration
        created_at = int(session_data['created_at'])
        ended_at = int(time.time() * 1000)
        duration_ms = ended_at - created_at

        # Store session summary
        summary = {
            **session_data,
            'ended_at': ended_at,
            'duration_ms': duration_ms
        }

        # Archive session
        r.hset(f"session:archive:{session_id}", mapping=summary)
        r.expire(f"session:archive:{session_id}", 86400 * 7)  # 7-day archive

        # Delete active session
        r.delete(session_key, f"session:{session_id}:pages")

        return summary

    def get_session_data(self, session_id):
        """Get current session data."""
        session_key = f"session:{session_id}"
        data = r.hgetall(session_key)

        if data:
            # Get page history
            pages = r.lrange(f"session:{session_id}:pages", 0, -1)
            data['page_history'] = pages

        return data

    def get_user_sessions(self, user_id, limit=10):
        """Get recent sessions for a user."""
        session_ids = r.zrevrange(f"user:sessions:{user_id}", 0, limit - 1)

        sessions = []
        for session_id in session_ids:
            data = self.get_session_data(session_id)
            if data:
                sessions.append({'session_id': session_id, **data})

        return sessions

# Usage
session_tracker = SessionTracker()
event_tracker = EventTracker()

# Create or resume session
session_id = session_tracker.get_or_create_session('user123')

# Track events with session
event_tracker.track_page_view('user123', '/products', session_id=session_id)
session_tracker.record_session_event(session_id, 'page_view', '/products')

event_tracker.track_page_view('user123', '/products/123', session_id=session_id)
session_tracker.record_session_event(session_id, 'page_view', '/products/123')

# Get session info
session_data = session_tracker.get_session_data(session_id)
print(f"Session data: {session_data}")
```

## User Activity Feed

### Activity Timeline

```python
class ActivityFeed:
    def __init__(self, max_items=1000):
        self.max_items = max_items

    def add_activity(self, user_id, activity_type, data):
        """Add an activity to user's feed."""
        timestamp = time.time()
        activity = {
            'type': activity_type,
            'data': json.dumps(data),
            'timestamp': timestamp
        }

        feed_key = f"feed:user:{user_id}"

        # Add to sorted set with timestamp as score
        member = json.dumps(activity)
        r.zadd(feed_key, {member: timestamp})

        # Trim to max items
        r.zremrangebyrank(feed_key, 0, -self.max_items - 1)

    def get_feed(self, user_id, offset=0, limit=20):
        """Get user's activity feed."""
        feed_key = f"feed:user:{user_id}"
        items = r.zrevrange(feed_key, offset, offset + limit - 1, withscores=True)

        return [
            {**json.loads(item), 'score': score}
            for item, score in items
        ]

    def get_feed_since(self, user_id, since_timestamp):
        """Get activities since a specific time."""
        feed_key = f"feed:user:{user_id}"
        items = r.zrangebyscore(
            feed_key,
            since_timestamp,
            '+inf',
            withscores=True
        )

        return [
            {**json.loads(item), 'score': score}
            for item, score in items
        ]

    def add_to_followers_feeds(self, user_id, activity_type, data):
        """Fan-out activity to all followers."""
        # Get followers
        followers = r.smembers(f"followers:{user_id}")

        if not followers:
            return

        timestamp = time.time()
        activity = {
            'type': activity_type,
            'data': json.dumps(data),
            'actor': user_id,
            'timestamp': timestamp
        }
        member = json.dumps(activity)

        # Add to each follower's feed
        pipe = r.pipeline()
        for follower_id in followers:
            feed_key = f"feed:user:{follower_id}"
            pipe.zadd(feed_key, {member: timestamp})
            pipe.zremrangebyrank(feed_key, 0, -self.max_items - 1)

        pipe.execute()

# Usage
feed = ActivityFeed()

# Add activities
feed.add_activity('user123', 'post_created', {
    'post_id': 'post_456',
    'title': 'My new blog post'
})

feed.add_activity('user123', 'comment_added', {
    'post_id': 'post_789',
    'comment': 'Great article!'
})

# Get feed
activities = feed.get_feed('user123', offset=0, limit=10)
for activity in activities:
    print(f"{activity['type']}: {activity['data']}")
```

## Analytics and Metrics

### Daily/Monthly Active Users

```python
class UserAnalytics:
    def __init__(self):
        pass

    def mark_active(self, user_id):
        """Mark user as active for DAU/MAU tracking."""
        now = datetime.utcnow()
        day_key = now.strftime('%Y-%m-%d')
        month_key = now.strftime('%Y-%m')

        pipe = r.pipeline()

        # Daily active users (bitmap)
        user_bit = hash(user_id) % (10 ** 8)  # Map to bit position
        pipe.setbit(f"dau:bitmap:{day_key}", user_bit, 1)
        pipe.expire(f"dau:bitmap:{day_key}", 86400 * 90)

        # Daily active users (set for exact count)
        pipe.sadd(f"dau:{day_key}", user_id)
        pipe.expire(f"dau:{day_key}", 86400 * 90)

        # Monthly active users
        pipe.sadd(f"mau:{month_key}", user_id)
        pipe.expire(f"mau:{month_key}", 86400 * 365)

        # HyperLogLog for approximate count
        pipe.pfadd(f"dau:hll:{day_key}", user_id)
        pipe.expire(f"dau:hll:{day_key}", 86400 * 90)

        pipe.execute()

    def get_dau(self, date=None):
        """Get daily active user count."""
        if date is None:
            date = datetime.utcnow().strftime('%Y-%m-%d')

        # Exact count from set
        return r.scard(f"dau:{date}")

    def get_mau(self, month=None):
        """Get monthly active user count."""
        if month is None:
            month = datetime.utcnow().strftime('%Y-%m')

        return r.scard(f"mau:{month}")

    def get_dau_range(self, start_date, end_date):
        """Get DAU for a date range."""
        result = {}
        current = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')

        while current <= end:
            date_str = current.strftime('%Y-%m-%d')
            result[date_str] = self.get_dau(date_str)
            current += timedelta(days=1)

        return result

    def get_retention(self, cohort_date, days_after):
        """Calculate retention for a cohort."""
        cohort_key = f"dau:{cohort_date}"
        check_date = (
            datetime.strptime(cohort_date, '%Y-%m-%d') +
            timedelta(days=days_after)
        ).strftime('%Y-%m-%d')
        check_key = f"dau:{check_date}"

        # Get intersection of cohort and check date
        cohort_size = r.scard(cohort_key)
        if cohort_size == 0:
            return 0

        # Use temporary key for intersection
        temp_key = f"temp:retention:{uuid.uuid4()}"
        r.sinterstore(temp_key, cohort_key, check_key)
        retained = r.scard(temp_key)
        r.delete(temp_key)

        return retained / cohort_size * 100

# Usage
analytics = UserAnalytics()

# Mark users active
for user_id in ['user1', 'user2', 'user3', 'user4', 'user5']:
    analytics.mark_active(user_id)

# Get metrics
print(f"DAU: {analytics.get_dau()}")
print(f"MAU: {analytics.get_mau()}")
```

### Feature Usage Tracking

```python
class FeatureAnalytics:
    def __init__(self):
        pass

    def track_feature_use(self, user_id, feature_name, metadata=None):
        """Track when a user uses a feature."""
        timestamp = time.time()
        day_key = datetime.utcnow().strftime('%Y-%m-%d')

        pipe = r.pipeline()

        # Count feature usage
        pipe.hincrby(f"features:count:{day_key}", feature_name, 1)
        pipe.expire(f"features:count:{day_key}", 86400 * 90)

        # Track unique users per feature
        pipe.sadd(f"features:users:{feature_name}:{day_key}", user_id)
        pipe.expire(f"features:users:{feature_name}:{day_key}", 86400 * 90)

        # Track features used by user
        pipe.sadd(f"user:features:{user_id}:{day_key}", feature_name)
        pipe.expire(f"user:features:{user_id}:{day_key}", 86400 * 30)

        pipe.execute()

    def get_feature_stats(self, feature_name, date=None):
        """Get usage stats for a feature."""
        if date is None:
            date = datetime.utcnow().strftime('%Y-%m-%d')

        count = r.hget(f"features:count:{date}", feature_name)
        unique_users = r.scard(f"features:users:{feature_name}:{date}")

        return {
            'feature': feature_name,
            'date': date,
            'total_uses': int(count or 0),
            'unique_users': unique_users
        }

    def get_top_features(self, date=None, limit=10):
        """Get most used features."""
        if date is None:
            date = datetime.utcnow().strftime('%Y-%m-%d')

        counts = r.hgetall(f"features:count:{date}")

        sorted_features = sorted(
            counts.items(),
            key=lambda x: int(x[1]),
            reverse=True
        )[:limit]

        return [
            {'feature': f, 'count': int(c)}
            for f, c in sorted_features
        ]

    def get_user_features(self, user_id, date=None):
        """Get features used by a user."""
        if date is None:
            date = datetime.utcnow().strftime('%Y-%m-%d')

        return list(r.smembers(f"user:features:{user_id}:{date}"))

# Usage
features = FeatureAnalytics()

# Track feature usage
features.track_feature_use('user123', 'export_csv')
features.track_feature_use('user123', 'dark_mode')
features.track_feature_use('user456', 'export_csv')

# Get stats
stats = features.get_feature_stats('export_csv')
print(f"Export CSV stats: {stats}")

top = features.get_top_features(limit=5)
print(f"Top features: {top}")
```

## Clickstream Processing

### Real-time Clickstream Pipeline

```python
class ClickstreamProcessor:
    def __init__(self):
        self.consumer_group = 'clickstream_processors'

    def process_events(self, batch_size=100):
        """Process clickstream events from stream."""
        stream_key = 'events:global:default'

        # Setup consumer group
        try:
            r.xgroup_create(stream_key, self.consumer_group, id='0', mkstream=True)
        except:
            pass

        while True:
            entries = r.xreadgroup(
                self.consumer_group,
                'processor1',
                {stream_key: '>'},
                count=batch_size,
                block=5000
            )

            if not entries:
                continue

            for stream, messages in entries:
                for message_id, fields in messages:
                    self._process_event(fields)
                    r.xack(stream_key, self.consumer_group, message_id)

    def _process_event(self, event):
        """Process a single clickstream event."""
        event_type = event.get('type')
        user_id = event.get('user_id')
        timestamp = int(event.get('timestamp', 0))

        # Route to appropriate handler
        if event_type == 'page_view':
            self._handle_page_view(user_id, event, timestamp)
        elif event_type == 'click':
            self._handle_click(user_id, event, timestamp)

    def _handle_page_view(self, user_id, event, timestamp):
        """Handle page view events."""
        properties = json.loads(event.get('properties', '{}'))
        page = properties.get('page', 'unknown')
        day_key = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')

        pipe = r.pipeline()

        # Count page views
        pipe.hincrby(f"pageviews:{day_key}", page, 1)

        # Track unique visitors per page
        pipe.pfadd(f"pageviews:uv:{page}:{day_key}", user_id)

        # Update user's page sequence
        pipe.lpush(f"user:pages:{user_id}", page)
        pipe.ltrim(f"user:pages:{user_id}", 0, 99)  # Keep last 100

        pipe.execute()

    def _handle_click(self, user_id, event, timestamp):
        """Handle click events."""
        properties = json.loads(event.get('properties', '{}'))
        element = properties.get('element', 'unknown')
        page = properties.get('page', 'unknown')
        day_key = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')

        # Count clicks per element
        r.hincrby(f"clicks:{day_key}:{page}", element, 1)

# Path analysis
class PathAnalyzer:
    def get_common_paths(self, limit=10):
        """Get most common user navigation paths."""
        path_counts = {}

        # Sample users
        for key in r.scan_iter(match='user:pages:*', count=100):
            pages = r.lrange(key, 0, 4)  # First 5 pages
            if len(pages) >= 2:
                path = ' -> '.join(reversed(pages))
                path_counts[path] = path_counts.get(path, 0) + 1

        sorted_paths = sorted(
            path_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]

        return sorted_paths

    def get_exit_pages(self, date=None):
        """Find pages where users commonly leave."""
        if date is None:
            date = datetime.utcnow().strftime('%Y-%m-%d')

        # This requires session end tracking
        exit_counts = r.hgetall(f"exit_pages:{date}")
        return sorted(
            exit_counts.items(),
            key=lambda x: int(x[1]),
            reverse=True
        )
```

## Best Practices

### 1. Use Efficient Data Structures

```python
# Use HyperLogLog for approximate unique counts
def track_unique_visitors(page):
    day = datetime.utcnow().strftime('%Y-%m-%d')
    r.pfadd(f"visitors:hll:{page}:{day}", user_id)

# Use bitmaps for boolean states
def mark_feature_seen(user_id, feature_id):
    r.setbit(f"feature:seen:{feature_id}", user_id_to_bit(user_id), 1)
```

### 2. Implement Data Retention

```python
def cleanup_old_activity_data(retention_days=30):
    """Remove activity data older than retention period."""
    cutoff = datetime.utcnow() - timedelta(days=retention_days)
    cutoff_str = cutoff.strftime('%Y-%m-%d')

    # Find and delete old keys
    patterns = [
        f"dau:{cutoff_str}*",
        f"pageviews:{cutoff_str}*",
        f"clicks:{cutoff_str}*"
    ]

    for pattern in patterns:
        for key in r.scan_iter(match=pattern):
            r.delete(key)
```

### 3. Batch Operations for Performance

```python
async def track_events_batch(events):
    """Track multiple events efficiently."""
    pipe = r.pipeline()

    for event in events:
        user_id = event['user_id']
        event_type = event['type']

        # Add to streams
        pipe.xadd(f"events:user:{user_id}", event, maxlen=10000)

        # Update counters
        day = datetime.utcnow().strftime('%Y-%m-%d')
        pipe.hincrby(f"events:count:{day}", event_type, 1)

    await pipe.execute()
```

## Conclusion

Redis provides an excellent foundation for user activity tracking with its combination of speed, versatile data structures, and streaming capabilities. Key takeaways:

- Use Redis Streams for reliable event collection with consumer groups
- Implement session tracking with hash maps and sorted sets
- Leverage HyperLogLog for memory-efficient unique counting
- Build real-time analytics with counters and sorted sets
- Design for data retention from the start

For production systems, combine these patterns with proper monitoring and consider using RedisTimeSeries for time-based aggregations. This creates a comprehensive activity tracking system that scales with your user base.
