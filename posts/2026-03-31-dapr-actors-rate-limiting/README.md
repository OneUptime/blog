# How to Use Actors for Rate Limiting in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Rate Limiting, Token Bucket, Sliding Window

Description: Implement distributed per-key rate limiting using Dapr actors with token bucket and sliding window algorithms, without external Redis Lua scripts.

---

Rate limiting is a cross-cutting concern in distributed APIs. Dapr actors provide a clean, distributed solution for per-key rate limiting without shared mutable state or external Lua scripts.

## Why Actors for Rate Limiting?

Traditional rate limiting with Redis requires atomic Lua scripts or INCR/EXPIRE patterns. With Dapr actors:
- Each rate limit key (user ID, API key, IP) maps to one actor instance
- Turn-based concurrency eliminates race conditions automatically
- State is persisted and survives restarts
- No external lock management required

## Token Bucket Rate Limiter Actor

```go
package main

import (
  "context"
  "time"
  "github.com/dapr/go-sdk/actor"
)

type TokenBucketState struct {
  Tokens     float64   `json:"tokens"`
  LastRefill time.Time `json:"lastRefill"`
  Capacity   float64   `json:"capacity"`
  Rate       float64   `json:"rate"` // tokens per second
}

type RateLimiterActor struct {
  actor.ServerImplBase
}

func (a *RateLimiterActor) Type() string { return "RateLimiter" }

func (a *RateLimiterActor) Allow(ctx context.Context, req *AllowRequest) (*AllowResponse, error) {
  var state TokenBucketState
  if err := a.GetStateManager().Get(ctx, "bucket", &state); err != nil {
    // Initialize bucket for new keys
    state = TokenBucketState{
      Tokens:     float64(req.Capacity),
      LastRefill: time.Now().UTC(),
      Capacity:   float64(req.Capacity),
      Rate:       req.Rate,
    }
  }

  // Refill tokens based on elapsed time
  now := time.Now().UTC()
  elapsed := now.Sub(state.LastRefill).Seconds()
  state.Tokens = min(state.Capacity, state.Tokens+(elapsed*state.Rate))
  state.LastRefill = now

  if state.Tokens >= 1 {
    state.Tokens -= 1
    a.GetStateManager().Set(ctx, "bucket", state)
    return &AllowResponse{Allowed: true, RemainingTokens: int(state.Tokens)}, nil
  }

  a.GetStateManager().Set(ctx, "bucket", state)
  return &AllowResponse{Allowed: false, RemainingTokens: 0}, nil
}

type AllowRequest struct {
  Capacity int     `json:"capacity"`
  Rate     float64 `json:"rate"`
}

type AllowResponse struct {
  Allowed         bool `json:"allowed"`
  RemainingTokens int  `json:"remainingTokens"`
}

func min(a, b float64) float64 {
  if a < b {
    return a
  }
  return b
}
```

## Using the Rate Limiter in a Middleware

```go
func RateLimitMiddleware(daprClient dapr.Client, capacity int, rate float64) func(http.Handler) http.Handler {
  return func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      apiKey := r.Header.Get("X-API-Key")
      if apiKey == "" {
        http.Error(w, "Missing API key", 401)
        return
      }

      req := AllowRequest{Capacity: capacity, Rate: rate}
      resp, err := daprClient.InvokeActor(r.Context(), &dapr.InvokeActorRequest{
        ActorType: "RateLimiter",
        ActorID:   apiKey,
        Method:    "Allow",
        Data:      mustMarshal(req),
      })
      if err != nil {
        http.Error(w, "Rate limit check failed", 500)
        return
      }

      var result AllowResponse
      json.Unmarshal(resp.Data, &result)

      w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", result.RemainingTokens))

      if !result.Allowed {
        w.WriteHeader(429)
        json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded"})
        return
      }

      next.ServeHTTP(w, r)
    })
  }
}
```

## Testing the Rate Limiter

```bash
# First request - should be allowed
curl -X POST http://localhost:3500/v1.0/actors/RateLimiter/api-key-001/method/Allow \
  -d '{"capacity": 10, "rate": 1.0}'
# {"allowed": true, "remainingTokens": 9}

# After 10 rapid requests - should be blocked
curl -X POST http://localhost:3500/v1.0/actors/RateLimiter/api-key-001/method/Allow \
  -d '{"capacity": 10, "rate": 1.0}'
# {"allowed": false, "remainingTokens": 0}
```

## Summary

Dapr actors provide an elegant distributed rate limiting solution where each API key or user maps to an independent actor instance. The token bucket algorithm combined with turn-based concurrency ensures accurate rate limiting without Redis Lua scripts or distributed locking. Actor idle timeout automatically deactivates inactive actor instances from memory, freeing resources while preserving their persisted state in the state store for future requests.
