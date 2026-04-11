# How to Build a Game Event Replay System with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Game Events, Replay, Event Sourcing

Description: Build a game event replay system using Redis Streams to record player actions and game state changes for replay, debugging, and anti-cheat analysis.

---

## Overview

Game event replay records every action that occurs during a match - player movements, shots fired, item pickups, kills - and stores them in order for later replay. Redis Streams are ideal: they provide an append-only ordered log with auto-generated timestamp IDs and persistent storage for the duration of a match.

## Event Recording

```python
import json
import time
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

MATCH_REPLAY_TTL = 7 * 86400  # Keep replays for 7 days

def record_game_event(
    match_id: str,
    event_type: str,
    player_id: str,
    data: dict
) -> str:
    """Record a game event to the match stream."""
    stream_key = f"replay:{match_id}"

    event_data = {
        "event_type": event_type,
        "player_id": player_id,
        "match_id": match_id,
        **{k: str(v) for k, v in data.items()}
    }

    message_id = r.xadd(stream_key, event_data)
    # Set TTL on first add
    r.expire(stream_key, MATCH_REPLAY_TTL)
    return message_id

# Event recording helpers
def record_player_move(match_id: str, player_id: str, x: float, y: float, z: float):
    return record_game_event(match_id, "player_move", player_id, {
        "x": x, "y": y, "z": z
    })

def record_shot_fired(
    match_id: str,
    player_id: str,
    weapon: str,
    target_x: float,
    target_y: float
):
    return record_game_event(match_id, "shot_fired", player_id, {
        "weapon": weapon,
        "target_x": target_x,
        "target_y": target_y
    })

def record_kill(
    match_id: str,
    killer_id: str,
    victim_id: str,
    weapon: str,
    headshot: bool = False
):
    return record_game_event(match_id, "kill", killer_id, {
        "victim_id": victim_id,
        "weapon": weapon,
        "headshot": str(headshot)
    })

def record_match_start(match_id: str, players: list[str], map_name: str):
    return record_game_event(match_id, "match_start", "system", {
        "players": json.dumps(players),
        "map": map_name,
        "started_at": str(int(time.time()))
    })

def record_match_end(match_id: str, winner_id: str, scores: dict):
    return record_game_event(match_id, "match_end", "system", {
        "winner_id": winner_id,
        "scores": json.dumps(scores),
        "ended_at": str(int(time.time()))
    })
```

## Reading Replay Events

```python
def get_full_replay(match_id: str) -> list[dict]:
    """Get all events for a match in chronological order."""
    stream_key = f"replay:{match_id}"
    entries = r.xrange(stream_key)

    return [
        {
            "id": msg_id,
            "timestamp_ms": int(msg_id.split("-")[0]),
            **fields
        }
        for msg_id, fields in entries
    ]

def get_events_in_range(
    match_id: str,
    start_ms: int,
    end_ms: int
) -> list[dict]:
    """Get events in a specific time range (for highlights)."""
    stream_key = f"replay:{match_id}"
    start_id = f"{start_ms}-0"
    end_id = f"{end_ms}-999999"

    entries = r.xrange(stream_key, min=start_id, max=end_id)
    return [
        {"id": mid, "timestamp_ms": int(mid.split("-")[0]), **fields}
        for mid, fields in entries
    ]

def get_player_events(match_id: str, player_id: str) -> list[dict]:
    """Get all events for a specific player."""
    all_events = get_full_replay(match_id)
    return [e for e in all_events if e.get("player_id") == player_id]

def get_event_count(match_id: str) -> int:
    """Get total event count for a match."""
    return r.xlen(f"replay:{match_id}")
```

## Anti-Cheat Analysis

```python
def analyze_shots_for_aimbot(match_id: str, player_id: str) -> dict:
    """Analyze shooting patterns for potential aimbot detection."""
    player_events = get_player_events(match_id, player_id)
    shots = [e for e in player_events if e["event_type"] == "shot_fired"]
    kills = [e for e in player_events if e["event_type"] == "kill"]

    if not shots:
        return {"suspicious": False, "reason": "no_shots"}

    headshot_count = sum(1 for k in kills if k.get("headshot") == "True")
    headshot_rate = headshot_count / len(kills) if kills else 0

    # Calculate shot intervals (milliseconds between shots)
    shot_times = [int(s["timestamp_ms"]) for s in shots]
    intervals = [shot_times[i+1] - shot_times[i] for i in range(len(shot_times)-1)]
    avg_interval = sum(intervals) / len(intervals) if intervals else 0

    suspicious = False
    reasons = []

    if headshot_rate > 0.85 and len(kills) > 10:
        suspicious = True
        reasons.append(f"high_headshot_rate:{headshot_rate:.2%}")

    if avg_interval < 50 and len(shots) > 20:  # Superhuman reaction
        suspicious = True
        reasons.append(f"inhuman_shot_speed:{avg_interval:.0f}ms")

    return {
        "player_id": player_id,
        "suspicious": suspicious,
        "reasons": reasons,
        "headshot_rate": round(headshot_rate, 3),
        "total_shots": len(shots),
        "total_kills": len(kills),
        "avg_shot_interval_ms": round(avg_interval, 1)
    }

def generate_match_highlights(match_id: str) -> list[dict]:
    """Extract highlight moments (kills, streaks) from replay."""
    kill_events = [
        e for e in get_full_replay(match_id)
        if e["event_type"] == "kill"
    ]

    highlights = []
    for kill in kill_events:
        # Get 5 seconds of context around each kill
        ts = int(kill["timestamp_ms"])
        segment = get_events_in_range(match_id, ts - 5000, ts + 2000)
        highlights.append({
            "type": "kill",
            "killer": kill["player_id"],
            "victim": kill.get("victim_id"),
            "weapon": kill.get("weapon"),
            "timestamp_ms": ts,
            "event_count": len(segment)
        })

    return highlights
```

## Match Summary Statistics

```python
def get_match_statistics(match_id: str) -> dict:
    """Compute match statistics from the event log."""
    events = get_full_replay(match_id)
    stats = {}

    for event in events:
        player_id = event.get("player_id")
        event_type = event.get("event_type")

        if player_id and player_id != "system":
            if player_id not in stats:
                stats[player_id] = {
                    "kills": 0, "deaths": 0, "shots_fired": 0
                }
            if event_type == "kill":
                stats[player_id]["kills"] += 1
                victim = event.get("victim_id")
                if victim:
                    if victim not in stats:
                        stats[victim] = {
                            "kills": 0, "deaths": 0, "shots_fired": 0
                        }
                    stats[victim]["deaths"] += 1
            elif event_type == "shot_fired":
                stats[player_id]["shots_fired"] += 1

    return {
        "match_id": match_id,
        "total_events": len(events),
        "player_stats": stats
    }
```

## Summary

Redis Streams serve as a persistent, ordered event log for game replay systems, with auto-generated millisecond-precision IDs providing natural temporal ordering. The append-only nature of Streams ensures event integrity for anti-cheat analysis, while range queries enable efficient extraction of time-window highlights. TTL-based expiration automatically cleans up old replays, keeping storage proportional to active replay demand.
