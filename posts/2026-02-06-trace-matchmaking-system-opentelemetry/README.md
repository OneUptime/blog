# How to Trace Matchmaking System Performance (Queue Time, Skill Rating Calculation, Lobby Creation) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gaming, Matchmaking, Distributed Tracing, Performance

Description: Instrument your matchmaking pipeline with OpenTelemetry to trace queue times, skill rating calculations, and lobby creation latency.

Matchmaking is one of the most complex distributed systems in gaming. A single "Find Match" button press can trigger queue management, skill rating lookups, ELO calculations, geographic filtering, lobby creation, and server allocation. When players complain about long queue times, you need to know exactly where the time is being spent.

OpenTelemetry distributed tracing gives you that visibility. This post covers how to instrument a matchmaking pipeline end-to-end.

## The Matchmaking Pipeline

A typical matchmaking flow looks like this:

1. Player clicks "Find Match" and enters a queue
2. The matchmaker pulls candidates from the queue
3. Skill ratings are fetched and compatibility scores are calculated
4. A lobby is created with the selected players
5. A game server is allocated for the lobby

Each of these steps might run on a different service. Distributed tracing ties them all together under one trace.

## Setting Up Tracing in the Matchmaking Service

We will use Python with the OpenTelemetry SDK:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Identify this service in traces
resource = Resource.create({
    "service.name": "matchmaking-service",
    "service.version": "2.4.1",
    "deployment.environment": "production"
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(
    endpoint="otel-collector.yourgame.com:4317"
))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("matchmaking")
```

## Tracing Queue Entry and Wait Time

When a player enters the queue, start a span and record the entry time. When they get picked up by the matchmaker, end that span:

```python
import time

class MatchmakingQueue:
    def __init__(self):
        self._queue = {}
        self._spans = {}

    def enqueue(self, player_id, game_mode, region):
        # Start a span that will live until the player exits the queue
        span = tracer.start_span(
            "matchmaking.queue_wait",
            attributes={
                "player.id": player_id,
                "game.mode": game_mode,
                "player.region": region,
                "queue.entry_time": time.time()
            }
        )
        self._spans[player_id] = span
        self._queue[player_id] = {
            "game_mode": game_mode,
            "region": region,
            "entered_at": time.time()
        }

    def dequeue(self, player_id):
        player = self._queue.pop(player_id)
        span = self._spans.pop(player_id)

        wait_seconds = time.time() - player["entered_at"]
        span.set_attribute("queue.wait_seconds", round(wait_seconds, 2))
        span.end()

        return player, wait_seconds
```

## Tracing Skill Rating Calculation

Skill rating is often the bottleneck. It might involve fetching match history, running ELO or Glicko-2 calculations, and adjusting for party compositions:

```python
def find_match(self, candidates):
    with tracer.start_as_current_span("matchmaking.find_match") as parent_span:
        parent_span.set_attribute("candidates.count", len(candidates))

        # Fetch skill ratings for all candidates
        with tracer.start_as_current_span("matchmaking.fetch_skill_ratings") as sr_span:
            ratings = self.rating_service.batch_fetch(
                [c["player_id"] for c in candidates]
            )
            sr_span.set_attribute("ratings.fetched", len(ratings))

        # Calculate compatibility matrix
        with tracer.start_as_current_span("matchmaking.calculate_compatibility") as calc_span:
            matrix = self._build_compatibility_matrix(candidates, ratings)
            calc_span.set_attribute("matrix.size", len(matrix))
            calc_span.set_attribute("algorithm", "glicko2_weighted")

        # Select the best group from the compatibility matrix
        with tracer.start_as_current_span("matchmaking.select_group") as sel_span:
            group = self._select_optimal_group(matrix)
            sel_span.set_attribute("group.size", len(group))
            sel_span.set_attribute("group.skill_spread", self._skill_spread(group))
            sel_span.set_attribute("group.avg_rating", self._avg_rating(group))

        return group
```

## Tracing Lobby Creation

Once a group is selected, the lobby service creates a room and notifies all players:

```python
def create_lobby(self, group, game_mode):
    with tracer.start_as_current_span("matchmaking.create_lobby") as span:
        span.set_attribute("lobby.game_mode", game_mode)
        span.set_attribute("lobby.player_count", len(group))

        # Allocate a lobby ID and persist it
        lobby_id = self.lobby_store.create(group, game_mode)
        span.set_attribute("lobby.id", lobby_id)

        # Notify each player they have been matched
        with tracer.start_as_current_span("matchmaking.notify_players") as notify_span:
            failed_notifications = 0
            for player in group:
                try:
                    self.notification_service.send(player["player_id"], {
                        "type": "match_found",
                        "lobby_id": lobby_id
                    })
                except Exception as e:
                    failed_notifications += 1
                    notify_span.add_event("notification_failed", {
                        "player.id": player["player_id"],
                        "error": str(e)
                    })
            notify_span.set_attribute("notifications.failed", failed_notifications)

        return lobby_id
```

## Propagating Context to the Game Server

When the lobby is ready, the matchmaker requests a game server. Pass the trace context along so the server allocation appears in the same trace:

```python
from opentelemetry.propagate import inject

def allocate_server(self, lobby_id, region):
    with tracer.start_as_current_span("matchmaking.allocate_server") as span:
        span.set_attribute("lobby.id", lobby_id)
        span.set_attribute("server.region", region)

        # Inject trace context into the headers for the server allocation request
        headers = {}
        inject(headers)

        response = self.server_pool.request_server(
            lobby_id=lobby_id,
            region=region,
            headers=headers
        )

        span.set_attribute("server.id", response["server_id"])
        span.set_attribute("server.ip", response["ip"])
        span.set_attribute("allocation.duration_ms", response["allocation_ms"])

        return response
```

## What to Alert On

With these traces flowing, you can set up meaningful alerts:

- **P95 queue wait time** exceeding 60 seconds for any game mode. Long queues drive players away.
- **Skill rating fetch latency** above 500ms. This blocks the entire matchmaking loop.
- **Lobby creation failure rate** above 1%. Failed lobbies mean players get dumped back into the queue.
- **Skill spread in matched groups** exceeding your acceptable threshold. This indicates the matchmaker is making bad compromises under pressure.

## Analyzing Traces

When a player reports a 5-minute queue time, you can search traces by player ID and see exactly what happened. Maybe the skill rating service was slow. Maybe the matchmaker kept finding groups but lobby creation kept failing. Maybe the player's rating put them in a very sparse bracket. The trace tells the full story.

## Conclusion

Matchmaking touches almost every backend system in your game. Without distributed tracing, debugging queue time complaints means guessing. With OpenTelemetry spans covering each phase of the pipeline, you can see exactly where time is spent and where failures occur. The key is wrapping each logical step in its own span with meaningful attributes that let you slice the data by game mode, region, and skill bracket.
