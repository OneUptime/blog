# How to Configure Actor Idle Timeout and Scan Interval in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Configuration, Memory Management, Virtual Actor, Kubernetes

Description: Learn how to tune Dapr actor idle timeout and scan interval settings to balance memory consumption, activation latency, and throughput in production deployments.

---

Dapr virtual actors are lazily activated when first invoked and deactivated after a period of inactivity. The balance between keeping actors alive in memory (reducing re-activation overhead) and deactivating idle actors (freeing resources) is controlled by two key settings: `actorIdleTimeout` and `actorScanInterval`. Misconfiguring these can cause memory bloat, unnecessary cold-start latency, or excessive garbage collection. This guide covers how to reason about and tune these settings for your workload.

## Understanding Actor Lifecycle

When a method is called on a dormant actor:
1. Dapr's placement service routes the call to the correct host
2. The actor is instantiated and `OnActivateAsync` runs
3. The method executes (state is loaded on-demand via `StateManager` calls)
4. State is saved

When an actor is idle for `actorIdleTimeout`, the scan loop deactivates it:
1. `OnDeactivateAsync` runs (save any final state, release resources)
2. The actor object is garbage collected
3. The placement table entry is retained (the actor's logical identity persists)

```text
actorScanInterval: how often the runtime checks for idle actors (e.g., every 30s)
actorIdleTimeout:  how long an actor can be idle before being deactivated (e.g., 60 minutes)
```

The scan interval should be much smaller than the idle timeout. A scan interval larger than the idle timeout means actors are never actually deactivated on schedule.

## Configuring Timeouts in the Actor Host

```csharp
// Program.cs
using Dapr.Actors.Runtime;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddActors(options =>
{
    // How long an actor can be idle before deactivation
    // Default: 60 minutes
    // Set shorter for actors with large in-memory state
    // Set longer for actors that are expensive to re-activate
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);

    // How often the runtime scans for idle actors
    // Default: 30 seconds
    // Should be significantly less than ActorIdleTimeout
    options.ActorScanInterval = TimeSpan.FromSeconds(30);

    // How long to wait for ongoing calls to finish before deactivating
    // during a rebalance or host shutdown
    // Default: 60 seconds
    options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(30);

    // Whether to drain actors during placement rebalancing
    // Default: true - recommended for production
    options.DrainRebalancedActors = true;

    options.Actors.RegisterActor<OrderActor>();
    options.Actors.RegisterActor<UserSessionActor>();
    options.Actors.RegisterActor<DeviceTwinActor>();
});

var app = builder.Build();
app.MapActorsHandlers();
app.Run();
```

## Hooking into Activation and Deactivation

Use `OnActivateAsync` and `OnDeactivateAsync` to manage resources:

```csharp
// Actors/DeviceTwinActor.cs
using Dapr.Actors.Runtime;

public interface IDeviceTwinActor : IActor
{
    Task UpdateTelemetryAsync(DeviceTelemetry telemetry);
    Task<DeviceState> GetStateAsync();
}

[Actor(TypeName = "DeviceTwin")]
public class DeviceTwinActor : Actor, IDeviceTwinActor
{
    private System.Timers.Timer? _heartbeatTimer;
    private int _activationCount = 0;

    public DeviceTwinActor(ActorHost host) : base(host) { }

    protected override async Task OnActivateAsync()
    {
        _activationCount++;
        Logger.LogInformation(
            "Actor {ActorId} activated (activation #{Count})",
            Id.GetId(), _activationCount);

        // Restore state
        var state = await StateManager.TryGetStateAsync<DeviceState>("state");
        if (!state.HasValue)
        {
            await StateManager.SetStateAsync("state", new DeviceState { IsOnline = false });
        }

        // Start a background heartbeat (short-lived actors might skip this)
        _heartbeatTimer = new System.Timers.Timer(TimeSpan.FromSeconds(10));
        _heartbeatTimer.Elapsed += async (_, _) => await CheckDeviceHeartbeatAsync();
        _heartbeatTimer.Start();
    }

    protected override async Task OnDeactivateAsync()
    {
        Logger.LogInformation("Actor {ActorId} deactivating", Id.GetId());
        
        // Clean up the timer to avoid resource leaks
        _heartbeatTimer?.Stop();
        _heartbeatTimer?.Dispose();
        _heartbeatTimer = null;

        // Save final state before deactivation
        var state = await StateManager.TryGetStateAsync<DeviceState>("state");
        if (state.HasValue)
        {
            var finalState = state.Value with { IsOnline = false };
            await StateManager.SetStateAsync("state", finalState);
        }
    }

    public async Task UpdateTelemetryAsync(DeviceTelemetry telemetry)
    {
        var state = await StateManager.GetOrAddStateAsync("state", new DeviceState());
        state = state with
        {
            LastSeen = DateTime.UtcNow,
            IsOnline = true,
            Temperature = telemetry.Temperature,
            BatteryLevel = telemetry.BatteryLevel
        };
        await StateManager.SetStateAsync("state", state);
    }

    public async Task<DeviceState> GetStateAsync()
    {
        return await StateManager.GetOrAddStateAsync("state", new DeviceState());
    }

    private async Task CheckDeviceHeartbeatAsync()
    {
        var state = await StateManager.TryGetStateAsync<DeviceState>("state");
        if (state.HasValue && state.Value.LastSeen < DateTime.UtcNow.AddMinutes(-5))
        {
            Logger.LogWarning("Device {ActorId} has not reported telemetry for 5+ minutes", Id.GetId());
        }
    }
}

public record DeviceState
{
    public bool IsOnline { get; init; }
    public DateTime? LastSeen { get; init; }
    public double Temperature { get; init; }
    public double BatteryLevel { get; init; }
}

public record DeviceTelemetry(double Temperature, double BatteryLevel);
```

## Choosing the Right Timeout Values

Timeout selection depends on your actor's characteristics:

```text
Scenario: IoT device twins (millions of devices, sparse updates)
- ActorIdleTimeout: 5-10 minutes
- ActorScanInterval: 30 seconds
- Reason: Most devices are inactive; keep memory low

Scenario: User session actors (thousands of concurrent users)
- ActorIdleTimeout: 30-60 minutes (match session timeout)
- ActorScanInterval: 1 minute
- Reason: Active sessions should stay hot; idle sessions freed

Scenario: Order processing actors (minutes-long workflows)
- ActorIdleTimeout: 120 minutes
- ActorScanInterval: 30 seconds
- Reason: Orders may be paused awaiting payment; avoid re-activating frequently

Scenario: Game character actors (highly active, sub-second interactions)
- ActorIdleTimeout: 10 minutes
- ActorScanInterval: 30 seconds
- Reason: Active characters need to be in memory; idle characters can be freed
```

## Estimating Memory Requirements

Use the following formula to estimate peak memory usage:

```python
# memory_estimate.py
def estimate_actor_memory(
    active_actors: int,
    state_size_kb: float,
    overhead_kb: float = 5.0
) -> dict:
    """Estimate memory for a Dapr actor deployment."""
    per_actor_kb = state_size_kb + overhead_kb
    total_mb = (active_actors * per_actor_kb) / 1024
    
    return {
        "active_actors": active_actors,
        "per_actor_kb": per_actor_kb,
        "total_memory_mb": round(total_mb, 1),
        "recommended_heap_mb": round(total_mb * 1.5, 0)  # 50% headroom
    }

# IoT scenario: 50k active device twins, 2KB state each
iot = estimate_actor_memory(50_000, 2.0)
print(f"IoT: {iot}")
# IoT: {'active_actors': 50000, 'per_actor_kb': 7.0, 'total_memory_mb': 341.8, ...}

# Session scenario: 10k concurrent users, 10KB state each
sessions = estimate_actor_memory(10_000, 10.0)
print(f"Sessions: {sessions}")
```

## Monitoring Activation Rates and Memory

```bash
# Prometheus queries for actor health

# Deactivation rate (high rate = actors deactivating too frequently)
# rate(dapr_runtime_actor_deactivated_total[5m])

# Pending actor calls
# dapr_runtime_actor_pending_actor_calls

# Scrape Dapr metrics endpoint
curl -s http://localhost:9090/metrics | grep dapr_runtime_actor | head -20
```

```yaml
# Grafana alert: high deactivation rate suggests timeout is too short
groups:
- name: dapr-actors
  rules:
  - alert: DaprActorHighDeactivationRate
    expr: rate(dapr_runtime_actor_deactivated_total[5m]) > 100
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Actor deactivation rate > 100/s - consider increasing idle timeout"
```

## Summary

Dapr actor idle timeout and scan interval control the tradeoff between memory efficiency and activation latency. Set `actorIdleTimeout` based on your actors' typical activity patterns - shorter for sparsely invoked actors, longer for frequently accessed ones. Set `actorScanInterval` to a fraction of the idle timeout so deactivation happens promptly. Always implement `OnDeactivateAsync` to clean up resources and save final state, and monitor activation/deactivation rates in production to detect misconfigured timeouts before they cause memory pressure or cold-start latency spikes.
