# Validation Summary: Set Up OpAMP Agent-to-Server WebSocket Connections for Real-Time Fleet Control

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry OpAMP
- OpAMP WebSocket and HTTP transports
- opamp-go server API
- OpenTelemetry Collector OpAMP Supervisor configuration
- TLS / WSS
- NGINX WebSocket proxying
- Prometheus metrics instrumentation

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- opamp-go server API source: https://github.com/open-telemetry/opamp-go/blob/main/server/server.go
- opamp-go server callback types: https://github.com/open-telemetry/opamp-go/blob/main/server/types/callbacks.go
- opamp-go server connection type: https://github.com/open-telemetry/opamp-go/blob/main/server/types/connection.go
- OpenTelemetry Collector OpAMP Supervisor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/opampsupervisor/README.md
- OpenTelemetry Collector OpAMP Supervisor configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/opampsupervisor/supervisor/config/config.go
- OpenTelemetry Collector OpAMP Supervisor example config: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/opampsupervisor/examples/supervisor.yaml
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The `opamp-go` server example used non-existent callback helper types and fields (`server.CallbacksStruct`, `server.ConnectionCallbacksStruct`, `OnConnectingFunc`, `OnMessageFunc`, and `OnConnectionCloseFunc`). Updated it to the current `types.Callbacks` and `types.ConnectionCallbacks` API.
- The `OnMessage` handler signature was incomplete for the current `opamp-go` API. Updated the example to use `func(context.Context, types.Connection, *protobufs.AgentToServer) *protobufs.ServerToAgent`.
- The server example referenced an undefined `serverLogger`. Changed `server.New(&serverLogger{})` to `server.New(nil)`, which is supported by `opamp-go` and uses its default no-op logger.
- The supervisor YAML used `agent.storage_dir`, which is not part of the current OpAMP Supervisor config. Replaced it with the documented `storage.directory` setting.
- The reconnection YAML showed a `server.retry` block with `initial_interval`, `max_interval`, and `multiplier`, but the current OpAMP Supervisor config does not define those fields. Replaced the snippet with the documented server endpoint and described the OpAMP-specified reconnection/backoff behavior.
- The load-balancing section said agents must always connect to the same server instance. Softened this to recommend sticky sessions when server instances keep local connection state.

## Review Notes
The core protocol explanation is consistent with the OpAMP specification: OpAMP supports HTTP and WebSocket transports, HTTP clients poll when idle, WebSocket supports server-to-agent delivery without waiting for polling, and reconnects should use exponential backoff with jitter. The OpAMP Supervisor is still marked alpha in the OpenTelemetry Collector Contrib documentation, so future posts should mention version-specific behavior if relying on exact supervisor config fields.
