# Validation Summary: How to Configure HCP Terraform Agent Telemetry Export via OpenTelemetry Protocol

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform agents
- Terraform CLI logging
- OpenTelemetry Protocol
- OpenTelemetry Collector Contrib
- OpenTelemetry filelog, OTLP, and hostmetrics receivers
- HCP Terraform agent hooks
- otel-cli
- Docker Compose
- Kubernetes Deployments and ConfigMaps

## Sources Consulted
- HashiCorp Developer: HCP Terraform agent telemetry, https://developer.hashicorp.com/terraform/cloud-docs/agents/telemetry
- HashiCorp Developer: Install and run HCP Terraform agents, https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HashiCorp Developer: HCP Terraform agent hooks, https://developer.hashicorp.com/terraform/cloud-docs/agents/hooks
- HashiCorp Developer: HCP Terraform agent metrics, https://developer.hashicorp.com/terraform/cloud-docs/agents/metrics
- HashiCorp Developer: HCP Terraform agent tracing, https://developer.hashicorp.com/terraform/cloud-docs/agents/tracing
- HashiCorp Developer: Terraform run environment variables, https://developer.hashicorp.com/terraform/enterprise/run/run-environment
- HashiCorp Developer: Terraform debug logging, https://developer.hashicorp.com/terraform/internals/debugging
- OpenTelemetry Collector Contrib filelog receiver README, https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib hostmetrics receiver README, https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- equinix-labs otel-cli README, https://github.com/equinix-labs/otel-cli

## Issues Found
- The post configured native HCP Terraform agent telemetry with `OTEL_EXPORTER_OTLP_ENDPOINT`, but HashiCorp documents the agent-specific `TFC_AGENT_OTLP_ADDRESS` / `-otlp-address` setting for OTLP gRPC telemetry. Updated Docker Compose and Kubernetes examples to use `TFC_AGENT_OTLP_ADDRESS` with host:port values.
- The Docker and Kubernetes hook paths used `/opt/tfc-agent/hooks` and filenames such as `pre-plan.sh`, but HCP Terraform agent hooks must live under the agent data directory's `hooks` subdirectory and be named `terraform-${HOOK}`. Updated examples to use `/home/tfc-agent/.tfc-agent/hooks/terraform-pre-apply` and `terraform-post-apply`, with `TFC_AGENT_DATA_DIR` set explicitly.
- The hook list omitted `post-plan`. Updated the text to include all supported HCP Terraform agent hooks: `pre-plan`, `post-plan`, `pre-apply`, and `post-apply`.
- The hook example used `otel-cli --status`, but current `otel-cli` documents `--status-code`. The final version avoids the status flag because the example depended on undocumented `TFC_RUN_STATUS`.
- The hook example read `TFC_RUN_STATUS`, which is not listed in HashiCorp's documented run environment variables. Removed that dependency and kept documented variables such as `TFC_RUN_ID` and `TFC_WORKSPACE_NAME`.
- The log parser used `attributes.timestamp` and `attributes.level`, but Terraform JSON logs use `@timestamp` and `@level` fields. Updated the filelog parser to read those fields.
- The post claimed visibility into queue wait time and a complete queue-to-apply picture. Adjusted the language to match documented agent telemetry, which covers agent job fetching, run handling, metrics, traces, and logs rather than HCP Terraform queue duration.

## Review Notes
The Collector configuration snippet was validated with `otel/opentelemetry-collector-contrib:latest validate`. Shell snippets passed `bash -n`. Terraform JSON logging is documented by HashiCorp as a debugging interface whose JSON format is not stable, so production log parsing should be monitored when Terraform versions change.
