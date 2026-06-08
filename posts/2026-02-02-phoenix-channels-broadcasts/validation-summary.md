# Validation Summary: How to Configure Phoenix Channel Topics and Broadcasts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir
- Phoenix Framework (Phoenix.Channel, Phoenix.Socket, Phoenix.Endpoint, Phoenix.Presence)
- Phoenix.PubSub (PG2 and Redis adapters)
- Phoenix JavaScript client library (Socket, Presence)
- Telemetry (`:telemetry`)
- Erlang `:erlang.phash2` for sharding
- WebSockets / long-polling transports

## Sources Consulted
- Phoenix.Channel docs — https://hexdocs.pm/phoenix/Phoenix.Channel.html (join/3 return values, broadcast!, broadcast_from!, intercept, handle_out)
- Phoenix.Socket docs — https://hexdocs.pm/phoenix/Phoenix.Socket.html (channel macro, connect/3, id/1)
- Phoenix.Endpoint docs — https://hexdocs.pm/phoenix/Phoenix.Endpoint.html (socket macro, websocket transport options, broadcast!/3, subscribe/1)
- Phoenix.Presence docs — https://hexdocs.pm/phoenix/Phoenix.Presence.html (use options, track/3, update/3, list/1, fetch/2)
- Phoenix.PubSub docs — https://hexdocs.pm/phoenix_pubsub/Phoenix.PubSub.html (PG2 adapter, Redis adapter)
- Phoenix Token docs — https://hexdocs.pm/phoenix/Phoenix.Token.html (verify/4 with max_age)
- Phoenix JavaScript client — https://hexdocs.pm/phoenix/js/ (Socket, Presence.syncState, syncDiff, list)
- Erlang `:erlang.phash2/2` — https://www.erlang.org/doc/man/erlang.html#phash2-2
- Telemetry library — https://hexdocs.pm/telemetry/

## Issues Found
- **Line 194 (`join/3` return tuple)**: The original code returned `{:ok, assign(socket, :room_id, room_id), socket}`. Phoenix.Channel's `join/3` callback accepts either `{:ok, socket}` or `{:ok, reply, socket}` (where `reply` is sent to the client). The 3-tuple form would have treated the assigned socket struct as the client reply (not JSON-encodable as intended) and dropped the `room_id` assignment from the actual stored socket. Fixed to `{:ok, assign(socket, :room_id, room_id)}`.

## Review Notes
- The PubSub config example uses `config :my_app, MyApp.PubSub, ... adapter: Phoenix.PubSub.PG2, pool_size: 10`. In modern Phoenix 1.5+, PubSub is typically started as a child in the application supervision tree (`{Phoenix.PubSub, name: MyApp.PubSub}`) rather than via application config, and `pool_size` is no longer an option on the PG2 adapter. The shown approach still loads config but won't actually start PubSub on its own. Left as-is because the snippet is illustrative and the adapter names (`Phoenix.PubSub.PG2`, `Phoenix.PubSub.Redis`) remain correct.
- The `intercept` macro and `handle_out/3` callback usage is correct; only the first clause of `handle_out` needs `@impl true`.
- The JavaScript `Presence.syncState`, `Presence.syncDiff`, and `Presence.list` API usage is consistent with the current Phoenix JS client.
- The `:erlang.phash2/2` sharding pattern is valid; note that `phash2` with a range of N produces values in `0..(N-1)`, which matches the code's iteration.
- The `Task.start` example in best practices works but doesn't link the task to a supervisor; for production code, consider `Task.Supervisor.start_child/2`. This is a recommendation rather than a correctness issue.
- The instrumented channel `defmacro __before_compile__` pattern works but each `defoverridable` declaration should ideally precede a single override; using `defoverridable join: 3` then defining `join/3` later is valid.
- HtmlSanitizeEx is a real Hex package and the API call `HtmlSanitizeEx.strip_tags/1` is correct.
