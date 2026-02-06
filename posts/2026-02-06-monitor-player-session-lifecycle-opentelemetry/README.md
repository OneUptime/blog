# How to Monitor Player Session Lifecycle (Login, Matchmake, Play, Disconnect) with OpenTelemetry Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gaming, Player Sessions, Lifecycle Monitoring, Spans

Description: Track the full player session lifecycle from login through disconnect using OpenTelemetry spans for end-to-end visibility.

A player session is the fundamental unit of engagement in any online game. It starts when a player logs in and ends when they disconnect. Everything in between, including matchmaking, loading, playing, and transitioning between matches, is the experience you are trying to optimize. When sessions are short, something is driving players away. When they fail, players churn.

This post shows how to model the entire player session lifecycle as OpenTelemetry spans, giving you a complete picture of every session.

## Modeling Sessions as Long-Running Spans

A player session can last minutes or hours. OpenTelemetry spans work well for this, but you need to manage them carefully since long-running spans consume memory until they are exported.

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
import time

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="otel-collector.yourgame.com:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("player-session")
```

## Starting a Session on Login

When a player authenticates, create the root session span:

```python
class SessionManager:
    def __init__(self):
        # Active sessions keyed by player_id
        self._sessions = {}

    def start_session(self, player_id, auth_method, client_version, platform):
        """Called when a player successfully authenticates."""
        span = tracer.start_span(
            "session.lifecycle",
            attributes={
                "player.id": player_id,
                "session.auth_method": auth_method,
                "client.version": client_version,
                "client.platform": platform,
                "session.start_time": time.time(),
            }
        )
        ctx = trace.set_span_in_context(span)

        self._sessions[player_id] = {
            "span": span,
            "context": ctx,
            "phase": "login",
            "matches_played": 0,
            "start_time": time.time(),
        }

        # Record the login phase as a child span
        login_span = tracer.start_span(
            "session.phase.login",
            context=ctx,
            attributes={"player.id": player_id}
        )
        login_span.end()

        return ctx
```

## Tracking Phase Transitions

As the player moves through phases, create child spans under the session root:

```python
    def enter_matchmaking(self, player_id, game_mode):
        """Player enters the matchmaking queue."""
        session = self._sessions[player_id]
        session["phase"] = "matchmaking"

        span = tracer.start_span(
            "session.phase.matchmaking",
            context=session["context"],
            attributes={
                "player.id": player_id,
                "game.mode": game_mode,
            }
        )
        session["current_phase_span"] = span

    def matchmaking_complete(self, player_id, lobby_id, wait_seconds):
        """Player was matched and assigned to a lobby."""
        session = self._sessions[player_id]
        phase_span = session.get("current_phase_span")
        if phase_span:
            phase_span.set_attribute("matchmaking.wait_seconds", wait_seconds)
            phase_span.set_attribute("lobby.id", lobby_id)
            phase_span.end()

    def enter_game(self, player_id, server_id, map_name):
        """Player joins a game server and starts playing."""
        session = self._sessions[player_id]
        session["phase"] = "in_game"
        session["matches_played"] += 1

        span = tracer.start_span(
            "session.phase.in_game",
            context=session["context"],
            attributes={
                "player.id": player_id,
                "server.id": server_id,
                "game.map": map_name,
                "session.match_number": session["matches_played"],
            }
        )
        session["current_phase_span"] = span

    def leave_game(self, player_id, result, score):
        """Player finishes a match."""
        session = self._sessions[player_id]
        phase_span = session.get("current_phase_span")
        if phase_span:
            phase_span.set_attribute("game.result", result)
            phase_span.set_attribute("game.score", score)
            phase_span.end()
        session["phase"] = "menu"
```

## Handling Disconnects

Disconnects are the most important events to capture well. They tell you why sessions end:

```python
    def end_session(self, player_id, reason):
        """Called when a player disconnects for any reason."""
        session = self._sessions.pop(player_id, None)
        if not session:
            return

        # End any in-progress phase span
        phase_span = session.get("current_phase_span")
        if phase_span:
            phase_span.set_attribute("phase.ended_by", "disconnect")
            phase_span.end()

        # Calculate session duration
        duration = time.time() - session["start_time"]

        # End the root session span with summary attributes
        root_span = session["span"]
        root_span.set_attributes({
            "session.duration_seconds": round(duration, 1),
            "session.matches_played": session["matches_played"],
            "session.end_reason": reason,
            "session.end_phase": session["phase"],
        })

        # Classify the disconnect reason for easier querying
        if reason in ("client_quit", "logout"):
            root_span.set_attribute("session.end_type", "graceful")
        elif reason in ("timeout", "connection_lost"):
            root_span.set_attribute("session.end_type", "connection_failure")
        elif reason in ("kicked", "banned"):
            root_span.set_attribute("session.end_type", "enforcement")
        elif reason == "crash":
            root_span.set_attribute("session.end_type", "crash")
        else:
            root_span.set_attribute("session.end_type", "unknown")

        root_span.end()
```

## Recording Loading and Transition Times

Loading screens are a major source of player frustration. Track them:

```python
    def start_loading(self, player_id, loading_type):
        """Track loading screens (map load, initial load, etc.)"""
        session = self._sessions[player_id]
        loading_span = tracer.start_span(
            "session.phase.loading",
            context=session["context"],
            attributes={
                "player.id": player_id,
                "loading.type": loading_type,
            }
        )
        session["loading_span"] = loading_span

    def finish_loading(self, player_id, assets_loaded, total_size_mb):
        session = self._sessions[player_id]
        loading_span = session.pop("loading_span", None)
        if loading_span:
            loading_span.set_attributes({
                "loading.assets_count": assets_loaded,
                "loading.total_size_mb": total_size_mb,
            })
            loading_span.end()
```

## Session Metrics to Track

Derive these metrics from your session traces:

- **Median session duration** by platform and client version. Drops indicate engagement problems.
- **Matches per session** distribution. If most sessions end after zero matches, matchmaking is failing.
- **Disconnect reason breakdown**. A spike in "connection_lost" means network issues. A spike in "crash" means a buggy build.
- **Time spent in each phase** as a percentage of total session time. If players spend 40% of their session loading, that is your optimization target.

## Handling Memory for Long Sessions

One concern with long-running spans is memory. Each open span holds attributes in memory until it ends. For sessions lasting hours, consider these approaches:

- Set a maximum span duration and split very long sessions into segments.
- Keep the root span lightweight (few attributes) and rely on child spans for detail.
- Use span events instead of attributes for timestamped occurrences within the session.

## Conclusion

Modeling player sessions as OpenTelemetry spans gives you something that log-based analytics alone cannot: a structured, hierarchical view of exactly what happened during every session. You can see the full journey from login to disconnect, identify where players drop off, and understand whether disconnect spikes are caused by crashes, network problems, or players simply getting bored. When your game director asks why average session length dropped after the last patch, you will have the answer.
