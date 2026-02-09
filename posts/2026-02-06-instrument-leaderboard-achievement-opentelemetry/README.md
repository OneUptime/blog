# How to Instrument Leaderboard and Achievement System Write and Query Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gaming, Leaderboards, Achievements, Performance

Description: Instrument leaderboard and achievement systems with OpenTelemetry to monitor write throughput, query latency, and ranking accuracy.

Leaderboards and achievements are deceptively simple features that hide serious scaling challenges. A leaderboard that works fine with 10,000 players can fall apart at 10 million. Achievement systems that trigger on every game event can become a bottleneck if not carefully managed. When the leaderboard is slow or stale, competitive players notice and get frustrated.

This post covers how to instrument both systems with OpenTelemetry to track latency, throughput, and correctness.

## Leaderboard Architecture

Most game leaderboards use one of these approaches:

- **Sorted sets in Redis**: fast reads and writes, but limited to a single node's memory.
- **Database with periodic recalculation**: handles large datasets but introduces staleness.
- **Hybrid**: real-time top-N in Redis with database-backed full rankings.

Regardless of the approach, you need to measure write latency, query latency, and ranking freshness.

## Instrumenting Leaderboard Writes

Every score submission should be traced:

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("leaderboard-service")
meter = metrics.get_meter("leaderboard-service")

write_latency = meter.create_histogram(
    "leaderboard.write.latency_ms",
    unit="ms",
    description="Latency of leaderboard score submissions"
)

write_counter = meter.create_counter(
    "leaderboard.write.count",
    description="Number of score submissions"
)

def submit_score(player_id, leaderboard_id, score, metadata):
    with tracer.start_as_current_span("leaderboard.submit_score") as span:
        span.set_attributes({
            "player.id": player_id,
            "leaderboard.id": leaderboard_id,
            "score.value": score,
            "leaderboard.type": get_leaderboard_type(leaderboard_id),
        })

        start = time.monotonic()

        # Check if this is a new high score for the player
        current_best = redis_client.zscore(
            f"lb:{leaderboard_id}", player_id
        )
        is_new_best = current_best is None or score > current_best
        span.set_attribute("score.is_new_best", is_new_best)

        if is_new_best:
            # Update the sorted set
            redis_client.zadd(f"lb:{leaderboard_id}", {player_id: score})

            # Also write to the persistent store for durability
            db.execute(
                "INSERT INTO scores (player_id, leaderboard_id, score, submitted_at) "
                "VALUES (%s, %s, %s, NOW()) "
                "ON CONFLICT (player_id, leaderboard_id) "
                "DO UPDATE SET score = GREATEST(scores.score, EXCLUDED.score)",
                (player_id, leaderboard_id, score)
            )

        elapsed_ms = (time.monotonic() - start) * 1000
        write_latency.record(elapsed_ms, {
            "leaderboard.id": leaderboard_id,
            "is_new_best": str(is_new_best),
        })
        write_counter.add(1, {"leaderboard.id": leaderboard_id})

        span.set_attribute("write.latency_ms", round(elapsed_ms, 2))
```

## Instrumenting Leaderboard Queries

Players query leaderboards in several ways: top-N, around-me, and friend rankings:

```python
query_latency = meter.create_histogram(
    "leaderboard.query.latency_ms",
    unit="ms",
    description="Latency of leaderboard queries"
)

def get_top_players(leaderboard_id, count=100):
    with tracer.start_as_current_span("leaderboard.query.top_n") as span:
        span.set_attributes({
            "leaderboard.id": leaderboard_id,
            "query.type": "top_n",
            "query.count": count,
        })

        start = time.monotonic()

        # Get top N from Redis sorted set (reverse order for highest first)
        results = redis_client.zrevrange(
            f"lb:{leaderboard_id}", 0, count - 1, withscores=True
        )

        elapsed_ms = (time.monotonic() - start) * 1000
        query_latency.record(elapsed_ms, {
            "leaderboard.id": leaderboard_id,
            "query.type": "top_n",
        })

        span.set_attribute("query.results_returned", len(results))
        span.set_attribute("query.latency_ms", round(elapsed_ms, 2))

        return results

