# Validation Summary: How to Push Remote Configuration Updates to Hundreds of Collectors Using OpAMP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpAMP
- opamp-go
- Go
- YAML

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- opamp-go server/types package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/server/types
- opamp-go protobufs package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/protobufs
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector management documentation: https://opentelemetry.io/docs/collector/management/

## Issues Found
- The first Go example used `context.Background()` and `computeHash(configYAML)` without importing `context` or defining `computeHash`. I added the missing `context` and `crypto/sha256` imports and a small SHA-256 helper so the example is syntactically complete.
- The verification example used `OnMessageFunc` and a callback signature that does not match the current `opamp-go/server/types.ConnectionCallbacks.OnMessage` field. I changed it to `OnMessage: func(ctx context.Context, conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent`.
- The verification example attempted to read `msg.EffectiveConfig.ConfigMap.ConfigMap[""].Hash`, but `AgentConfigFile` has `Body` and `ContentType` fields, not a `Hash` field. I changed the example to compare `msg.RemoteConfigStatus.LastRemoteConfigHash` with the expected remote config hash when the status is `APPLIED`.
- The verification logs printed `InstanceUid` with `%s`, even though OpAMP instance UIDs are bytes. I changed the format to `%x` for readable output.
- The post implied every collector would pick up a pushed configuration within seconds. The OpAMP specification does not guarantee a fixed propagation time, so I changed the wording to say connected collectors can apply the update after receiving and processing it.
- The opening explanation implied all OpAMP-managed collectors report effective configuration and accept remote configuration. These are advertised capabilities, so I clarified that the collector must connect with remote configuration enabled and can report effective configuration.

## Review Notes
The post is technically relevant and the Collector YAML snippet follows standard Collector receiver, processor, exporter, and pipeline structure. The OpAMP specification treats remote configuration as an optional capability, and agents must advertise `AcceptsRemoteConfig` before the server offers remote configuration.
