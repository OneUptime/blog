# How to Implement Event Sourcing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Sourcing, State, Pub/Sub, Pattern

Description: Learn how to implement event sourcing using Dapr's state and pub/sub building blocks to store and replay domain events for full audit history.

---

## Overview

Event sourcing stores all state changes as an immutable sequence of events rather than current state. To reconstruct the current state, you replay all events. Dapr's state store provides the event log and pub/sub delivers events to projections.

## Core Concepts

- **Event Store**: Append-only log of domain events
- **Aggregate**: Rebuilds current state by replaying events
- **Projection**: Materialized view built from events

## Defining Domain Events

```go
package events

type EventType string

const (
    AccountOpened  EventType = "account.opened"
    MoneyDeposited EventType = "money.deposited"
    MoneyWithdrawn EventType = "money.withdrawn"
    AccountClosed  EventType = "account.closed"
)

type Event struct {
    ID          string          `json:"id"`
    AggregateID string          `json:"aggregateId"`
    Type        EventType       `json:"type"`
    Version     int             `json:"version"`
    OccurredAt  time.Time       `json:"occurredAt"`
    Data        json.RawMessage `json:"data"`
}
```

## Event Store Implementation with Dapr

```go
type EventStore struct {
    client dapr.Client
    store  string
}

func (es *EventStore) AppendEvents(ctx context.Context, aggregateID string, events []Event) error {
    // Get current event count for this aggregate
    countItem, _ := es.client.GetState(ctx, es.store, "count:"+aggregateID, nil)
    var count int
    if countItem.Value != nil {
        json.Unmarshal(countItem.Value, &count)
    }

    ops := make([]*dapr.StateOperation, 0, len(events)+1)
    for _, ev := range events {
        ev.Version = count + 1
        count++
        data, _ := json.Marshal(ev)
        ops = append(ops, &dapr.StateOperation{
            Type: dapr.StateOperationTypeUpsert,
            Item: &dapr.SetStateItem{
                Key:   fmt.Sprintf("event:%s:%d", aggregateID, ev.Version),
                Value: data,
            },
        })
    }

    // Update event count
    countData, _ := json.Marshal(count)
    ops = append(ops, &dapr.StateOperation{
        Type: dapr.StateOperationTypeUpsert,
        Item: &dapr.SetStateItem{
            Key:   "count:" + aggregateID,
            Value: countData,
        },
    })

    return es.client.ExecuteStateTransaction(ctx, es.store, nil, ops)
}

func (es *EventStore) LoadEvents(ctx context.Context, aggregateID string) ([]Event, error) {
    countItem, _ := es.client.GetState(ctx, es.store, "count:"+aggregateID, nil)
    var count int
    json.Unmarshal(countItem.Value, &count)

    events := make([]Event, 0, count)
    for i := 1; i <= count; i++ {
        item, err := es.client.GetState(ctx, es.store, fmt.Sprintf("event:%s:%d", aggregateID, i), nil)
        if err != nil || item.Value == nil {
            continue
        }
        var ev Event
        json.Unmarshal(item.Value, &ev)
        events = append(events, ev)
    }
    return events, nil
}
```

## Account Aggregate

```go
type Account struct {
    ID      string
    Balance float64
    Status  string
    Version int
}

func (a *Account) Apply(event Event) {
    switch event.Type {
    case events.AccountOpened:
        var data struct{ InitialBalance float64 }
        json.Unmarshal(event.Data, &data)
        a.ID = event.AggregateID
        a.Balance = data.InitialBalance
        a.Status = "open"
    case events.MoneyDeposited:
        var data struct{ Amount float64 }
        json.Unmarshal(event.Data, &data)
        a.Balance += data.Amount
    case events.MoneyWithdrawn:
        var data struct{ Amount float64 }
        json.Unmarshal(event.Data, &data)
        a.Balance -= data.Amount
    case events.AccountClosed:
        a.Status = "closed"
    }
    a.Version = event.Version
}

func Rehydrate(evts []Event) *Account {
    acc := &Account{}
    for _, ev := range evts {
        acc.Apply(ev)
    }
    return acc
}
```

## Publishing Events After Append

```go
func (svc *AccountService) Deposit(ctx context.Context, accountID string, amount float64) error {
    data, _ := json.Marshal(map[string]float64{"amount": amount})
    ev := Event{
        ID:          uuid.New().String(),
        AggregateID: accountID,
        Type:        events.MoneyDeposited,
        OccurredAt:  time.Now(),
        Data:        data,
    }

    if err := svc.store.AppendEvents(ctx, accountID, []Event{ev}); err != nil {
        return err
    }

    // Publish for projections
    return svc.dapr.PublishEvent(ctx, "pubsub", "account-events", ev)
}
```

## Summary

Event sourcing with Dapr stores all state mutations as immutable events in the state store and publishes them via pub/sub for projections. Aggregates rehydrate by replaying events, giving you a complete audit trail and the ability to rebuild any projection at any point in time. Dapr's transactional state operations ensure atomic event appends.
