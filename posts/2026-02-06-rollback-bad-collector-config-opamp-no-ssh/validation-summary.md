# Validation Summary: How to Roll Back a Bad Collector Configuration Remotely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- Open Agent Management Protocol (OpAMP)
- OpAMP Supervisor
- Go
- HTTP APIs
- curl

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpenTelemetry Collector management and OpAMP Supervisor documentation: https://opentelemetry.io/docs/collector/management/
- Go crypto/sha256 package documentation: https://pkg.go.dev/crypto/sha256
- curl local help output for HTTP options: `curl --help http`

## Issues Found
- The post described rollback as if OpAMP itself had a built-in rollback feature. I clarified that the rollback is OpAMP-based and implemented by pushing an earlier remote configuration from the server.
- The post said every connected agent picks up the configuration. I clarified that this applies to connected agents with remote configuration enabled, matching the OpAMP `AcceptsRemoteConfig` capability requirement.
- The configuration store example assigned into `s.versions` without ensuring the map was initialized. I added a nil-map initialization guard.
- The code used `sha256Sum` without showing the helper. I added a small helper using Go's standard `crypto/sha256` API.
- The automatic rollout monitor divided by the number of agents without handling an empty group. I added a guard that skips the health check when no agents are found.
- The rollback sequence was too specific and implied protocol-guaranteed WebSocket, disk replacement, SIGTERM, and exact health behavior. I changed it to describe the typical OpenTelemetry OpAMP Supervisor flow and noted that restart or reload behavior depends on supervisor version and platform.
- The original timing claim of 10 to 30 seconds per agent was too precise for implementation-dependent startup and health reporting. I changed it to "seconds to tens of seconds."

## Review Notes
The remaining server, agent store, and `pushConfigToAgent` code is illustrative pseudocode rather than a complete OpAMP server implementation. A production implementation should send a proper OpAMP `ServerToAgent.remote_config` message containing an `AgentConfigMap`, track `RemoteConfigStatus`, enforce authentication and authorization on rollback APIs, and audit who triggered each rollback.
