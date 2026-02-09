# How to Configure Terraform Cloud Agent OpenTelemetry Telemetry Export via OTLP Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terraform Cloud, OTLP, Environment Variables, CI/CD

Description: Configure Terraform Cloud agents to export OpenTelemetry telemetry data via OTLP using environment variables for plan and apply monitoring.

Terraform Cloud and Terraform Enterprise run plans and applies in isolated agent environments. Getting observability into these operations helps you track plan durations, detect drift patterns, and monitor provisioning failures. You can configure OTLP export from Terraform Cloud agents using environment variables.

## How It Works

Terraform Cloud agents support OpenTelemetry telemetry export through standard OTEL environment variables. When configured, the agent emits traces for plan and apply operations, giving you visibility into what Terraform is doing and how long each step takes.

## Setting Environment Variables in Terraform Cloud

In your Terraform Cloud workspace, set these environment variables:

```hcl
# workspace-config.tf

resource "tfe_workspace" "app_infra" {
  name         = "app-infrastructure"
  organization = var.tfe_organization
}

# Enable OTLP export from the Terraform Cloud agent
resource "tfe_variable" "otel_exporter" {
  key          = "OTEL_TRACES_EXPORTER"
  value        = "otlp"
  category     = "env"
  workspace_id = tfe_workspace.app_infra.id
}

resource "tfe_variable" "otel_endpoint" {
  key          = "OTEL_EXPORTER_OTLP_ENDPOINT"
  value        = var.otlp_endpoint
  category     = "env"
  workspace_id = tfe_workspace.app_infra.id
}

resource "tfe_variable" "otel_headers" {
  key          = "OTEL_EXPORTER_OTLP_HEADERS"
  value        = "Authorization=Bearer ${var.otlp_api_key}"
  category     = "env"
  workspace_id = tfe_workspace.app_infra.id
  sensitive    = true
}

resource "tfe_variable" "otel_service_name" {
  key          = "OTEL_SERVICE_NAME"
  value        = "terraform-cloud"
  category     = "env"
  workspace_id = tfe_workspace.app_infra.id
}

resource "tfe_variable" "otel_resource_attrs" {
  key          = "OTEL_RESOURCE_ATTRIBUTES"
  value        = "deployment.environment=${var.environment},tf.workspace=${tfe_workspace.app_infra.name}"
  category     = "env"
  workspace_id = tfe_workspace.app_infra.id
}
```

## Configuring Protocol and Compression

```hcl
# Set the OTLP protocol (grpc or http/protobuf)
resource "tfe_variable" "otel_protocol" {
  key          = "OTEL_EXPORTER_OTLP_PROTOCOL"
  value        = "grpc"
  category     = "env"
  workspace_id = tfe_workspace.app_infra.id
}

# Enable compression for lower bandwidth usage
resource "tfe_variable" "otel_compression" {
  key          = "OTEL_EXPORTER_OTLP_COMPRESSION"
  value        = "gzip"
  category     = "env"
  workspace_id = tfe_workspace.app_infra.id
}

# Set export timeout
resource "tfe_variable" "otel_timeout" {
  key          = "OTEL_EXPORTER_OTLP_TIMEOUT"
  value        = "30000"
  category     = "env"
  workspace_id = tfe_workspace.app_infra.id
}
```

## Using a Terraform Module for Multiple Workspaces

If you have many workspaces that all need OTLP export, create a reusable module:

```hcl
# modules/otel-workspace/main.tf

variable "workspace_id" {
  type = string
}

variable "otlp_endpoint" {
  type = string
}

variable "otlp_api_key" {
  type      = string
  sensitive = true
}

variable "environment" {
  type    = string
  default = "production"
}

variable "workspace_name" {
  type = string
}

resource "tfe_variable" "otel_vars" {
  for_each = {
    OTEL_TRACES_EXPORTER           = "otlp"
    OTEL_EXPORTER_OTLP_ENDPOINT    = var.otlp_endpoint
    OTEL_EXPORTER_OTLP_PROTOCOL    = "grpc"
    OTEL_EXPORTER_OTLP_COMPRESSION = "gzip"
    OTEL_SERVICE_NAME              = "terraform-cloud"
    OTEL_RESOURCE_ATTRIBUTES       = "deployment.environment=${var.environment},tf.workspace=${var.workspace_name}"
  }

  key          = each.key
  value        = each.value
  category     = "env"
  workspace_id = var.workspace_id
}

resource "tfe_variable" "otel_headers" {
  key          = "OTEL_EXPORTER_OTLP_HEADERS"
  value        = "Authorization=Bearer ${var.otlp_api_key}"
  category     = "env"
  workspace_id = var.workspace_id
  sensitive    = true
}
```

Then use it:

```hcl
# main.tf

module "otel_workspace_app" {
  source         = "./modules/otel-workspace"
  workspace_id   = tfe_workspace.app_infra.id
  workspace_name = tfe_workspace.app_infra.name
  otlp_endpoint  = var.otlp_endpoint
  otlp_api_key   = var.otlp_api_key
  environment    = "production"
}

module "otel_workspace_network" {
  source         = "./modules/otel-workspace"
  workspace_id   = tfe_workspace.network.id
  workspace_name = tfe_workspace.network.name
  otlp_endpoint  = var.otlp_endpoint
  otlp_api_key   = var.otlp_api_key
  environment    = "production"
}
```

## Self-Hosted Agent Configuration

If you run self-hosted Terraform Cloud agents, you can configure the OTLP environment variables directly in the agent configuration:

```bash
# /etc/tfc-agent/agent.env
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.internal:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_SERVICE_NAME=terraform-agent
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,agent.pool=default
```

For Docker-based agents:

```yaml
# docker-compose.yml
services:
  tfc-agent:
    image: hashicorp/tfc-agent:latest
    environment:
      TFC_AGENT_TOKEN: "${TFC_AGENT_TOKEN}"
      OTEL_TRACES_EXPORTER: "otlp"
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4317"
      OTEL_SERVICE_NAME: "terraform-agent"
```

## What Telemetry You Get

With OTLP export enabled, you get traces for:

- Plan operations with duration and resource counts
- Apply operations with individual resource create/update/delete spans
- Provider initialization and API calls
- State locking and unlocking
- Variable loading and validation

This telemetry lets you build dashboards showing plan duration trends, identify slow providers, and alert on failed applies.

## Sending to a Local Collector

For more control over the telemetry pipeline, point the agent at a local OpenTelemetry Collector:

```
Agent -> OTel Collector -> Backend
```

The Collector can add metadata, sample traces, and route data before it reaches your backend. This is the recommended setup for production since it decouples the agent from the backend and gives you processing flexibility.

Monitoring Terraform operations with OpenTelemetry gives you the same visibility into your infrastructure provisioning that you have into your application code. You can track how long deployments take, which providers are slow, and catch failing operations early.
