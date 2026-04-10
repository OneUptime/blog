# How to Build a Tournament Bracket System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Tournament, Bracket, Gaming, Hash

Description: Build a tournament bracket system with Redis that manages rounds, matches, and automatic advancement using Hashes and Sorted Sets.

---

Tournament brackets require tracking participants, match pairings, results, and winner advancement across multiple rounds. Redis Hashes and Sorted Sets handle all of this with low latency, making real-time tournament updates instant.

## Tournament Data Model

```python
import redis
import math

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_tournament(tournament_id: str, participants: list):
    pipe = r.pipeline()
    # Store participant list
    pipe.rpush(f"tournament:{tournament_id}:participants", *participants)
    pipe.hset(f"tournament:{tournament_id}:meta", mapping={
        "status": "active",
        "total_rounds": int(math.log2(len(participants))),
        "current_round": 1,
        "participant_count": len(participants),
    })
    pipe.execute()
    # Create round 1 matches
    create_round_matches(tournament_id, 1, participants)
```

## Creating Bracket Matches

```python
def create_round_matches(tournament_id: str, round_num: int, players: list):
    pipe = r.pipeline()
    for i in range(0, len(players), 2):
        match_id = f"match:{round_num}:{i // 2}"
        player_a = players[i]
        player_b = players[i + 1] if i + 1 < len(players) else "BYE"

        pipe.hset(f"tournament:{tournament_id}:{match_id}", mapping={
            "player_a": player_a,
            "player_b": player_b,
            "status": "pending",
            "winner": "",
        })
    pipe.execute()
```

## Recording Match Results

```python
def record_match_result(tournament_id: str, round_num: int,
                        match_num: int, winner: str, score: str):
    match_key = f"tournament:{tournament_id}:match:{round_num}:{match_num}"

    pipe = r.pipeline()
    pipe.hset(match_key, mapping={
        "winner": winner,
        "score": score,
        "status": "completed",
    })
    # Track winner in sorted set for leaderboard
    pipe.zincrby(f"tournament:{tournament_id}:wins", 1, winner)
    pipe.execute()

    # Advance winners to next round
    advance_winners_if_round_complete(tournament_id, round_num)
```

## Advancing to Next Round

```python
def advance_winners_if_round_complete(tournament_id: str, round_num: int):
    meta = r.hgetall(f"tournament:{tournament_id}:meta")
    participant_count = int(meta["participant_count"])
    matches_in_round = participant_count // (2 ** round_num)

    # Check all matches completed
    winners = []
    for i in range(matches_in_round):
        match = r.hgetall(f"tournament:{tournament_id}:match:{round_num}:{i}")
        if match.get("status") != "completed":
            return  # Round not done yet
        winners.append(match["winner"])

    # Check if tournament is complete
    if len(winners) == 1:
        r.hset(f"tournament:{tournament_id}:meta", "status", "completed")
        return

    # Create next round
    next_round = round_num + 1
    create_round_matches(tournament_id, next_round, winners)
    r.hset(f"tournament:{tournament_id}:meta", "current_round", next_round)
```

## Getting Bracket State

```python
def get_bracket(tournament_id: str, round_num: int) -> list:
    meta = r.hgetall(f"tournament:{tournament_id}:meta")
    participant_count = int(meta.get("participant_count", 0))
    matches_in_round = participant_count // (2 ** round_num)

    matches = []
    for i in range(matches_in_round):
        match = r.hgetall(f"tournament:{tournament_id}:match:{round_num}:{i}")
        if match:
            matches.append({"match": i + 1, **match})
    return matches
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your tournament service and alert if match result submissions fail - preventing bracket progression from stalling.

## Summary

Redis Hashes store per-match state (players, scores, status, winner) and per-tournament metadata (current round, participant count). Sorted Sets track cumulative wins for a tournament leaderboard. Automatic round advancement is triggered when all matches in a round transition to "completed" status.
