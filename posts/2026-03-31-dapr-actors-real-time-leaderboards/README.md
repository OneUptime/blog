# How to Use Dapr Actors for Real-Time Leaderboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Leaderboard, Real-Time, Game

Description: Build real-time leaderboards using Dapr actors to maintain sorted player scores with atomic updates, supporting both global and per-match leaderboard patterns.

---

Leaderboards require high-frequency score updates with consistent ordering and fast reads. Dapr actors solve the concurrent update problem elegantly - one leaderboard actor instance processes all updates sequentially via turn-based concurrency.

## Leaderboard Actor Design

Use a single actor per leaderboard context (global, per-game, per-region):

```text
Actor Type: Leaderboard
Actor ID:   global | match-001 | region-us-west
```

## Leaderboard Actor Implementation

```go
package main

import (
  "context"
  "fmt"
  "sort"
  "github.com/dapr/go-sdk/actor"
)

type PlayerScore struct {
  PlayerID string  `json:"playerId"`
  Name     string  `json:"name"`
  Score    int     `json:"score"`
  Rank     int     `json:"rank"`
}

type LeaderboardState struct {
  Scores []PlayerScore `json:"scores"`
}

type LeaderboardActor struct {
  actor.ServerImplBase
}

func (a *LeaderboardActor) Type() string { return "Leaderboard" }

func (a *LeaderboardActor) UpdateScore(ctx context.Context, req *ScoreUpdate) error {
  var state LeaderboardState
  a.GetStateManager().Get(ctx, "board", &state)

  // Update or insert player score
  found := false
  for i, p := range state.Scores {
    if p.PlayerID == req.PlayerID {
      state.Scores[i].Score = req.Score
      state.Scores[i].Name = req.Name
      found = true
      break
    }
  }
  if !found {
    state.Scores = append(state.Scores, PlayerScore{
      PlayerID: req.PlayerID,
      Name:     req.Name,
      Score:    req.Score,
    })
  }

  // Sort descending by score
  sort.Slice(state.Scores, func(i, j int) bool {
    return state.Scores[i].Score > state.Scores[j].Score
  })

  // Assign ranks
  for i := range state.Scores {
    state.Scores[i].Rank = i + 1
  }

  return a.GetStateManager().Set(ctx, "board", state)
}

func (a *LeaderboardActor) GetTopN(ctx context.Context, req *TopNRequest) ([]PlayerScore, error) {
  var state LeaderboardState
  if err := a.GetStateManager().Get(ctx, "board", &state); err != nil {
    return []PlayerScore{}, nil
  }

  n := req.N
  if n > len(state.Scores) {
    n = len(state.Scores)
  }
  return state.Scores[:n], nil
}

func (a *LeaderboardActor) GetPlayerRank(ctx context.Context, playerID string) (*PlayerScore, error) {
  var state LeaderboardState
  a.GetStateManager().Get(ctx, "board", &state)

  for _, p := range state.Scores {
    if p.PlayerID == playerID {
      return &p, nil
    }
  }
  return nil, fmt.Errorf("player %s not on leaderboard", playerID)
}

type ScoreUpdate struct {
  PlayerID string `json:"playerId"`
  Name     string `json:"name"`
  Score    int    `json:"score"`
}

type TopNRequest struct {
  N int `json:"n"`
}
```

## Submitting a Score

```bash
curl -X POST http://localhost:3500/v1.0/actors/Leaderboard/global/method/UpdateScore \
  -H "Content-Type: application/json" \
  -d '{"playerId": "player-007", "name": "Alice", "score": 9850}'
```

## Reading the Top 10

```bash
curl -X POST http://localhost:3500/v1.0/actors/Leaderboard/global/method/GetTopN \
  -H "Content-Type: application/json" \
  -d '{"n": 10}'
```

Response:

```json
[
  {"playerId": "player-007", "name": "Alice", "score": 9850, "rank": 1},
  {"playerId": "player-042", "name": "Bob", "score": 9200, "rank": 2}
]
```

## Hierarchical Leaderboards

For per-match leaderboards that feed into a global one, update both actors:

```go
func submitScore(ctx context.Context, client dapr.Client, matchID, playerID, name string, score int) error {
  update := ScoreUpdate{PlayerID: playerID, Name: name, Score: score}

  // Update match leaderboard
  client.InvokeActor(ctx, &dapr.InvokeActorRequest{
    ActorType: "Leaderboard", ActorID: "match-" + matchID,
    Method: "UpdateScore", Data: mustMarshal(update),
  })

  // Update global leaderboard
  client.InvokeActor(ctx, &dapr.InvokeActorRequest{
    ActorType: "Leaderboard", ActorID: "global",
    Method: "UpdateScore", Data: mustMarshal(update),
  })
  return nil
}
```

## Summary

Dapr actors provide a simple, race-condition-free leaderboard implementation by serializing all score updates through turn-based concurrency. A single leaderboard actor maintains a sorted, ranked list that is automatically persisted to the state store. For large leaderboards (millions of players), consider sharded leaderboard actors with periodic merge operations to avoid single-actor bottlenecks.
