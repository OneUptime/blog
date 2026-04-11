# How to Implement Player Matchmaking Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Matchmaking, Gaming, Sorted Set, Queue

Description: Build a skill-based player matchmaking queue with Redis Sorted Sets to match players of similar skill levels with configurable wait time tolerance.

---

## Overview

Matchmaking queues pair players of similar skill levels for fair game sessions. Redis Sorted Sets are perfect for this: players are scored by their skill rating (ELO/MMR), enabling efficient range queries to find compatible opponents. Wait time tolerance expands the skill window the longer a player waits.

## Player Queue Design

```text
matchmaking:{game_mode}:{region}  -> Sorted Set: player_id scored by skill rating
player:{player_id}:queue          -> Hash: {skill_rating, queued_at, game_mode, region, status}
```

## Joining the Queue

```python
import time
import json
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

def join_queue(
    player_id: str,
    skill_rating: int,
    game_mode: str = "ranked",
    region: str = "us-east"
) -> bool:
    """Add player to matchmaking queue."""
    queue_key = f"matchmaking:{game_mode}:{region}"
    player_key = f"player:{player_id}:queue"

    # Check if already in queue
    if r.zscore(queue_key, player_id) is not None:
        return False  # Already queued

    pipe = r.pipeline()
    # Add to queue sorted by skill rating
    pipe.zadd(queue_key, {player_id: skill_rating})
    # Store queue metadata
    pipe.hset(player_key, mapping={
        "skill_rating": str(skill_rating),
        "queued_at": str(time.time()),
        "game_mode": game_mode,
        "region": region,
        "status": "searching"
    })
    pipe.expire(player_key, 600)  # Auto-remove after 10 minutes
    pipe.execute()
    return True

def leave_queue(player_id: str, game_mode: str = "ranked", region: str = "us-east"):
    """Remove player from matchmaking queue."""
    queue_key = f"matchmaking:{game_mode}:{region}"
    pipe = r.pipeline()
    pipe.zrem(queue_key, player_id)
    pipe.delete(f"player:{player_id}:queue")
    pipe.execute()
```

## Skill-Based Matching

```python
BASE_SKILL_WINDOW = 100   # Initial window
WINDOW_EXPAND_RATE = 50   # Expand by 50 per minute
MAX_SKILL_WINDOW = 500    # Maximum window

def calculate_skill_window(queued_at: float) -> int:
    """Expand skill window based on wait time."""
    wait_seconds = time.time() - queued_at
    wait_minutes = wait_seconds / 60
    window = BASE_SKILL_WINDOW + int(wait_minutes * WINDOW_EXPAND_RATE)
    return min(window, MAX_SKILL_WINDOW)

def find_match(
    player_id: str,
    game_mode: str = "ranked",
    region: str = "us-east",
    players_per_match: int = 2
) -> list[str] | None:
    """Find compatible players for a match."""
    queue_key = f"matchmaking:{game_mode}:{region}"
    player_key = f"player:{player_id}:queue"
    player_data = r.hgetall(player_key)

    if not player_data:
        return None

    skill_rating = int(player_data["skill_rating"])
    queued_at = float(player_data["queued_at"])
    skill_window = calculate_skill_window(queued_at)

    min_skill = skill_rating - skill_window
    max_skill = skill_rating + skill_window

    # Find players within skill window
    candidates = r.zrangebyscore(
        queue_key,
        min_skill,
        max_skill
    )

    # Filter out the player themselves
    candidates = [p for p in candidates if p != player_id]

    if len(candidates) < players_per_match - 1:
        return None  # Not enough players found

    # Select best matches (closest skill)
    pipe = r.pipeline()
    for p in candidates:
        pipe.hget(f"player:{p}:queue", "skill_rating")
    skill_ratings = pipe.execute()

    # Sort by skill proximity to the searching player
    ranked = sorted(
        zip(candidates, skill_ratings),
        key=lambda x: abs(int(x[1] or 0) - skill_rating)
    )

    # Select top N-1 candidates
    selected = [p for p, _ in ranked[:players_per_match - 1]]
    return [player_id] + selected
```

## Creating a Match

```python
def create_match(
    players: list[str],
    game_mode: str = "ranked",
    region: str = "us-east"
) -> str:
    """Create a match from matched players."""
    import uuid
    match_id = str(uuid.uuid4())[:12]
    queue_key = f"matchmaking:{game_mode}:{region}"

    pipe = r.pipeline()

    # Remove players from queue
    for player_id in players:
        pipe.zrem(queue_key, player_id)
        pipe.hset(f"player:{player_id}:queue", "status", "matched")

    # Create match record
    match_data = {
        "id": match_id,
        "players": json.dumps(players),
        "game_mode": game_mode,
        "region": region,
        "created_at": str(int(time.time())),
        "status": "pending"
    }
    pipe.hset(f"match:{match_id}", mapping=match_data)
    pipe.expire(f"match:{match_id}", 3600)

    # Notify players
    for player_id in players:
        pipe.publish(
            f"player:{player_id}:notifications",
            json.dumps({"event": "match_found", "match_id": match_id})
        )

    pipe.execute()
    return match_id
```

## Matchmaking Loop

```python
def run_matchmaking_loop(
    game_mode: str = "ranked",
    region: str = "us-east",
    interval: float = 1.0
):
    """Run continuous matchmaking for a game mode and region."""
    queue_key = f"matchmaking:{game_mode}:{region}"

    while True:
        players_in_queue = r.zrange(queue_key, 0, -1)

        for player_id in players_in_queue:
            # Skip if already matched in this pass
            status = r.hget(f"player:{player_id}:queue", "status")
            if status != "searching":
                continue

            matched = find_match(player_id, game_mode, region)
            if matched:
                match_id = create_match(matched, game_mode, region)
                print(f"Match created: {match_id} for players: {matched}")

        time.sleep(interval)

def get_queue_stats(game_mode: str = "ranked", region: str = "us-east") -> dict:
    """Get current queue statistics."""
    queue_key = f"matchmaking:{game_mode}:{region}"
    players = r.zrange(queue_key, 0, -1, withscores=True)

    if not players:
        return {"queue_size": 0, "avg_skill": 0, "avg_wait_seconds": 0}

    skills = [score for _, score in players]
    now = time.time()
    wait_times = []
    for player_id, _ in players:
        queued_at = r.hget(f"player:{player_id}:queue", "queued_at")
        if queued_at:
            wait_times.append(now - float(queued_at))

    return {
        "queue_size": len(players),
        "avg_skill": int(sum(skills) / len(skills)),
        "min_skill": int(min(skills)),
        "max_skill": int(max(skills)),
        "avg_wait_seconds": round(sum(wait_times) / len(wait_times), 1) if wait_times else 0
    }
```

## Summary

Redis Sorted Sets with skill rating scores enable O(log n) range queries to find players within an expanding skill window. Wait time-based window expansion prevents long queues in low-population game modes while maintaining match quality. Pub/Sub notifications deliver match-found events to players in real time, and atomic pipeline operations ensure players are removed from the queue and added to a match without race conditions.
