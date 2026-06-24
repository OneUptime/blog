# How to Configure Terraform Cloud Agent OpenTelemetry Telemetry Export via OTLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terraform Cloud, OTLP, Environment Variable, CI/CD

Description: Configure Terraform Cloud agents to export OpenTelemetry telemetry data via OTLP using environment variables for plan and apply monitoring.

Terraform Cloud and Terraform Enterprise agents run plans and applies in isolated agent environments. Getting observability into these operations helps you track plan durations, detect drift patterns, and monitor provisioning failures. You can configure OTLP export from Terraform Cloud agents using agent environment variables.

## How It Works

Terraform Cloud agents support OpenTelemetry telemetry export through the `TFC_AGENT_OTLP_ADDRESS` environment variable or the `-otlp-address` flag. When configured, the agent emits traces and metrics for plan and apply operations to an OpenTelemetry Collector over OTLP/gRPC, giving you visibility into what Terraform is doing and how long each step takes.

## Setting Agent Environment Variables

In the environment where your `tfc-agent` process runs, set these environment variables:

```bash
# /etc/tfc-agent/agent.env
TFC_AGENT_TOKEN=your-agent-token
TFC_AGENT_OTLP_ADDRESS=otel-collector.internal:4317
```

If you need TLS for the agent-to-collector connection, provide a client certificate file:

```bash
TFC_AGENT_OTLP_CERT_FILE=/etc/tfc-agent/otel-client.crt
```

## Configuring Collector Export

The Terraform Cloud agent currently connects to a gRPC OTLP receiver. Configure protocol, compression, authentication headers, sampling, and routing in the OpenTelemetry Collector that receives data from the agent, then exports it to your backend.

```yaml
# collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlp:
    endpoint: observability-backend.example.com:4317
    headers:
      authorization: "Bearer ${env:OTLP_API_KEY}"
    compression: gzip

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      exporters: [otlp]
```

## Self-Hosted Agent Configuration

If you run self-hosted Terraform Cloud agents, you can configure the OTLP environment variables directly in the agent configuration:

```bash
# /etc/tfc-agent/agent.env
TFC_AGENT_TOKEN=your-agent-token
TFC_AGENT_OTLP_ADDRESS=otel-collector.internal:4317
```

For Docker-based agents:

```yaml
# docker-compose.yml
services:
  tfc-agent:
    image: hashicorp/tfc-agent:latest
    environment:
      TFC_AGENT_TOKEN: "${TFC_AGENT_TOKEN}"
      TFC_AGENT_OTLP_ADDRESS: "otel-collector:4317"
```

## What Telemetry You Get

With OTLP export enabled, you get traces and metrics for:

- Plan and apply execution duration
- Terraform run metadata such as resource additions, changes, and destructions
- Agent registration, job fetch, and status update timing
- Terraform setup, init, plan, apply, and output upload timing
- Agent runtime and system resource metrics while the agent is busy

This telemetry lets you build dashboards showing plan duration trends, understand agent behavior, and alert on failed or slow runs.

## Sending to a Local Collector

For more control over the telemetry pipeline, point the agent at a local OpenTelemetry Collector:

```text
Agent -> OTel Collector -> Backend
```

The Collector can add metadata, sample traces, and route data before it reaches your backend. This is the recommended setup for production since it decouples the agent from the backend and gives you processing flexibility.

Monitoring Terraform operations with OpenTelemetry gives you the same visibility into your infrastructure provisioning that you have into your application code. You can track how long deployments take, which agent stages are slow, and catch failing operations early.
