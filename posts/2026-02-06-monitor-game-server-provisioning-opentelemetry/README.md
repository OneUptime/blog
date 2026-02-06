# How to Monitor Dedicated Game Server Provisioning Latency (Agones, GameLift) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gaming, Agones, GameLift, Server Provisioning

Description: Monitor game server provisioning latency on platforms like Agones and GameLift using OpenTelemetry for faster match starts.

When a match is ready, players are waiting. Every second between "match found" and "connecting to server" is a second where players are staring at a loading screen, and some of them will give up. Dedicated game server provisioning, whether through Agones on Kubernetes or AWS GameLift, introduces real latency that you need to measure and optimize.

This post shows how to instrument the provisioning pipeline with OpenTelemetry to track where time is being spent.

## The Provisioning Timeline

A typical provisioning flow involves these steps:

1. Matchmaker requests a game server allocation
2. The orchestrator (Agones or GameLift) finds or creates a server
3. The server binary boots and initializes
4. The server loads the map and game mode configuration
5. The server reports "ready" to the orchestrator
6. Connection details are sent back to the matchmaker
7. Players receive the server address and connect

Each step adds latency. Without instrumentation, you only know the total time.

## Instrumenting Agones Allocation with Go

If you are using Agones on Kubernetes, here is how to trace the allocation flow:

```go
package provisioning

import (
    "context"
    "time"

    agonesv1 "agones.dev/agones/pkg/apis/allocation/v1"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/trace"
)

var (
    tracer = otel.Tracer("game-server-provisioning")
    meter  = otel.Meter("game-server-provisioning")

    provisionLatency, _ = meter.Float64Histogram(
        "game.provision.total_latency_ms",
        metric.WithUnit("ms"),
        metric.WithDescription("Total time from allocation request to server ready"),
    )

    allocationOutcome, _ = meter.Int64Counter(
        "game.provision.outcomes",
        metric.WithDescription("Allocation outcomes by result type"),
    )
)

func AllocateGameServer(ctx context.Context, req AllocationRequest) (*ServerInfo, error) {
    ctx, span := tracer.Start(ctx, "provision.allocate_server",
        trace.WithAttributes(
            attribute.String("game.mode", req.GameMode),
            attribute.String("region", req.Region),
            attribute.Int("required_players", req.PlayerCount),
        ),
    )
    defer span.End()

    start := time.Now()

    // Step 1: Request allocation from Agones
    allocation, err := requestAgonesAllocation(ctx, req)
    if err != nil {
        allocationOutcome.Add(ctx, 1, metric.WithAttributes(
            attribute.String("outcome", "allocation_failed"),
            attribute.String("region", req.Region),
        ))
        return nil, err
    }

    // Step 2: Wait for the server to become ready
    serverInfo, err := waitForServerReady(ctx, allocation)
    if err != nil {
        allocationOutcome.Add(ctx, 1, metric.WithAttributes(
            attribute.String("outcome", "ready_timeout"),
            attribute.String("region", req.Region),
        ))
        return nil, err
    }

    totalMs := float64(time.Since(start).Milliseconds())
    provisionLatency.Record(ctx, totalMs, metric.WithAttributes(
        attribute.String("region", req.Region),
        attribute.String("game.mode", req.GameMode),
    ))

    allocationOutcome.Add(ctx, 1, metric.WithAttributes(
        attribute.String("outcome", "success"),
        attribute.String("region", req.Region),
    ))

    span.SetAttribute("provision.total_ms", totalMs)
    span.SetAttribute("server.address", serverInfo.Address)
    span.SetAttribute("server.port", int64(serverInfo.Port))

    return serverInfo, nil
}
```

## Tracing the Agones Allocation Steps

Break down the Agones allocation into its component parts:

