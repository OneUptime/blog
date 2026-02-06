# How to Monitor Game Server Autoscaling Decisions and Player Density Metrics with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gaming, Autoscaling, Player Density, Infrastructure

Description: Use OpenTelemetry to monitor game server autoscaling decisions, track player density, and optimize server fleet management.

Game server autoscaling is a different beast from web service autoscaling. You cannot just scale on CPU usage. A game server at 60% CPU with 2 players is not the same as one at 60% CPU with 64 players. Player density, regional demand, match lifecycles, and queue depth all factor into scaling decisions. If your autoscaler makes a bad call, players either sit in queues waiting for servers or you burn money on empty instances.

This post shows how to feed the right signals into OpenTelemetry so you can understand and improve your autoscaling behavior.

## Defining the Metrics That Drive Scaling

Before instrumenting, identify what your autoscaler should care about:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up the meter provider
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="otel-collector.yourgame.com:4317"),
    export_interval_millis=10000
)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("game.autoscaler", "1.0.0")
```

## Tracking Player Density Per Server

Player density tells you how efficiently servers are being utilized:

```python
# Observable gauge that reports current player counts per server
def player_density_callback(options):
    """Called periodically to report player density across all active servers."""
    for server in server_registry.get_active_servers():
        yield metrics.Observation(
            value=server.player_count,
            attributes={
                "server.id": server.server_id,
                "server.region": server.region,
                "game.mode": server.game_mode,
                "server.max_players": server.max_players,
            }
        )

meter.create_observable_gauge(
    "game.server.player_count",
    callbacks=[player_density_callback],
    unit="players",
    description="Current player count on each game server"
)

# Track utilization as a percentage for easier alerting
def utilization_callback(options):
    for server in server_registry.get_active_servers():
        utilization = (server.player_count / server.max_players) * 100
        yield metrics.Observation(
            value=round(utilization, 1),
            attributes={
                "server.region": server.region,
                "game.mode": server.game_mode,
            }
        )

meter.create_observable_gauge(
    "game.server.utilization_percent",
    callbacks=[utilization_callback],
    unit="%",
    description="Server player capacity utilization percentage"
)
```

## Recording Autoscaling Decisions

Every time the autoscaler decides to scale up, scale down, or hold steady, record it:

```python
from opentelemetry import trace

tracer = trace.get_tracer("game.autoscaler")

scale_event_counter = meter.create_counter(
    "game.autoscaler.decisions",
    description="Count of autoscaling decisions by type"
)

def evaluate_scaling(region, game_mode):
    with tracer.start_as_current_span("autoscaler.evaluate") as span:
        # Gather current state
        active_servers = server_registry.count_active(region, game_mode)
        total_players = server_registry.total_players(region, game_mode)
        queue_depth = matchmaking_queue.depth(region, game_mode)
        avg_utilization = server_registry.avg_utilization(region, game_mode)

        span.set_attributes({
            "autoscaler.region": region,
            "autoscaler.game_mode": game_mode,
            "autoscaler.active_servers": active_servers,
            "autoscaler.total_players": total_players,
            "autoscaler.queue_depth": queue_depth,
            "autoscaler.avg_utilization": round(avg_utilization, 1),
        })

        # Decision logic
        if queue_depth > 50 and avg_utilization > 80:
            decision = "scale_up"
            servers_to_add = max(1, queue_depth // 30)
            span.set_attribute("autoscaler.servers_to_add", servers_to_add)
            provision_servers(region, game_mode, servers_to_add)

        elif avg_utilization < 20 and active_servers > 2:
            decision = "scale_down"
            servers_to_remove = max(1, (active_servers - 2) // 3)
            span.set_attribute("autoscaler.servers_to_remove", servers_to_remove)
            drain_servers(region, game_mode, servers_to_remove)

        else:
            decision = "hold"

        span.set_attribute("autoscaler.decision", decision)
        scale_event_counter.add(1, {
            "decision": decision,
            "region": region,
            "game_mode": game_mode,
        })

        return decision
```

## Tracking Server Lifecycle Timing

How long does it take from the decision to scale up until the server is actually ready to accept players?

```python
server_provision_histogram = meter.create_histogram(
    "game.autoscaler.provision_duration_seconds",
    unit="s",
    description="Time from scale-up decision to server ready"
)

async def provision_servers(region, game_mode, count):
    for _ in range(count):
        with tracer.start_as_current_span("autoscaler.provision_server") as span:
            span.set_attributes({
                "server.region": region,
                "game.mode": game_mode,
            })

            start = time.time()

            # Request a new server instance
            instance = await cloud_provider.create_instance(region)
            span.set_attribute("server.instance_id", instance.id)
            span.add_event("instance_created")

            # Wait for the game server process to start and report ready
            await wait_for_health_check(instance)
            span.add_event("health_check_passed")

            # Register with the server pool
            server_registry.register(instance, game_mode)
            span.add_event("registered_in_pool")

            elapsed = time.time() - start
            server_provision_histogram.record(elapsed, {
                "region": region,
                "game_mode": game_mode,
            })

            span.set_attribute("provision.duration_seconds", round(elapsed, 2))
```

## Monitoring Fleet-Wide Aggregates

Individual server metrics are important, but fleet-wide views drive strategy:

```python
def fleet_summary_callback(options):
    """Report fleet-wide metrics per region."""
    for region in ACTIVE_REGIONS:
        servers = server_registry.get_active_servers(region=region)
        total = len(servers)
        empty = sum(1 for s in servers if s.player_count == 0)
        full = sum(1 for s in servers if s.player_count >= s.max_players * 0.95)

        yield metrics.Observation(value=total, attributes={"region": region, "status": "total"})
        yield metrics.Observation(value=empty, attributes={"region": region, "status": "empty"})
        yield metrics.Observation(value=full, attributes={"region": region, "status": "full"})

meter.create_observable_gauge(
    "game.fleet.server_count",
    callbacks=[fleet_summary_callback],
    description="Fleet server counts by status and region"
)
```

## Alerts for Autoscaling Problems

Set up alerts that catch autoscaling failures early:

- **Queue depth rising while servers are under-utilized**: the autoscaler is not scaling up when it should.
- **Provisioning latency above 2 minutes**: new servers are taking too long to come online.
- **More than 30% of servers are empty for 10+ minutes**: the autoscaler is not draining fast enough.
- **All servers in a region above 90% utilization**: you are about to run out of capacity.

## Conclusion

Game server autoscaling needs game-aware metrics. CPU and memory are not enough. By tracking player density, queue depth, utilization percentages, and the timing of scaling decisions with OpenTelemetry, you build the feedback loop needed to keep your autoscaler making smart choices. When something goes wrong on a Friday night launch, you will have the traces and metrics to understand exactly what the autoscaler was seeing and why it made the decisions it did.
