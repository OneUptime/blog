# Validation Summary: How to Set Up OpAMP-Based Self-Healing Pipelines That Auto-Recover from Config

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpAMP
- OpenTelemetry Collector remote configuration
- Go
- Prometheus metrics and alerting rules

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- opamp-go protobufs package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/protobufs
- opamp-go generated protobuf source: https://github.com/open-telemetry/opamp-go
- Prometheus Go client documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The post said OpAMP agents periodically report their effective configuration. The OpAMP specification says status is reported on connection and when status changes, and `effective_config` should not be expected unless the agent has the `ReportsEffectiveConfig` capability. I updated the wording to reflect capability-gated, change-driven reporting.
- The drift detector compared only the empty-name main config file body. OpAMP represents configuration as an `AgentConfigMap` of named files, with an empty filename only allowed for single-file agents. I changed the example to hash the full config map deterministically.
- The drift correction section said the server pushes configuration back to the agent unconditionally. OpAMP requires the agent to advertise `AcceptsRemoteConfig`, and remote config is an offer the agent may validate and apply. I added the capability check and changed the wording from "push" to "offer" where appropriate.
- The periodic scan section implied it could catch agents that drifted without reporting updates. A server-side scan can only inspect the latest reported state and retry correction for connected agents. I updated that description.
- The conclusion claimed collectors always converge to the desired state. Because OpAMP remote configuration is optional and agent acceptance is required, I softened the claim to state that collectors can converge when remote configuration is enabled and accepted.

## Review Notes
- The Go snippets remain illustrative and assume surrounding server, storage, connection, and metric helper types such as `OpAMPServer`, `Agent`, `pushConfigToAgent`, and `sha256Sum`.
- The Prometheus `Gauge`, `CounterVec`, and alerting rule examples are structurally valid.
