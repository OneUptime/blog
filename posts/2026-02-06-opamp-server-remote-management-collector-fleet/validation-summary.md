# Validation Summary: How to Set Up an OpAMP Server for Remote Mgmt of Your OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpAMP
- opamp-go
- OpenTelemetry OpAMP Supervisor
- Go
- YAML configuration
- WebSocket and TLS

## Sources Consulted
- OpenTelemetry Collector Management documentation: https://opentelemetry.io/docs/collector/management/
- OpenTelemetry OpAMP specification documentation: https://opentelemetry.io/docs/specs/opamp/
- opamp-go server package source: https://github.com/open-telemetry/opamp-go/tree/main/server
- opamp-go server types package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/server/types
- OpenTelemetry Collector Contrib OpAMP Supervisor README and configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/opampsupervisor
- OpAMP Supervisor config package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/opampsupervisor/supervisor/config

## Issues Found
- The Go server snippet used outdated `opamp-go` callback API names (`server.CallbacksStruct`, `OnConnectingFunc`, and `OnMessageFunc`). Updated it to the current `types.Callbacks` and `types.ConnectionCallbacks` API used by `opamp-go`.
- The Go snippet instantiated `server.New(&logger{})`, but no `logger` type was defined in the snippet. Changed it to `server.New(nil)`, which uses the library's default no-op logger.
- The Go snippet returned an empty `ServerToAgent` response. Updated it to include the received `InstanceUid`, matching the current default response behavior in `opamp-go`.
- The supervisor run command used `./opamp-supervisor --config supervisor.yaml`, but the official released binary is named `opampsupervisor` and official examples use `--config=supervisor.yaml`. Updated the command.
- The sample instance IDs were formatted as dashed UUID strings, while `AgentToServer.InstanceUid` is a byte field and the updated log example prints it as hex. Updated the sample log output.
- The production note referred to a non-current `types.ServerCallbacks` interface. Updated it to reference the current callback structs, `types.Callbacks` and `types.ConnectionCallbacks`.

## Review Notes
The supervisor configuration fields in the post (`server.endpoint`, `server.tls.ca_file`, `server.tls.cert_file`, `server.tls.key_file`, `agent.executable`, and the listed capability flags) match the current OpAMP Supervisor configuration model. The OpAMP Supervisor remains documented as an implementation whose design may change, so future reviews should re-check the current OpenTelemetry Collector Contrib release before publishing.
