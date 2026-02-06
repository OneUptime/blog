# How to Monitor gRPC Channel States and Connection Pool Metrics with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Channel States, Connection Pool Metrics

Description: Monitor gRPC channel connectivity states and connection pool metrics with OpenTelemetry to detect connectivity issues early.

gRPC channels manage connections to backend servers. A channel can be in one of five connectivity states: IDLE, CONNECTING, READY, TRANSIENT_FAILURE, or SHUTDOWN. Monitoring these state transitions tells you about the health of your connections before RPC failures start happening. Combined with connection pool metrics, you get a complete picture of your gRPC networking layer.

## The Five Channel States

- **IDLE**: No RPC activity, no connection attempts
- **CONNECTING**: Actively trying to establish a connection
- **READY**: Connection established, RPCs can be sent
- **TRANSIENT_FAILURE**: Connection failed, will retry after backoff
- **SHUTDOWN**: Channel has been closed permanently

## Monitoring Channel States in Go

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "google.golang.org/grpc"
    "google.golang.org/grpc/connectivity"
)

var meter = otel.Meter("grpc.channel.monitoring")

var (
    stateTransitions metric.Int64Counter
    currentState     metric.Int64ObservableGauge
    timeInState      metric.Float64Histogram
    activeConns      metric.Int64UpDownCounter
)

func initChannelMetrics() {
    var err error

    stateTransitions, err = meter.Int64Counter(
        "grpc.client.channel.state_transitions",
        metric.WithDescription("Number of channel state transitions"),
    )
    if err != nil {
        panic(err)
    }

    timeInState, err = meter.Float64Histogram(
        "grpc.client.channel.state_duration",
        metric.WithDescription("Duration spent in each channel state"),
        metric.WithUnit("s"),
    )
    if err != nil {
        panic(err)
    }

    activeConns, err = meter.Int64UpDownCounter(
        "grpc.client.connections.active",
        metric.WithDescription("Number of active gRPC connections"),
    )
    if err != nil {
        panic(err)
    }
}

// ChannelMonitor watches a gRPC channel and reports state changes
type ChannelMonitor struct {
    conn        *grpc.ClientConn
    target      string
    lastState   connectivity.State
    lastChanged time.Time
}

func NewChannelMonitor(conn *grpc.ClientConn, target string) *ChannelMonitor {
    return &ChannelMonitor{
        conn:        conn,
        target:      target,
        lastState:   conn.GetState(),
        lastChanged: time.Now(),
    }
}

