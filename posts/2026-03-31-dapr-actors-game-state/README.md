# How to Use Actors for Game State Management in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Game, State Management, Real-Time

Description: Use Dapr actors to manage real-time game state including player positions, scores, and game room lifecycle with turn-based concurrency guarantees.

---

Online games require fast, consistent per-entity state management. Dapr actors are a natural fit: each game room, player, or match maps to a unique actor instance, providing isolated state and serialized updates without explicit locking.

## Game Room Actor Design

```text
Actor Type: GameRoom
Actor ID:   <roomId>

Actor Type: Player
Actor ID:   <playerId>
```

## Implementing a Game Room Actor

```go
package main

import (
  "context"
  "fmt"
  "time"
  "github.com/dapr/go-sdk/actor"
)

type GameRoomState struct {
  RoomID    string            `json:"roomId"`
  Players   []string          `json:"players"`
  Status    string            `json:"status"` // waiting, active, finished
  Scores    map[string]int    `json:"scores"`
  StartedAt *time.Time        `json:"startedAt,omitempty"`
}

type GameRoomActor struct {
  actor.ServerImplBaseCtx
}

func (a *GameRoomActor) Type() string { return "GameRoom" }

func (a *GameRoomActor) JoinRoom(ctx context.Context, req *JoinRequest) (*GameRoomState, error) {
  var state GameRoomState
  a.GetStateManager().Get(ctx, "room", &state)

  if state.Status == "" {
    state.Status = "waiting"
    state.Scores = make(map[string]int)
    state.RoomID = a.ID()
  }

  if len(state.Players) >= 4 {
    return nil, fmt.Errorf("room is full")
  }

  state.Players = append(state.Players, req.PlayerID)
  state.Scores[req.PlayerID] = 0

  if len(state.Players) == 4 {
    now := time.Now().UTC()
    state.Status = "active"
    state.StartedAt = &now
  }

  a.GetStateManager().Set(ctx, "room", state)
  return &state, nil
}

func (a *GameRoomActor) UpdateScore(ctx context.Context, req *ScoreUpdate) error {
  var state GameRoomState
  if err := a.GetStateManager().Get(ctx, "room", &state); err != nil {
    return fmt.Errorf("room not found")
  }

  if state.Status != "active" {
    return fmt.Errorf("game is not active")
  }

  state.Scores[req.PlayerID] += req.Points
  return a.GetStateManager().Set(ctx, "room", state)
}

func (a *GameRoomActor) GetState(ctx context.Context) (*GameRoomState, error) {
  var state GameRoomState
  if err := a.GetStateManager().Get(ctx, "room", &state); err != nil {
    return nil, fmt.Errorf("room not found")
  }
  return &state, nil
}
```

## Player Actor for Per-Player Stats

```go
type PlayerStats struct {
  PlayerID    string `json:"playerId"`
  TotalGames  int    `json:"totalGames"`
  TotalWins   int    `json:"totalWins"`
  TotalPoints int    `json:"totalPoints"`
}

type PlayerActor struct {
  actor.ServerImplBaseCtx
}

func (a *PlayerActor) Type() string { return "Player" }

func (a *PlayerActor) RecordGameResult(ctx context.Context, req *GameResult) error {
  var stats PlayerStats
  a.GetStateManager().Get(ctx, "stats", &stats)
  stats.TotalGames++
  if req.Won {
    stats.TotalWins++
  }
  stats.TotalPoints += req.Points
  return a.GetStateManager().Set(ctx, "stats", stats)
}
```

## Invoking Game Room Operations

```bash
# Player joins room
curl -X POST http://localhost:3500/v1.0/actors/GameRoom/room-42/method/JoinRoom \
  -H "Content-Type: application/json" \
  -d '{"playerId": "player-007"}'

# Update score
curl -X POST http://localhost:3500/v1.0/actors/GameRoom/room-42/method/UpdateScore \
  -H "Content-Type: application/json" \
  -d '{"playerId": "player-007", "points": 10}'
```

## Using Reminders for Game Timeouts

```go
// RegisterTimeout registers a game timeout reminder using the Dapr client.
func (a *GameRoomActor) RegisterTimeout(ctx context.Context) error {
  client, err := dapr.NewClient()
  if err != nil {
    return err
  }
  defer client.Close()
  return client.RegisterActorReminder(ctx, &dapr.RegisterActorReminderRequest{
    ActorType: "GameRoom",
    ActorID:   a.ID(),
    Name:      "game-timeout",
    DueTime:   "10m",
  })
}

// ReminderCall implements actor.ReminderCallee to handle reminder callbacks.
func (a *GameRoomActor) ReminderCall(reminderName string, state []byte, dueTime string, period string) {
  if reminderName == "game-timeout" {
    a.EndGame(context.Background())
  }
}
```

## Summary

Dapr actors provide a clean per-entity state model for game development, with automatic serialization of concurrent updates to the same game room or player. Actor-per-room isolation prevents one game's state from affecting another, and actor reminders handle game timeouts without external scheduler infrastructure. This architecture scales horizontally as the number of active game rooms grows.