def get_rank_around_player(leaderboard_id, player_id, window=5):
    with tracer.start_as_current_span("leaderboard.query.around_me") as span:
        span.set_attributes({
            "leaderboard.id": leaderboard_id,
            "player.id": player_id,
            "query.type": "around_me",
            "query.window": window,
        })

        start = time.monotonic()

        # Get the player's rank first
        rank = redis_client.zrevrank(f"lb:{leaderboard_id}", player_id)
        if rank is None:
            span.set_attribute("player.ranked", False)
            return None

        span.set_attribute("player.rank", rank + 1)

        # Fetch players around that rank
        start_idx = max(0, rank - window)
        end_idx = rank + window
        results = redis_client.zrevrange(
            f"lb:{leaderboard_id}", start_idx, end_idx, withscores=True
        )

        elapsed_ms = (time.monotonic() - start) * 1000
        query_latency.record(elapsed_ms, {
            "leaderboard.id": leaderboard_id,
            "query.type": "around_me",
        })

        span.set_attribute("query.latency_ms", round(elapsed_ms, 2))
        return results
```

## Instrumenting Achievement Evaluation

Achievements are typically evaluated when game events occur. This can be expensive if not batched:

```python
achievement_eval_latency = meter.create_histogram(
    "achievements.evaluation.latency_ms",
    unit="ms",
    description="Latency of achievement evaluation per event"
)

achievement_unlocks = meter.create_counter(
    "achievements.unlocks",
    description="Number of achievements unlocked"
)

def evaluate_achievements(player_id, event):
    with tracer.start_as_current_span("achievements.evaluate") as span:
        span.set_attributes({
            "player.id": player_id,
            "event.type": event.type,
        })

        start = time.monotonic()

        # Load player's current achievement progress
        progress = achievement_store.get_progress(player_id)
        span.set_attribute("achievements.in_progress", len(progress))

        # Only evaluate achievements relevant to this event type
        relevant = achievement_registry.get_by_event_type(event.type)
        span.set_attribute("achievements.evaluated", len(relevant))

        newly_unlocked = []
        for achievement in relevant:
            player_progress = progress.get(achievement.id, {})

            # Check if the event advances this achievement
            new_progress = achievement.evaluate(event, player_progress)

            if new_progress != player_progress:
                achievement_store.update_progress(
                    player_id, achievement.id, new_progress
                )

            if achievement.is_complete(new_progress):
                newly_unlocked.append(achievement)
                achievement_unlocks.add(1, {
                    "achievement.id": achievement.id,
                    "achievement.category": achievement.category,
                })

        elapsed_ms = (time.monotonic() - start) * 1000
        achievement_eval_latency.record(elapsed_ms, {
            "event.type": event.type,
        })

        span.set_attributes({
            "achievements.newly_unlocked": len(newly_unlocked),
            "evaluation.latency_ms": round(elapsed_ms, 2),
        })

        return newly_unlocked
```

## Tracking Leaderboard Freshness

If you use periodic recalculation, measure how stale the leaderboard data is:

```python
freshness_gauge = meter.create_observable_gauge(
    "leaderboard.freshness_seconds",
    callbacks=[lambda options: [
        metrics.Observation(
            value=time.time() - get_last_recalculation_time(lb_id),
            attributes={"leaderboard.id": lb_id}
        )
        for lb_id in get_all_leaderboard_ids()
    ]],
    unit="s",
    description="Seconds since the leaderboard was last recalculated"
)
```

## Alerts to Set

- **Write latency P99 above 50ms**: leaderboard writes are usually on the game's critical path after a match ends.
- **Query latency P95 above 200ms**: players expect leaderboards to load instantly.
- **Achievement evaluation latency above 10ms per event**: this runs on every game event, so it needs to be fast.
- **Leaderboard freshness above threshold**: if the board has not been recalculated in the expected interval, the periodic job may have failed.
- **Sudden spike in achievement unlocks for a single achievement**: possible exploit or bug.

## Conclusion

Leaderboards and achievements seem like simple CRUD features until they need to handle millions of concurrent players. By instrumenting write throughput, query latency, and evaluation performance with OpenTelemetry, you catch scaling problems before they impact players. The traces also help you identify which specific leaderboard or achievement is causing problems, so you can optimize the right thing instead of guessing.