func (cm *ChannelMonitor) Watch(ctx context.Context) {
    state := cm.conn.GetState()

    for {
        // WaitForStateChange blocks until the state changes from the given state
        changed := cm.conn.WaitForStateChange(ctx, state)
        if !changed {
            // Context was cancelled
            return
        }

        newState := cm.conn.GetState()
        now := time.Now()

        // Record how long we were in the previous state
        duration := now.Sub(cm.lastChanged).Seconds()
        timeInState.Record(ctx, duration, metric.WithAttributes(
            attribute.String("grpc.channel.target", cm.target),
            attribute.String("grpc.channel.state", state.String()),
        ))

        // Record the transition
        stateTransitions.Add(ctx, 1, metric.WithAttributes(
            attribute.String("grpc.channel.target", cm.target),
            attribute.String("grpc.channel.from_state", state.String()),
            attribute.String("grpc.channel.to_state", newState.String()),
        ))

        log.Printf("Channel %s: %s -> %s (was in %s for %.2fs)",
            cm.target, state, newState, state, duration)

        // Update tracking for connection count
        if newState == connectivity.Ready && state != connectivity.Ready {
            activeConns.Add(ctx, 1, metric.WithAttributes(
                attribute.String("grpc.channel.target", cm.target),
            ))
        } else if state == connectivity.Ready && newState != connectivity.Ready {
            activeConns.Add(ctx, -1, metric.WithAttributes(
                attribute.String("grpc.channel.target", cm.target),
            ))
        }

        cm.lastState = newState
        cm.lastChanged = now
        state = newState
    }
}
```

## Using the Channel Monitor

```go
func main() {
    initChannelMetrics()

    conn, err := grpc.NewClient("my-service.prod:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // Start monitoring in a goroutine
    monitor := NewChannelMonitor(conn, "my-service.prod:50051")
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    go monitor.Watch(ctx)

    // Use the connection for RPCs as normal
    client := pb.NewMyServiceClient(conn)
    // ...
}
```

## Monitoring Multiple Channels

In a microservice architecture, a single service often connects to several backends:

```go
type ConnectionPoolMonitor struct {
    monitors []*ChannelMonitor
}

func NewConnectionPoolMonitor() *ConnectionPoolMonitor {
    return &ConnectionPoolMonitor{}
}

func (pm *ConnectionPoolMonitor) AddChannel(conn *grpc.ClientConn, target string) {
    monitor := NewChannelMonitor(conn, target)
    pm.monitors = append(pm.monitors, monitor)

    // Start watching in background
    go monitor.Watch(context.Background())
}

func (pm *ConnectionPoolMonitor) RegisterGauges() {
    // Register an observable gauge that reports all channel states
    meter.Int64ObservableGauge(
        "grpc.client.channel.current_state",
        metric.WithDescription("Current state of each gRPC channel"),
        metric.WithInt64Callback(func(ctx context.Context, obs metric.Int64Observer) error {
            for _, m := range pm.monitors {
                state := m.conn.GetState()
                var stateValue int64
                switch state {
                case connectivity.Idle:
                    stateValue = 0
                case connectivity.Connecting:
                    stateValue = 1
                case connectivity.Ready:
                    stateValue = 2
                case connectivity.TransientFailure:
                    stateValue = 3
                case connectivity.Shutdown:
                    stateValue = 4
                }
                obs.Observe(stateValue, metric.WithAttributes(
                    attribute.String("grpc.channel.target", m.target),
                    attribute.String("grpc.channel.state_name", state.String()),
                ))
            }
            return nil
        }),
    )
}
```

## Python Channel Monitoring

```python
import grpc
import threading
import time
from opentelemetry import metrics

meter = metrics.get_meter("grpc.channel.monitoring")

state_transitions = meter.create_counter(
    "grpc.client.channel.state_transitions",
    description="Channel state transitions",
)

time_in_state = meter.create_histogram(
    "grpc.client.channel.state_duration",
    description="Duration in each state",
    unit="s",
)

def monitor_channel(channel, target_name):
    """Watch a gRPC channel for state changes."""
    last_state = channel._channel.check_connectivity_state(True)
    last_changed = time.time()

    def on_state_change(state):
        nonlocal last_state, last_changed
        now = time.time()
        duration = now - last_changed

        time_in_state.record(duration, {
            "grpc.channel.target": target_name,
            "grpc.channel.state": str(last_state),
        })

        state_transitions.add(1, {
            "grpc.channel.target": target_name,
            "grpc.channel.from_state": str(last_state),
            "grpc.channel.to_state": str(state),
        })

        last_state = state
        last_changed = now

        # Continue watching
        channel.subscribe(on_state_change, try_to_connect=True)

    channel.subscribe(on_state_change, try_to_connect=True)
```

## Alerting on Connection Issues

```yaml
groups:
  - name: grpc_channels
    rules:
      - alert: GrpcChannelTransientFailure
        expr: grpc_client_channel_current_state == 3
        for: 30s
        labels:
          severity: warning
        annotations:
          summary: "gRPC channel to {{ $labels.grpc_channel_target }} in TRANSIENT_FAILURE"

      - alert: GrpcChannelFlapping
        expr: rate(grpc_client_channel_state_transitions_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "gRPC channel {{ $labels.grpc_channel_target }} is flapping"
```

Monitoring channel states catches connectivity problems at the earliest possible point. You will know about a failing connection before any RPC error reaches your application code, giving you time to investigate and respond proactively.
