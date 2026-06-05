# Validation Summary: How to Manage a Mixed Fleet of OpenTelemetry Collectors and Fluent Bit Agents

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Open Agent Management Protocol (OpAMP)
- OpAMP Supervisor
- Fluent Bit
- Go
- YAML
- Fluent Bit classic configuration

## Sources Consulted
- OpenTelemetry Collector management and OpAMP documentation: https://opentelemetry.io/docs/collector/management/
- OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpAMP protocol protobuf definitions: https://github.com/open-telemetry/opamp-spec/blob/main/proto/opamp.proto
- OpenTelemetry Collector `opampsupervisor` package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/opampsupervisor
- OpenTelemetry Collector `opampsupervisor` config package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/opampsupervisor/supervisor/config
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Fluent Bit configuration documentation: https://docs.fluentbit.io/manual/administration/configuring-fluent-bit
- Fluent Bit OpenTelemetry output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/opentelemetry

## Issues Found
- The supervisor YAML placed persistent storage under `agent.storage_dir`, but the current OpenTelemetry OpAMP Supervisor schema uses a top-level `storage.directory` field. Updated the example accordingly.
- The supervisor YAML omitted `reports_remote_config`, which is part of the current supervisor capability set for reporting remote configuration status. Added it to the capability list.
- The OpAMP identification examples used `otelcol-contrib` and `fluent-bit` as `service.name` values. The OpAMP spec recommends using a reverse-FQDN-style `service.name` that uniquely identifies the agent type, so the examples now use `io.opentelemetry.collector` and `io.fluentbit`.
- The remote configuration response omitted `ServerToAgent.instance_uid` and `AgentRemoteConfig.config_hash`, both required by the OpAMP protocol when sending remote configuration. Updated the Go example to include the incoming instance UID and a SHA-256 hash of the config body.
- The Collector OTLP exporter example used a plaintext host:port endpoint without TLS settings. The OTLP exporter spec treats insecure transport as an explicit setting for scheme-less gRPC endpoints, so `tls.insecure: true` was added.
- The Fluent Bit OpenTelemetry output listed both `Traces_uri` and `Logs_uri` even though the example forwards logs from log inputs. Updated the snippet to use the documented `logs_uri` option only.

## Review Notes
The Go snippets are illustrative and depend on surrounding application types such as `AgentStore`, `Agent`, `configStore`, and `types.Connection`. Production code should also cache the agent type because OpAMP agents may omit `AgentDescription` from later messages when the description has not changed.
