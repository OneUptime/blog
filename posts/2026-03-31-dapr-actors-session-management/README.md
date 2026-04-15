# How to Use Actors for Session Management in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Session, Authentication, Stateful

Description: Implement user session management using Dapr actors to store session tokens, expiry, and user context with automatic cleanup via idle timeout.

---

Dapr actors are well-suited for session management because each session maps naturally to a unique actor instance. The actor's idle timeout acts as automatic session expiry, and turn-based concurrency prevents race conditions when updating session data.

## Session Actor Design

Use the session token or session ID as the actor ID:

```text
Actor Type: UserSession
Actor ID:   <session_token>
```

## Implementing the Session Actor in Go

```go
package main

import (
  "context"
  "fmt"
  "time"
  "github.com/dapr/go-sdk/actor"
)

type SessionData struct {
  UserID    string    `json:"userId"`
  Email     string    `json:"email"`
  Roles     []string  `json:"roles"`
  CreatedAt time.Time `json:"createdAt"`
  LastSeen  time.Time `json:"lastSeen"`
  ExpiresAt time.Time `json:"expiresAt"`
}

type UserSessionActor struct {
  actor.ServerImplBaseCtx
}

func (a *UserSessionActor) Type() string { return "UserSession" }

func (a *UserSessionActor) CreateSession(ctx context.Context, req *SessionData) error {
  req.CreatedAt = time.Now().UTC()
  req.LastSeen = time.Now().UTC()
  req.ExpiresAt = time.Now().UTC().Add(30 * time.Minute)
  return a.GetStateManager().Set(ctx, "session", req)
}

func (a *UserSessionActor) GetSession(ctx context.Context) (*SessionData, error) {
  var session SessionData
  if err := a.GetStateManager().Get(ctx, "session", &session); err != nil {
    return nil, fmt.Errorf("session not found")
  }
  if time.Now().UTC().After(session.ExpiresAt) {
    a.GetStateManager().Remove(ctx, "session")
    return nil, fmt.Errorf("session expired")
  }
  session.LastSeen = time.Now().UTC()
  a.GetStateManager().Set(ctx, "session", session)
  return &session, nil
}

func (a *UserSessionActor) InvalidateSession(ctx context.Context) error {
  return a.GetStateManager().Remove(ctx, "session")
}
```

## Creating a Session via HTTP

```bash
curl -X POST http://localhost:3500/v1.0/actors/UserSession/sess-abc123/method/CreateSession \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "usr-001",
    "email": "alice@example.com",
    "roles": ["user", "editor"]
  }'
```

## Validating a Session in Middleware

```go
func SessionMiddleware(daprPort string) func(http.Handler) http.Handler {
  return func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      token := r.Header.Get("Authorization")
      if token == "" {
        http.Error(w, "Unauthorized", 401)
        return
      }

      resp, err := http.Post(
        fmt.Sprintf("http://localhost:%s/v1.0/actors/UserSession/%s/method/GetSession", daprPort, token),
        "application/json", nil,
      )
      if err != nil || resp.StatusCode != 200 {
        http.Error(w, "Invalid session", 401)
        return
      }

      next.ServeHTTP(w, r)
    })
  }
}
```

## Auto-Expiry via Idle Timeout

Configure the actor idle timeout to match your session TTL:

```json
{
  "entities": ["UserSession"],
  "actorIdleTimeout": "30m",
  "actorScanInterval": "60s"
}
```

When a session actor is idle for 30 minutes, Dapr deactivates it from memory. Note that deactivation does not remove persisted state — if a subsequent call arrives, Dapr reactivates the actor and restores its state from the state store. Session expiry is enforced by the `ExpiresAt` timestamp check in `GetSession`, which returns an error and removes state when the session has expired. The idle timeout serves as a resource optimization, freeing memory for inactive sessions.

## Invalidating Sessions Explicitly

```bash
curl -X POST http://localhost:3500/v1.0/actors/UserSession/sess-abc123/method/InvalidateSession \
  -H "Content-Type: application/json"
```

## Summary

Dapr actors provide a natural session management solution where each session token maps to a unique actor instance. Idle timeout handles automatic session expiry without requiring background cleanup jobs, and turn-based concurrency prevents concurrent update races. This pattern scales horizontally across multiple app instances through Dapr's placement service without any additional session replication logic.
