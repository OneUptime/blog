# Validation Summary: How to Configure OpenTelemetry for Azure Container Apps

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Container Apps
- Azure CLI `containerapp` extension
- Azure Container Apps managed OpenTelemetry agent
- OpenTelemetry SDK and OTLP exporters
- OpenTelemetry Collector Contrib
- Dapr
- FastAPI and Python OpenTelemetry instrumentation
- ARM templates

## Sources Consulted
- Microsoft Learn: Collect and read OpenTelemetry data in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/opentelemetry-agents
- Microsoft Learn: `az containerapp env telemetry otlp`: https://learn.microsoft.com/en-us/cli/azure/containerapp/env/telemetry/otlp?view=azure-cli-latest
- Microsoft Learn: Configure Dapr on an existing container app: https://learn.microsoft.com/en-us/azure/container-apps/enable-dapr
- Microsoft Learn: Dapr components in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/dapr-components
- Microsoft Learn: Azure Container Apps ARM and YAML template specifications: https://learn.microsoft.com/en-us/azure/container-apps/azure-resource-manager-api-spec
- OpenTelemetry: OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Python: OTLP exporters: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- Dapr Docs: Configure Dapr to send distributed tracing data: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- The post said the managed agent is available at `localhost:4318` and used `http/protobuf`. Microsoft documentation states Azure Container Apps injects OTLP environment variables and the managed agent supports gRPC. I changed the managed-agent examples to rely on injected settings and use `grpc`.
- The OTLP destination command omitted signal enable flags. The Azure CLI reference shows `--enable-open-telemetry-traces`, `--enable-open-telemetry-metrics`, and `--enable-open-telemetry-logs` default to false. I added `--enable-open-telemetry-traces true`.
- The OTLP destination endpoint used an HTTP trace path. The managed agent exports over gRPC, so I changed the example destination to a gRPC-style endpoint on port 4317.
- The prerequisite Azure CLI version was too low for the telemetry command group. I updated it to require the `containerapp` extension 2.79.0 or later.
- The Python example used the OTLP HTTP exporter. I changed it to the OTLP gRPC exporter to match the managed agent.
- The sidecar YAML mounted a volume that was never defined. I changed the example to use a custom collector image that contains the collector configuration and added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` for the app container.
- The Dapr section used `az containerapp env dapr-component set` with a Dapr `Configuration` object. Azure Container Apps Dapr component YAML is for Dapr components, not Dapr tracing configuration objects. I replaced it with an Azure Container Apps managed environment OpenTelemetry configuration using `includeDapr: true`.
- The Dapr explanation overstated traced operations by including state operations. Dapr tracing documentation specifically calls out service invocation and pub/sub tracing, so I narrowed the statement.
- The comparison table described backend flexibility and managed-agent resource overhead inaccurately. I updated it to reflect Azure Monitor, Datadog, and OTLP destinations and that the managed agent adds no app resource allocation.

## Review Notes
The managed OpenTelemetry agent and related Azure CLI telemetry commands are currently preview features. The sidecar Collector example remains intentionally generic because backend-specific exporters, authentication headers, and collector image packaging vary by deployment.
