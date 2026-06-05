# Validation Summary: How to Manage Collector Configuration with OpAMP

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Open Agent Management Protocol (OpAMP)
- OpenTelemetry Collector
- OpenTelemetry Collector OpAMP extension
- opamp-go Go library
- Go
- Kubernetes
- YAML

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpenTelemetry Collector extension catalog: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector OpAMP extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/opampextension
- OpenTelemetry Collector OpAMP extension config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/opampextension/config.go
- opamp-go server package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/server
- opamp-go server types package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/server/types
- opamp-go protobuf package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/protobufs

## Issues Found
- The Go server example used outdated/nonexistent opamp-go callback types such as `server.CallbacksStruct` and `types.ConnectionCallbacksStruct`. Updated it to use `types.Callbacks` and `types.ConnectionCallbacks`.
- `server.New` was shown as returning `(*server, error)`, but the current API returns only a server instance. Updated the initialization accordingly.
- The logger implementation did not match the current opamp-go logger interface, which accepts `context.Context`. Updated `Debugf` and `Errorf`.
- The code attempted to convert `message.InstanceUid` directly to `uuid.UUID`. Updated it to use `uuid.FromBytes` and return an OpAMP bad-request error for invalid instance IDs.
- The example used nonexistent `ServerToAgentFlags` values for requesting effective config and health. Updated it to use `ReportFullState`, which is the current protocol flag for asking an agent to resend omitted state.
- The server offered remote config without checking whether the agent advertised `AcceptsRemoteConfig`. Added a capability check before sending `remote_config`.
- The server did not advertise server capabilities. Added `AcceptsStatus`, `OffersRemoteConfig`, and `AcceptsEffectiveConfig`.
- `EffectiveConfig` was stored as `AgentConfigMap`, but the protobuf field type is `EffectiveConfig`. Corrected the type.
- The config hash function returned a constant value. Replaced it with SHA-256.
- The TLS server configuration had no certificate, so it would not serve `wss://` correctly. Updated the example to load a certificate and key from environment variables when provided.
- The Collector OpAMP extension YAML used unsupported fields: `identifying_attributes`, `reports_remote_config`, `accepts_remote_config`, `accepts_opamp_connection_settings`, and `heartbeat_interval`. Replaced them with fields supported by the upstream extension.
- The Collector `instance_uid` example used Kubernetes `metadata.uid`, but the extension expects a canonical UUIDv7 string if set. Changed the example to omit it by default or set a stable UUIDv7 explicitly.
- The dashboard read only identifying attributes after the Collector config was corrected to use non-identifying attributes. Updated it to read both.
- The dashboard mutated `RemoteConfigHash` after releasing the mutex, creating a data race. Kept the mutation under lock.
- The dashboard hash display converted raw hash bytes directly to a string and could slice a short hash. Updated it to hex-encode up to eight bytes safely.
- The Kubernetes Collector deployment enabled `accepts_restart_command` without the required `extension.opampextension.RemoteRestarts` feature gate. Added the feature-gate argument.

## Review Notes
- The upstream Collector OpAMP extension is alpha and currently targets status reporting and supervisor-assisted management rather than direct in-process remote configuration application. The post now notes that applying Collector configuration updates requires an OpAMP Supervisor or another parent process.
- The Go toolchain is not installed in this workspace, so the Go snippets were checked against official package documentation and source rather than compiled locally.