```go
func requestAgonesAllocation(ctx context.Context, req AllocationRequest) (*agonesv1.GameServerAllocation, error) {
    ctx, span := tracer.Start(ctx, "provision.agones_allocate")
    defer span.End()

    // Build the allocation request
    alloc := &agonesv1.GameServerAllocation{
        Spec: agonesv1.GameServerAllocationSpec{
            Required: agonesv1.GameServerSelector{
                MatchLabels: map[string]string{
                    "game-mode": req.GameMode,
                    "region":    req.Region,
                },
            },
        },
    }

    result, err := agonesClient.GameServerAllocations(namespace).Create(ctx, alloc)
    if err != nil {
        span.SetAttribute("agones.error", err.Error())
        return nil, err
    }

    span.SetAttributes(
        attribute.String("agones.state", string(result.Status.State)),
        attribute.String("agones.server_name", result.Status.GameServerName),
        attribute.String("agones.node_name", result.Status.NodeName),
    )

    return result, nil
}

func waitForServerReady(ctx context.Context, allocation *agonesv1.GameServerAllocation) (*ServerInfo, error) {
    ctx, span := tracer.Start(ctx, "provision.wait_for_ready")
    defer span.End()

    serverName := allocation.Status.GameServerName
    pollStart := time.Now()
    pollCount := 0

    for {
        pollCount++
        gs, err := agonesClient.GameServers(namespace).Get(ctx, serverName)
        if err != nil {
            return nil, err
        }

        if gs.Status.State == "Ready" {
            span.SetAttributes(
                attribute.Int("provision.poll_count", pollCount),
                attribute.Float64("provision.wait_ms",
                    float64(time.Since(pollStart).Milliseconds())),
            )
            return &ServerInfo{
                Address: gs.Status.Address,
                Port:    int(gs.Status.Ports[0].Port),
                Name:    serverName,
            }, nil
        }

        // Log each phase transition as a span event
        span.AddEvent("server_state_poll", trace.WithAttributes(
            attribute.String("state", string(gs.Status.State)),
        ))

        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        case <-time.After(500 * time.Millisecond):
            // Poll again
        }
    }
}
```

## Instrumenting GameLift Allocation

For AWS GameLift, the pattern is similar but uses the GameLift API:

```python
import boto3
from opentelemetry import trace

tracer = trace.get_tracer("gamelift-provisioning")
gamelift = boto3.client('gamelift')

def allocate_gamelift_session(game_mode, region, max_players):
    with tracer.start_as_current_span("provision.gamelift_create_session") as span:
        span.set_attributes({
            "game.mode": game_mode,
            "region": region,
            "max_players": max_players,
        })

        # Create a game session
        response = gamelift.create_game_session(
            FleetId=get_fleet_id(region),
            MaximumPlayerSessionCount=max_players,
            GameProperties=[
                {"Key": "gameMode", "Value": game_mode},
            ],
        )

        session = response['GameSession']
        span.set_attributes({
            "gamelift.session_id": session['GameSessionId'],
            "gamelift.status": session['Status'],
            "gamelift.ip": session.get('IpAddress', ''),
            "gamelift.port": session.get('Port', 0),
        })

        # Wait for the session to become ACTIVE
        with tracer.start_as_current_span("provision.gamelift_wait_active") as wait_span:
            while session['Status'] != 'ACTIVE':
                import time
                time.sleep(1)
                desc = gamelift.describe_game_sessions(
                    GameSessionId=session['GameSessionId']
                )
                session = desc['GameSessions'][0]
                wait_span.add_event("poll", attributes={
                    "status": session['Status']
                })

            wait_span.set_attribute("gamelift.final_status", session['Status'])

        return session
```

## Key Metrics to Track

- **Allocation latency P50/P95/P99** by region and game mode. This directly affects player wait times.
- **Allocation failure rate**. When allocations fail, players cannot play.
- **Time from allocation request to server ready**. This includes boot time, map loading, and health check.
- **Warm pool hit rate**. If you maintain pre-warmed servers, track how often allocations hit the warm pool versus cold-starting.

## Optimizing Based on Data

Once you have provisioning traces, you can identify bottlenecks:

- If Agones allocation is fast but server readiness takes long, focus on reducing server boot time or pre-warming more instances.
- If allocation itself is slow, you may need more capacity in the ready pool.
- If specific regions have higher latency, consider adjusting fleet sizes regionally.

## Conclusion

Provisioning latency is dead time for players. They are excited about a match and then forced to wait while infrastructure spins up. By tracing every step of the provisioning pipeline with OpenTelemetry, you can see exactly where the time goes and focus your optimization efforts on the biggest bottlenecks. Whether you use Agones or GameLift, the pattern is the same: wrap each step in a span, record the timing, and set alerts on the thresholds that matter for player experience.
