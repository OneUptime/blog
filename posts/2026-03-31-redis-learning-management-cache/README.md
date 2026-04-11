# How to Build a Learning Management Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Education, Cache

Description: Cache course catalogs, lesson content, and student dashboards in Redis to reduce LMS database load and deliver fast page loads during peak enrollment periods.

---

Learning management systems (LMS) experience highly uneven traffic: load spikes at course start times, during assignment deadlines, and when new courses are released. Redis caching flattens these spikes by serving frequently accessed data from memory instead of repeatedly hitting the database.

## What to Cache in an LMS

| Data | TTL | Reason |
|------|-----|--------|
| Course catalog | 15 minutes | Changes infrequently |
| Lesson content | 1 hour | Static per publish |
| Student dashboard | 5 minutes | Mix of dynamic and static |
| Video metadata | 30 minutes | Rarely changes |
| Instructor profile | 1 hour | Rarely changes |

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

CACHE_PREFIX = "lms"
```

## Course Catalog Cache

```python
def get_course_catalog(category: str = "all", page: int = 1, page_size: int = 20) -> dict:
    cache_key = f"{CACHE_PREFIX}:catalog:{category}:p{page}:s{page_size}"
    cached = r.get(cache_key)

    if cached:
        return json.loads(cached)

    # Fetch from database
    catalog = fetch_catalog_from_db(category, page, page_size)
    r.setex(cache_key, 900, json.dumps(catalog))  # 15 minutes
    return catalog

def fetch_catalog_from_db(category: str, page: int, page_size: int) -> dict:
    # Replace with actual DB query
    return {
        "category": category,
        "page": page,
        "total": 150,
        "courses": [
            {"id": f"course-{i}", "title": f"Course {i}", "category": category,
             "enrolled": 100 + i, "rating": 4.5}
            for i in range((page - 1) * page_size, page * page_size)
        ]
    }
```

## Lesson Content Cache

```python
def get_lesson(course_id: str, lesson_id: str) -> dict | None:
    cache_key = f"{CACHE_PREFIX}:lesson:{course_id}:{lesson_id}"
    cached = r.get(cache_key)

    if cached:
        return json.loads(cached)

    lesson = fetch_lesson_from_db(course_id, lesson_id)
    if lesson:
        r.setex(cache_key, 3600, json.dumps(lesson))  # 1 hour
    return lesson

def invalidate_lesson(course_id: str, lesson_id: str):
    r.delete(f"{CACHE_PREFIX}:lesson:{course_id}:{lesson_id}")

def invalidate_course_lessons(course_id: str):
    pattern = f"{CACHE_PREFIX}:lesson:{course_id}:*"
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        if keys:
            r.delete(*keys)
        if cursor == 0:
            break
```

## Student Dashboard Cache

```python
def get_student_dashboard(student_id: str) -> dict:
    cache_key = f"{CACHE_PREFIX}:dashboard:{student_id}"
    cached = r.get(cache_key)

    if cached:
        return json.loads(cached)

    dashboard = build_student_dashboard(student_id)
    r.setex(cache_key, 300, json.dumps(dashboard))  # 5 minutes
    return dashboard

def invalidate_student_dashboard(student_id: str):
    r.delete(f"{CACHE_PREFIX}:dashboard:{student_id}")

def build_student_dashboard(student_id: str) -> dict:
    # Combine data from multiple sources
    return {
        "student_id": student_id,
        "enrolled_courses": 5,
        "completed_courses": 2,
        "upcoming_deadlines": [
            {"course": "py101", "assignment": "Midterm", "due": "2026-04-15"}
        ],
        "recent_activity": [],
        "built_at": int(time.time())
    }
```

## Bulk Cache Warming

Pre-populate the cache before peak traffic (e.g., before semester start):

```python
def warm_course_catalog_cache(categories: list[str], pages: int = 5):
    print(f"Warming cache for {len(categories)} categories, {pages} pages each...")
    for category in categories:
        for page in range(1, pages + 1):
            catalog = fetch_catalog_from_db(category, page, 20)
            key = f"{CACHE_PREFIX}:catalog:{category}:p{page}:s20"
            r.setex(key, 900, json.dumps(catalog))
    print("Cache warming complete")
```

## Cache Hit Rate Monitoring

```python
def get_cache_stats() -> dict:
    info = r.info("stats")
    hits = info.get("keyspace_hits", 0)
    misses = info.get("keyspace_misses", 0)
    total = hits + misses
    hit_rate = (hits / total * 100) if total > 0 else 0

    memory_info = r.info("memory")
    return {
        "hit_rate_pct": round(hit_rate, 2),
        "total_hits": hits,
        "total_misses": misses,
        "memory_used_mb": round(memory_info["used_memory"] / 1024 / 1024, 2)
    }
```

## Fetch helpers (stubs)

```python
def fetch_lesson_from_db(course_id: str, lesson_id: str) -> dict | None:
    return {
        "id": lesson_id,
        "course_id": course_id,
        "title": "Introduction",
        "content_url": f"https://cdn.example.com/{course_id}/{lesson_id}.mp4",
        "duration_minutes": 12
    }
```

## Summary

An LMS Redis cache layers TTL-based caching across course catalogs, lesson content, and student dashboards, with different TTLs tuned to how frequently each data type changes. Cache warming before peak periods prevents stampedes, targeted invalidation keeps content fresh after updates, and hit-rate monitoring helps tune TTLs over time.
