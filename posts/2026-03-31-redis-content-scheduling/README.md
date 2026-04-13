# How to Implement Content Scheduling with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Content Scheduling, Sorted Set, CMS, Backend

Description: Schedule content publication and expiry in Redis using sorted sets scored by Unix timestamps, with a worker that auto-publishes and unpublishes content on time.

---

Content management systems need reliable scheduling - a blog post should go live at 9 AM UTC and expire after 30 days. Redis sorted sets give you a natural scheduler where the score is the Unix timestamp of the desired action.

## Scheduling Content for Publication

Store the content ID in a sorted set scored by its publish time:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

PUBLISH_QUEUE = "schedule:publish"
UNPUBLISH_QUEUE = "schedule:unpublish"

def schedule_content(content_id: str, publish_at: float, unpublish_at: float = None):
    r.zadd(PUBLISH_QUEUE, {content_id: publish_at})
    if unpublish_at:
        r.zadd(UNPUBLISH_QUEUE, {content_id: unpublish_at})
    # Store content metadata
    r.hset(f"content:{content_id}", "status", "scheduled")
```

## Worker That Publishes Due Content

A worker runs every minute and publishes all content whose publish time has passed:

```python
def publish_due_content():
    now = time.time()
    due = r.zrangebyscore(PUBLISH_QUEUE, 0, now)
    for content_id in due:
        removed = r.zrem(PUBLISH_QUEUE, content_id)
        if removed:
            r.hset(f"content:{content_id}", "status", "published")
            r.sadd("content:published", content_id)
            notify_cdn_cache_invalidation(content_id)

def unpublish_expired_content():
    now = time.time()
    expired = r.zrangebyscore(UNPUBLISH_QUEUE, 0, now)
    for content_id in expired:
        removed = r.zrem(UNPUBLISH_QUEUE, content_id)
        if removed:
            r.hset(f"content:{content_id}", "status", "expired")
            r.srem("content:published", content_id)
```

## Rescheduling Content

Update the publish time by calling `zadd` again - it updates the score in place if the member already exists:

```python
def reschedule_content(content_id: str, new_publish_at: float):
    r.zadd(PUBLISH_QUEUE, {content_id: new_publish_at})
    r.hset(f"content:{content_id}", "publish_at", str(new_publish_at))
```

## Querying the Schedule

Get all content scheduled to publish in the next 24 hours:

```python
def upcoming_content(hours: int = 24) -> list:
    now = time.time()
    future = now + hours * 3600
    return r.zrangebyscore(PUBLISH_QUEUE, now, future, withscores=True)
```

## Canceling Scheduled Content

```python
def cancel_schedule(content_id: str):
    r.zrem(PUBLISH_QUEUE, content_id)
    r.zrem(UNPUBLISH_QUEUE, content_id)
    r.hset(f"content:{content_id}", "status", "draft")
```

## Monitoring

```bash
# Count items in the publish queue
ZCARD schedule:publish

# Items scheduled in the next hour
ZRANGEBYSCORE schedule:publish <now> <now+3600>

# Currently published content count
SCARD content:published
```

## Summary

Redis sorted sets scored by Unix timestamp provide an efficient content schedule. Workers poll for due items using `ZRANGEBYSCORE` and atomically claim them with `ZREM`. Separate queues for publish and unpublish actions let you manage full content lifecycle - from draft to published to expired - with a simple Redis-backed system.

