# How to Monitor Multiplayer Game Server Tick Rate and Frame Processing Latency with OpenTelemetry Custom Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gaming, Game Server, Tick Rate, Custom Metrics

Description: Learn how to build custom OpenTelemetry metrics to track multiplayer game server tick rate and frame processing latency in real time.

Multiplayer game servers live and die by their tick rate. When your server loop starts falling behind, players notice immediately: rubber-banding, hit registration failures, desynced positions. The problem is that most generic APM tools have no concept of a "tick" or a "game frame." You need custom metrics that speak the language of game development.

This post walks through setting up OpenTelemetry custom metrics to monitor tick rate consistency and frame processing latency for a multiplayer game server written in C#.

## Why Tick Rate Monitoring Matters

A typical competitive FPS runs at 64 or 128 ticks per second. Each tick, the server processes player inputs, runs physics simulation, resolves hit detection, and sends state updates to all connected clients. If a single tick takes longer than the budget (15.6ms at 64 tick, 7.8ms at 128 tick), the server either drops the tick or the next tick starts late and cascading delays begin.

Standard HTTP latency metrics will not catch these problems. You need to measure the actual duration of each tick and track jitter over time.

## Setting Up the OpenTelemetry Meter

First, install the OpenTelemetry SDK packages for .NET:

```bash
dotnet add package OpenTelemetry
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
```

Create a meter provider that exports to your OTLP endpoint:

```csharp
using OpenTelemetry;
using OpenTelemetry.Metrics;
using System.Diagnostics;
using System.Diagnostics.Metrics;

// Create a custom meter for your game server
var meter = new Meter("GameServer.TickMetrics", "1.0.0");

// Histogram to track how long each tick takes to process
var tickDurationHistogram = meter.CreateHistogram<double>(
    "game.server.tick.duration_ms",
    unit: "ms",
    description: "Duration of each server tick in milliseconds"
);

// Gauge to report the effective tick rate over the last second
var effectiveTickRate = meter.CreateObservableGauge<int>(
    "game.server.tick.rate_hz",
    () => new Measurement<int>(TickCounter.GetTicksLastSecond()),
    unit: "Hz",
    description: "Effective tick rate measured over the last second"
);

// Counter for ticks that exceeded their time budget
var overbudgetTicks = meter.CreateCounter<long>(
    "game.server.tick.overbudget_count",
    description: "Number of ticks that exceeded the target frame budget"
);
```

## Instrumenting the Game Loop

Here is a simplified game loop with instrumentation wired in:

```csharp
public class GameLoop
{
    private readonly double _targetTickMs;
    private readonly Histogram<double> _tickDuration;
    private readonly Counter<long> _overbudgetCounter;
    private readonly Stopwatch _sw = new Stopwatch();

    public GameLoop(double targetTickRate, Histogram<double> tickDuration, Counter<long> overbudgetCounter)
    {
        _targetTickMs = 1000.0 / targetTickRate;
        _tickDuration = tickDuration;
        _overbudgetCounter = overbudgetCounter;
    }

    public void RunTick(GameState state)
    {
        _sw.Restart();

        // Process all pending player inputs
        ProcessInputs(state);

        // Run physics simulation for this tick
        RunPhysics(state);

        // Resolve combat and hit detection
        ResolveCombat(state);

        // Send state snapshot to connected players
        BroadcastState(state);

        _sw.Stop();
        double elapsed = _sw.Elapsed.TotalMilliseconds;

        // Record the tick duration with tags for the map and player count bracket
        _tickDuration.Record(elapsed, new TagList
        {
            { "map", state.CurrentMap },
            { "player_count_bracket", GetPlayerBracket(state.PlayerCount) }
        });

        // Track ticks that blew past the budget
        if (elapsed > _targetTickMs)
        {
            _overbudgetCounter.Add(1, new TagList
            {
                { "map", state.CurrentMap },
                { "overage_ms", Math.Round(elapsed - _targetTickMs, 1).ToString() }
            });
        }

        TickCounter.Increment();
    }

    // Bucket players into brackets so cardinality stays low
    private string GetPlayerBracket(int count) => count switch
    {
        <= 10 => "1-10",
        <= 32 => "11-32",
        <= 64 => "33-64",
        _ => "65+"
    };
}
```

## Tracking Per-Phase Breakdown

Knowing the total tick time is helpful, but you often need to know which phase is eating up the budget. Add a histogram per phase:

```csharp
var phaseHistogram = meter.CreateHistogram<double>(
    "game.server.tick.phase_duration_ms",
    unit: "ms",
    description: "Duration of individual tick phases"
);

// Inside each phase method, wrap the work:
private void RunPhysics(GameState state)
{
    var sw = Stopwatch.StartNew();

    // ... actual physics work ...

    sw.Stop();
    phaseHistogram.Record(sw.Elapsed.TotalMilliseconds, new TagList
    {
        { "phase", "physics" },
        { "map", state.CurrentMap }
    });
}
```

This gives you a per-phase breakdown you can visualize as stacked histograms.

## Configuring the OTLP Exporter

Wire up the meter provider to export metrics via OTLP:

```csharp
var meterProvider = Sdk.CreateMeterProviderBuilder()
    .AddMeter("GameServer.TickMetrics")
    .AddOtlpExporter(options =>
    {
        options.Endpoint = new Uri("https://otel-collector.yourgame.com:4317");
        // Export every 5 seconds; fast enough for alerting,
        // not so fast it overwhelms the collector
        options.PeriodicExportingMetricReaderOptions.ExportIntervalMilliseconds = 5000;
    })
    .Build();
```

## Setting Alerts That Matter

Once the data flows into your observability backend, set up alerts on the metrics that directly impact player experience:

- **Effective tick rate drops below target** for more than 10 seconds. This means the server is consistently behind.
- **P99 tick duration exceeds budget** over a 1-minute window. Spikes happen, but sustained high-percentile overruns mean trouble.
- **Overbudget tick count spikes** relative to total ticks. If more than 5% of ticks in a minute exceed the budget, investigate.

## Cardinality Considerations

Game servers can be tempting to tag with high-cardinality attributes like player IDs or individual match IDs. Resist that urge on metrics. Use low-cardinality tags like map name, player count bracket, game mode, and server region. If you need per-match granularity, use traces instead of metrics.

## Conclusion

Tick rate is the heartbeat of your game server. When it stutters, players feel it before any dashboard shows a problem. By building custom OpenTelemetry metrics around your game loop, you get visibility that generic infrastructure monitoring simply cannot provide. The key is measuring what matters: tick duration, phase breakdown, and budget overruns, all tagged with attributes that help you correlate problems to specific maps, player loads, or game modes.
