# Validation Summary: How to Configure Terraform Cloud Agent OpenTelemetry Telemetry Export via OTLP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HCP Terraform / Terraform Cloud agents
- Terraform Enterprise agents
- OpenTelemetry
- OTLP/gRPC
- OpenTelemetry Collector
- Docker Compose

## Sources Consulted
- HashiCorp Developer: HCP Terraform agent telemetry, https://developer.hashicorp.com/terraform/cloud-docs/agents/telemetry
- HashiCorp Developer: Install and run HCP Terraform agents, https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HashiCorp Developer: HCP Terraform agents tracing, https://developer.hashicorp.com/terraform/cloud-docs/agents/tracing
- HashiCorp Developer: HCP Terraform agent metrics, https://developer.hashicorp.com/terraform/cloud-docs/agents/metrics
- OpenTelemetry: OTLP exporter configuration and protocol environment variables, https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry: Collector configuration, https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The post incorrectly stated that Terraform Cloud agents are configured with generic `OTEL_TRACES_EXPORTER`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, and related SDK environment variables. HashiCorp documents `TFC_AGENT_OTLP_ADDRESS` or `-otlp-address` as the supported agent telemetry configuration. Updated the examples and explanation accordingly.
- The post showed Terraform `tfe_variable` workspace environment variables as the way to configure agent telemetry. Workspace variables are run environment variables and do not configure the already-running `tfc-agent` process. Replaced those examples with agent process environment configuration.
- The post claimed configurable agent OTLP protocol, compression, headers, and timeout through standard OTEL variables. HashiCorp documents the agent connection as OTLP/gRPC to a collector, with optional `TFC_AGENT_OTLP_CERT_FILE` for certificate-based TLS. Moved protocol/export customization to the OpenTelemetry Collector.
- The OTLP endpoint examples used URL-form endpoints such as `http://otel-collector:4317`. HashiCorp documents `TFC_AGENT_OTLP_ADDRESS` as a `host:port` address. Updated examples to `otel-collector:4317` style addresses.
- The telemetry list promised individual resource create/update/delete spans, provider API calls, state locking, and variable validation. HashiCorp does not document those specific spans. Replaced the list with documented agent trace and metric categories, including plan/apply timing, run metadata, job/status timing, Terraform setup, and runtime/resource metrics.

## Review Notes
The corrected post focuses on self-hosted HCP Terraform / Terraform Enterprise agents. Backend-specific authentication and export settings should be handled in the OpenTelemetry Collector rather than on the Terraform agent.
