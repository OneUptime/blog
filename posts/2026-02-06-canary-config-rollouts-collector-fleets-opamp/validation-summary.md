# Validation Summary: How to Use Canary Configuration Rollouts Across Collector Fleets with OpAMP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector configuration
- Open Agent Management Protocol (OpAMP)
- OpenTelemetry semantic conventions
- Go
- HTTP APIs
- Canary configuration rollouts

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpAMP Go protobuf API documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/protobufs
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The grouping example used `service.environment` and read it from `IdentifyingAttributes`. Updated it to use the current `deployment.environment.name` semantic convention and read it from `NonIdentifyingAttributes`, which better matches OpAMP's distinction between identifying attributes and descriptive attributes.
- The rollout execution snippet could panic for an unknown group or a group with no agents. Added checks that return errors for missing or empty groups.
- The rollout target slice could panic if a computed target count exceeded the number of agents. Added an upper bound on `targetCount`.
- The OpAMP configuration push was represented by a helper but did not state the required OpAMP remote configuration shape. Added a note that `pushConfigToAgent` should send `ServerToAgent.remote_config` as an `AgentRemoteConfig` containing an `AgentConfigMap` and `config_hash`.

## Review Notes
The post is technically valid after the fixes. The Go examples remain illustrative and assume surrounding application types such as `Agent`, `ConfigVersion`, `agentStore`, `pushConfigToAgent`, `fleetManager`, and `notifier` are implemented elsewhere. Production implementations should also track remote configuration status and effective configuration reports from agents when deciding whether a phase has succeeded.
