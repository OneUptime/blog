# How to Build a Student Progress Tracker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Education, Progress

Description: Track student learning progress in real time using Redis hashes for completion state, sorted sets for course rankings, and bitmaps for lesson tracking.

---

Learning management systems need to track which lessons a student has completed, their quiz scores, and their standing relative to peers - all with low latency so progress dashboards feel instant. Redis hashes, sorted sets, and bitmaps are the right tools for this.

## Data Model

```bash
# Student progress hash: course completion per module
HSET student:u42:course:py101 module_1 100 module_2 75 module_3 0 quiz_score 88

# Course leaderboard sorted set
ZADD course:py101:leaderboard 88 u42

# Lesson completion bitmap (1 bit per lesson, lesson_id as offset)
SETBIT student:u42:course:py101:lessons 0 1
SETBIT student:u42:course:py101:lessons 1 1
SETBIT student:u42:course:py101:lessons 2 0
```

## Setup

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

PROGRESS_PREFIX = "student"
LEADERBOARD_PREFIX = "course"
LESSON_BITMAP_SUFFIX = ":lessons"
```

## Recording Lesson Completion

```python
def complete_lesson(student_id: str, course_id: str, lesson_index: int, lesson_count: int):
    bitmap_key = f"{PROGRESS_PREFIX}:{student_id}:course:{course_id}{LESSON_BITMAP_SUFFIX}"
    progress_key = f"{PROGRESS_PREFIX}:{student_id}:course:{course_id}"

    # Mark lesson complete in bitmap
    r.setbit(bitmap_key, lesson_index, 1)

    # Calculate overall completion percentage
    completed = r.bitcount(bitmap_key)
    completion_pct = round((completed / lesson_count) * 100, 1)

    # Determine which module the lesson belongs to (10 lessons per module)
    module_num = (lesson_index // 10) + 1
    module_key = f"module_{module_num}"

    # Count completed lessons in this module using GETBIT
    start_bit = (module_num - 1) * 10
    end_bit = min(start_bit + 10, lesson_count)
    bit_pipe = r.pipeline()
    for i in range(start_bit, end_bit):
        bit_pipe.getbit(bitmap_key, i)
    bits = bit_pipe.execute()
    module_completed = sum(bits)
    module_lessons = end_bit - start_bit
    module_pct = round((module_completed / module_lessons) * 100, 1) if module_lessons > 0 else 0

    pipe = r.pipeline()
    pipe.hset(progress_key, mapping={
        module_key: module_pct,
        "overall_completion": completion_pct,
        "last_lesson": lesson_index,
        "last_active": int(time.time())
    })
    pipe.execute()

    return {"completion": completion_pct, "completed_lessons": completed}
```

## Recording a Quiz Score

```python
def record_quiz_score(student_id: str, course_id: str, quiz_id: str, score: float):
    progress_key = f"{PROGRESS_PREFIX}:{student_id}:course:{course_id}"
    leaderboard_key = f"{LEADERBOARD_PREFIX}:{course_id}:leaderboard"

    # Read existing quiz scores before update
    existing_fields = r.hgetall(progress_key)
    quiz_scores = {k: float(v) for k, v in existing_fields.items()
                   if k.startswith("quiz_") and k.endswith("_score")}

    # Include or update the current quiz score
    quiz_scores[f"quiz_{quiz_id}_score"] = score
    avg_score = sum(quiz_scores.values()) / len(quiz_scores)

    pipe = r.pipeline()
    pipe.hset(progress_key, mapping={
        f"quiz_{quiz_id}_score": score,
        "last_quiz_score": score,
        "last_active": int(time.time())
    })
    pipe.zadd(leaderboard_key, {student_id: avg_score})
    pipe.execute()
```

## Getting Student Progress

```python
def get_student_progress(student_id: str, course_id: str, lesson_count: int) -> dict:
    progress_key = f"{PROGRESS_PREFIX}:{student_id}:course:{course_id}"
    bitmap_key = f"{PROGRESS_PREFIX}:{student_id}:course:{course_id}{LESSON_BITMAP_SUFFIX}"

    progress = r.hgetall(progress_key)
    completed_lessons = r.bitcount(bitmap_key)

    leaderboard_key = f"{LEADERBOARD_PREFIX}:{course_id}:leaderboard"
    rank = r.zrevrank(leaderboard_key, student_id)

    return {
        "student_id": student_id,
        "course_id": course_id,
        "completed_lessons": completed_lessons,
        "total_lessons": lesson_count,
        "completion_pct": round((completed_lessons / lesson_count) * 100, 1) if lesson_count > 0 else 0,
        "rank": rank + 1 if rank is not None else None,
        "last_active": progress.get("last_active"),
        "progress": progress
    }
```

## Course Leaderboard

```python
def get_course_leaderboard(course_id: str, top_n: int = 20) -> list:
    leaderboard_key = f"{LEADERBOARD_PREFIX}:{course_id}:leaderboard"
    entries = r.zrange(leaderboard_key, 0, top_n - 1, desc=True, withscores=True)
    return [
        {"rank": i + 1, "student_id": sid, "avg_score": round(score, 1)}
        for i, (sid, score) in enumerate(entries)
    ]
```

## Streaks and Activity Tracking

```python
def record_daily_activity(student_id: str, course_id: str):
    today = time.strftime("%Y-%m-%d")
    activity_key = f"{PROGRESS_PREFIX}:{student_id}:activity_days"
    r.sadd(activity_key, today)
    r.expire(activity_key, 90 * 86400)  # Keep 90 days of activity data

def get_active_days(student_id: str) -> int:
    return r.scard(f"{PROGRESS_PREFIX}:{student_id}:activity_days")
```

## Summary

A Redis student progress tracker uses bitmaps for memory-efficient lesson completion tracking, hashes for module-level progress storage, and sorted sets for real-time course leaderboards. Bitmaps make it practical to track completion across hundreds of lessons per course using only a few dozen bytes per student.
