# Validation Summary: How to Add Custom OpenTelemetry Spans to Phoenix Channel Events

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry tracing for Erlang/Elixir
- Phoenix Channels and sockets
- Phoenix Endpoint broadcasts
- Phoenix Telemetry events
- Elixir tasks and process context propagation
- WebSocket and PubSub observability

## Sources Consulted
- OpenTelemetry Erlang/Elixir instrumentation documentation: https://opentelemetry.io/docs/languages/erlang/instrumentation/
- OpenTelemetry.Tracer API documentation: https://opentelemetry-api.hexdocs.pm/OpenTelemetry.Tracer.html
- OpenTelemetry.Ctx API documentation: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Ctx.html
- Phoenix.Channel documentation: https://phoenix.hexdocs.pm/Phoenix.Channel.html
- Phoenix.Socket documentation: https://phoenix.hexdocs.pm/Phoenix.Socket.html
- Phoenix.Socket.Transport documentation: https://phoenix.hexdocs.pm/Phoenix.Socket.Transport.html
- Phoenix.Endpoint documentation: https://hexdocs.pm/phoenix/Phoenix.Endpoint.html
- Phoenix.Logger instrumentation documentation: https://hexdocs.pm/phoenix/Phoenix.Logger.html

## Issues Found
- The post said `OpenTelemetry.Tracer.with_span/2` automatically sets an appropriate ok/error status based on the block result. Updated the text and the basic join example because the API ends the span automatically, but application error tuples need explicit status handling.
- The traced broadcast helper called `Phoenix.Channel.broadcast/3` with a topic string. Updated the helper to use documented Phoenix Endpoint broadcast APIs for topic broadcasts and kept a socket convenience wrapper for channel code.
- The trace propagation example manually serialized trace and span IDs as attributes and described that as trace continuity. Updated it to pass the current span context through the internal broadcast payload, create OpenTelemetry span links in intercepted `handle_out/3`, and remove the metadata before pushing to clients.
- The async task example passed `OpenTelemetry.Tracer.current_span_ctx()` to `OpenTelemetry.Ctx.attach/1`, but `attach/1` expects a full OpenTelemetry context. Updated it to capture `OpenTelemetry.Ctx.get_current()` before starting the task and attach that context inside the task process.
- The socket connection example read `connect_info.transport` and attempted to find a user agent in `:x_headers`. Updated it to use `socket.transport`, `connect_info[:user_agent]`, and `connect_info[:peer_data]`, matching Phoenix's documented connect info keys.
- The multicast section was titled as span links but demonstrated child spans. Updated the heading and inline comment to describe child spans accurately.
- The Phoenix Telemetry examples labeled `measurements.duration` as microseconds. Updated span attributes to `channel.duration_native` because Phoenix documents channel durations as native time units.

## Review Notes
- Elixir is not installed in the local review environment, so snippets were checked against official API documentation rather than compiled.
- The examples remain illustrative and depend on application-specific modules such as `MyApp.Rooms`, `MyApp.Chat`, and `MyApp.Auth`.
- To capture `:user_agent` and `:peer_data` in `connect_info`, the Phoenix endpoint socket configuration must request those connect info keys.
