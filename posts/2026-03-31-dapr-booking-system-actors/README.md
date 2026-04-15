# How to Build a Booking System with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Booking, Concurrency, State

Description: Learn how to build a booking system using Dapr Actors to manage resource availability with safe concurrent access and automatic state persistence.

---

## Overview

A booking system must prevent double-bookings while handling high concurrent demand. Dapr Actors are a natural fit: each bookable resource (seat, room, appointment slot) becomes an actor instance that serializes access, eliminating the need for external distributed locks.

## Actor Model for Bookings

Each resource is modeled as an actor. Actor turns execute sequentially, so concurrent booking requests for the same resource are automatically serialized without explicit locking.

## Resource Actor

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    "github.com/dapr/go-sdk/actor"
)

type BookingStatus string

const (
    StatusAvailable BookingStatus = "available"
    StatusHeld      BookingStatus = "held"
    StatusBooked    BookingStatus = "booked"
    StatusCancelled BookingStatus = "cancelled"
)

type Booking struct {
    BookingID  string        `json:"bookingId"`
    ResourceID string        `json:"resourceId"`
    UserID     string        `json:"userId"`
    StartTime  time.Time     `json:"startTime"`
    EndTime    time.Time     `json:"endTime"`
    Status     BookingStatus `json:"status"`
    HeldUntil  time.Time     `json:"heldUntil"`
}

type ResourceState struct {
    ResourceID string    `json:"resourceId"`
    Bookings   []Booking `json:"bookings"`
}

type ResourceActor struct {
    actor.ServerImplBaseCtx
}

func (a *ResourceActor) Type() string {
    return "Resource"
}
```

## Hold and Confirm Booking

```go
type HoldRequest struct {
    BookingID string    `json:"bookingId"`
    UserID    string    `json:"userId"`
    StartTime time.Time `json:"startTime"`
    EndTime   time.Time `json:"endTime"`
}

func (a *ResourceActor) Hold(ctx context.Context, req *HoldRequest) (*Booking, error) {
    var state ResourceState
    a.GetStateManager().Get(ctx, "state", &state)

    // Check for conflicts (actor ensures serialized access - no race conditions)
    for _, existing := range state.Bookings {
        if existing.Status == StatusBooked || existing.Status == StatusHeld {
            if timesOverlap(req.StartTime, req.EndTime, existing.StartTime, existing.EndTime) {
                return nil, fmt.Errorf("time slot unavailable")
            }
        }
    }

    booking := Booking{
        BookingID:  req.BookingID,
        ResourceID: a.ID(),
        UserID:     req.UserID,
        StartTime:  req.StartTime,
        EndTime:    req.EndTime,
        Status:     StatusHeld,
        HeldUntil:  time.Now().Add(10 * time.Minute),
    }

    state.Bookings = append(state.Bookings, booking)
    a.GetStateManager().Set(ctx, "state", state)

    // Register timer to release hold if not confirmed
    reqData, _ := json.Marshal(map[string]string{})
    daprClient.RegisterActorTimer(ctx, &dapr.RegisterActorTimerRequest{
        ActorType: "Resource",
        ActorID:   a.ID(),
        Name:      "releaseHold-" + booking.BookingID,
        DueTime:   "11m",
        Period:    "",
        Callback:  "ReleaseExpiredHolds",
        Data:      reqData,
    })

    return &booking, nil
}

func (a *ResourceActor) Confirm(ctx context.Context, req *struct{ BookingID string }) error {
    var state ResourceState
    a.GetStateManager().Get(ctx, "state", &state)

    for i, b := range state.Bookings {
        if b.BookingID == req.BookingID && b.Status == StatusHeld {
            if time.Now().After(b.HeldUntil) {
                return fmt.Errorf("hold expired")
            }
            state.Bookings[i].Status = StatusBooked
            return a.GetStateManager().Set(ctx, "state", state)
        }
    }
    return fmt.Errorf("booking not found or not in held state")
}

func (a *ResourceActor) Cancel(ctx context.Context, req *struct{ BookingID string }) error {
    var state ResourceState
    a.GetStateManager().Get(ctx, "state", &state)

    for i, b := range state.Bookings {
        if b.BookingID == req.BookingID {
            state.Bookings[i].Status = StatusCancelled
            return a.GetStateManager().Set(ctx, "state", state)
        }
    }
    return fmt.Errorf("booking not found")
}

func (a *ResourceActor) ReleaseExpiredHolds(ctx context.Context) error {
    var state ResourceState
    a.GetStateManager().Get(ctx, "state", &state)

    changed := false
    for i, b := range state.Bookings {
        if b.Status == StatusHeld && time.Now().After(b.HeldUntil) {
            state.Bookings[i].Status = StatusAvailable
            changed = true
        }
    }
    if changed {
        return a.GetStateManager().Set(ctx, "state", state)
    }
    return nil
}
```

## Booking API

```go
func handleHoldBooking(w http.ResponseWriter, r *http.Request) {
    var req HoldRequest
    json.NewDecoder(r.Body).Decode(&req)
    req.BookingID = uuid.New().String()

    reqData, _ := json.Marshal(req)
    resp, err := daprClient.InvokeActor(
        r.Context(),
        &dapr.InvokeActorRequest{
            ActorType: "Resource",
            ActorID:   req.StartTime.Format("2006-01-02") + "-" + r.PathValue("resourceId"),
            Method:    "Hold",
            Data:      reqData,
        },
    )
    if err != nil {
        http.Error(w, err.Error(), http.StatusConflict)
        return
    }

    w.WriteHeader(http.StatusCreated)
    w.Write(resp.Data)
}
```

## Time Overlap Check

```go
func timesOverlap(start1, end1, start2, end2 time.Time) bool {
    return start1.Before(end2) && start2.Before(end1)
}
```

## Summary

Dapr Actors solve the double-booking problem elegantly: each resource actor serializes all booking requests, eliminating race conditions without explicit distributed locks. Hold timers automatically release unconfirmed bookings, and actor state persistence ensures bookings survive service restarts. This pattern scales to millions of resources since each actor instance is independent and activated on demand.
