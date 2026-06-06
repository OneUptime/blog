# Validation Summary: How to Build a Custom OpAMP Server in Go Using the opamp-go Library

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OpenTelemetry
- Open Agent Management Protocol (OpAMP)
- open-telemetry/opamp-go
- HTTP REST APIs

## Sources Consulted
- Go package documentation for `github.com/open-telemetry/opamp-go/server`: https://pkg.go.dev/github.com/open-telemetry/opamp-go/server
- Go package documentation for `github.com/open-telemetry/opamp-go/server/types`: https://pkg.go.dev/github.com/open-telemetry/opamp-go/server/types
- Official `opamp-go` server callback source: https://github.com/open-telemetry/opamp-go/blob/main/server/types/callbacks.go
- Official `opamp-go` server settings source: https://github.com/open-telemetry/opamp-go/blob/main/server/server.go
- Official `opamp-go` protobuf-generated Go source: https://github.com/open-telemetry/opamp-go/blob/main/protobufs/opamp.pb.go
- Official OpAMP specification: https://github.com/open-telemetry/opamp-spec/blob/main/specification.md

## Issues Found
- The server callback examples used nonexistent `server.CallbacksStruct`, `server.ConnectionCallbacksStruct`, and `On*Func` fields. Updated them to use `types.Callbacks`, `types.ConnectionCallbacks`, `OnConnecting`, `OnMessage`, and `OnConnectionClose`, matching the current `opamp-go` API.
- The message callback signature omitted `context.Context`. Updated `onMessage` to match the current `types.ConnectionCallbacks.OnMessage` signature.
- The code used nonexistent `protobufs.AgentHealth`. Updated it to `protobufs.ComponentHealth`, which is the current type of `AgentToServer.Health`.
- The server responses omitted `InstanceUid` and server capabilities. Added `InstanceUid` and relevant `ServerCapabilities` bits to `ServerToAgent` responses.
- The remote config push did not set `AgentRemoteConfig.ConfigHash`, which the protocol requires when supporting remote configuration. Added a SHA-256 hash for the offered config.
- The REST config push tried to address an agent only by the hex string ID. Added storage of the original instance UID bytes so outbound `ServerToAgent.InstanceUid` can match the agent's `AgentToServer.InstanceUid`.
- Agent tracking replaced stored state with each message, even though OpAMP agents may omit unchanged fields. Updated `AddOrUpdate` to preserve prior description, health, and effective config when omitted from subsequent messages.
- Disconnect handling only logged the close event and left stale agents in the registry. Added a connection index and `RemoveByConnection` cleanup.

## Review Notes
The local environment did not have the Go toolchain installed, so I could not run `go build`. API verification was performed against official `opamp-go` documentation and source. The example is still intentionally minimal and does not cover production concerns such as authentication, request validation, capability negotiation per agent, non-WebSocket transports, graceful shutdown, or remote config status handling.
