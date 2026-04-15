# How to Use Actors for Aggregation Patterns in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Aggregation, Event Sourcing, Analytics

Description: Implement real-time aggregation patterns using Dapr actors to accumulate counters, compute running statistics, and build event-driven analytics pipelines.

---

Aggregation patterns - computing sums, counts, averages, and histograms over streaming event data - are traditionally handled with stream processors like Kafka Streams or Flink. Dapr actors provide a lighter-weight alternative for per-entity aggregations with durable state.

## Use Cases for Actor-Based Aggregation

- Page view counters per URL
- Revenue totals per merchant per day
- Error rate per service per minute
- API latency histograms per endpoint

## Counter Aggregator Actor

```go
package main

import (
  "context"
  "time"
  "github.com/dapr/go-sdk/actor"
)

type CounterState struct {
  Key      string    `json:"key"`
  Count    int64     `json:"count"`
  Sum      float64   `json:"sum"`
  Min      float64   `json:"min"`
  Max      float64   `json:"max"`
  LastHit  time.Time `json:"lastHit"`
  Window   string    `json:"window"` // e.g., "2026-03-31T14:00"
}

type AggregatorActor struct {
  actor.ServerImplBaseCtx
}

func (a *AggregatorActor) Type() string { return "Aggregator" }

func (a *AggregatorActor) Record(ctx context.Context, req *RecordRequest) error {
  var state CounterState
  if err := a.GetStateManager().Get(ctx, "agg", &state); err != nil {
    state = CounterState{
      Min:    req.Value,
      Max:    req.Value,
      Window: req.Window,
    }
  }

  state.Count++
  state.Sum += req.Value
  state.LastHit = time.Now().UTC()

  if req.Value < state.Min {
    state.Min = req.Value
  }
  if req.Value > state.Max {
    state.Max = req.Value
  }

  return a.GetStateManager().Set(ctx, "agg", state)
}

func (a *AggregatorActor) GetStats(ctx context.Context) (*StatsResponse, error) {
  var state CounterState
  if err := a.GetStateManager().Get(ctx, "agg", &state); err != nil {
    return &StatsResponse{Count: 0}, nil
  }

  avg := 0.0
  if state.Count > 0 {
    avg = state.Sum / float64(state.Count)
  }

  return &StatsResponse{
    Count:   state.Count,
    Sum:     state.Sum,
    Average: avg,
    Min:     state.Min,
    Max:     state.Max,
    Window:  state.Window,
  }, nil
}

type RecordRequest struct {
  Value  float64 `json:"value"`
  Window string  `json:"window"`
}

type StatsResponse struct {
  Count   int64   `json:"count"`
  Sum     float64 `json:"sum"`
  Average float64 `json:"average"`
  Min     float64 `json:"min"`
  Max     float64 `json:"max"`
  Window  string  `json:"window"`
}
```

## Routing Events to the Right Aggregator

Use a time-bucketed actor ID to aggregate events by time window:

```go
func recordLatency(ctx context.Context, client dapr.Client, endpoint string, latencyMs float64) error {
  window := time.Now().UTC().Format("2006-01-02T15:04") // minute-level window
  actorID := fmt.Sprintf("%s::%s", endpoint, window)

  req := RecordRequest{Value: latencyMs, Window: window}
  _, err := client.InvokeActor(ctx, &dapr.InvokeActorRequest{
    ActorType: "Aggregator",
    ActorID:   actorID,
    Method:    "Record",
    Data:      mustMarshal(req),
  })
  return err
}
```

## Querying an Aggregation Window

```bash
curl -X POST \
  "http://localhost:3500/v1.0/actors/Aggregator/%2Fapi%2Forders%3A%3A2026-03-31T14%3A00/method/GetStats"
# {"count": 1250, "sum": 63750.5, "average": 51.0, "min": 12.3, "max": 890.4, "window": "2026-03-31T14:00"}
```

## Auto-Cleanup via Idle Timeout

Set a short idle timeout so old window actors are garbage collected automatically:

```json
{
  "entities": ["Aggregator"],
  "actorIdleTimeout": "2h",
  "actorScanInterval": "15m"
}
```

## Summary

Dapr actors enable per-entity aggregation patterns that are simpler to implement than full stream processing pipelines. By keying actors on entity ID plus time window, you can compute per-minute or per-hour statistics with automatic state persistence. Actor idle timeout provides natural window cleanup, avoiding stale state accumulation without explicit expiry logic.
