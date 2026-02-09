# How to Deploy the OpenTelemetry Collector with Nomad and Integrate Consul Discovery and Vault Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Nomad, Consul, Vault, HashiCorp

Description: Deploy the OpenTelemetry Collector on HashiCorp Nomad with Consul service discovery integration and Vault secret injection.

HashiCorp Nomad is a workload orchestrator that integrates natively with Consul for service discovery and Vault for secret management. Deploying the OpenTelemetry Collector on Nomad lets you leverage these integrations for a fully HashiCorp-native observability pipeline.

## Nomad Job Specification

```hcl
# otel-collector.nomad

job "otel-collector" {
  datacenters = ["dc1"]
  type        = "system"  # Run on every Nomad client node

  group "collector" {
    count = 1

    # Register with Consul for service discovery
    service {
      name = "otel-collector"
      port = "otlp-grpc"

      tags = ["observability", "otel"]

      check {
        type     = "http"
        path     = "/health"
        port     = "health"
        interval = "10s"
        timeout  = "3s"
      }
    }

    service {
      name = "otel-collector-http"
      port = "otlp-http"
      tags = ["observability", "otel"]
    }

    network {
      port "otlp-grpc" {
        static = 4317
      }
      port "otlp-http" {
        static = 4318
      }
      port "health" {
        static = 13133
      }
      port "metrics" {
        static = 8888
      }
    }

    # Pull secrets from Vault
    vault {
      policies = ["otel-collector"]
    }

    task "collector" {
      driver = "docker"

      config {
        image = "otel/opentelemetry-collector-contrib:0.96.0"
        args  = ["--config=/local/collector-config.yaml"]

        ports = ["otlp-grpc", "otlp-http", "health", "metrics"]
      }

      # Render the collector config using Consul Template
      # This enables Vault secret injection and Consul service discovery
      template {
        data = <<-EOF
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:
    timeout: 5s
    send_batch_size: 512
  resource:
    attributes:
      - key: deployment.environment
        value: "{{ env "NOMAD_META_environment" }}"
        action: upsert
      - key: nomad.datacenter
        value: "{{ env "NOMAD_DC" }}"
        action: upsert
      - key: nomad.node.name
        value: "{{ env "attr.unique.hostname" }}"
        action: upsert

exporters:
  otlp:
    endpoint: "{{ range service "observability-backend" }}{{ .Address }}:{{ .Port }}{{ end }}"
    headers:
      {{ with secret "secret/data/otel/backend-auth" }}
      Authorization: "Bearer {{ .Data.data.api_key }}"
      {{ end }}

extensions:
  health_check:
    endpoint: "0.0.0.0:13133"

service:
  extensions: [health_check]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
        EOF

        destination = "local/collector-config.yaml"
        change_mode = "restart"
      }

      resources {
        cpu    = 500
        memory = 256
      }

      meta {
        environment = "production"
      }
    }
  }
}
```

## Key Integration Points

### Consul Service Discovery in Config

The template uses Consul Template syntax to discover the backend endpoint:

```hcl
# Discover the backend service registered in Consul
endpoint: "{{ range service "observability-backend" }}{{ .Address }}:{{ .Port }}{{ end }}"
```

This dynamically resolves the backend address from Consul, so if the backend moves to a different host or port, the Collector config updates automatically.

### Vault Secret Injection

The `vault` stanza in the job spec grants the task access to Vault. The template then uses Vault Template syntax:

```hcl
{{ with secret "secret/data/otel/backend-auth" }}
Authorization: "Bearer {{ .Data.data.api_key }}"
{{ end }}
```

This fetches the API key from Vault at task startup and injects it into the config.

## Vault Policy

Create the Vault policy for the Collector:

```hcl
# otel-collector-policy.hcl
path "secret/data/otel/*" {
  capabilities = ["read"]
}
```

```bash
vault policy write otel-collector otel-collector-policy.hcl
```

## Running as a System Job

Using `type = "system"` deploys the Collector on every Nomad client node. This is similar to a Kubernetes DaemonSet. Every application running on the node can send telemetry to `localhost:4317`.

For a gateway deployment (one or few instances), use `type = "service"` instead:

```hcl
job "otel-collector-gateway" {
  type = "service"

  group "collector" {
    count = 2  # Two instances for high availability
    # ... rest of config
  }
}
```

## Discovering Other Services to Scrape

If you want the Collector to scrape Prometheus metrics from other Nomad services, use Consul Template to build the scrape config:

```hcl
template {
  data = <<-EOF
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "nomad-services"
          static_configs:
{{ range services }}{{ if .Tags | contains "metrics-enabled" }}
            - targets: [{{ range service .Name }}"{{ .Address }}:{{ .Port }}"{{ end }}]
              labels:
                service_name: "{{ .Name }}"
{{ end }}{{ end }}
  EOF

  destination = "local/collector-config.yaml"
  change_mode = "restart"
}
```

This iterates over all Consul services tagged with "metrics-enabled" and adds them as Prometheus scrape targets.

## Health Checks and Restart Policy

Configure the task to restart on failure:

```hcl
restart {
  attempts = 5
  interval = "5m"
  delay    = "15s"
  mode     = "delay"
}
```

The Consul health check on the `/health` endpoint ensures that the Collector is removed from service discovery if it becomes unhealthy.

## Deploying

```bash
# Plan the deployment
nomad job plan otel-collector.nomad

# Run the job
nomad job run otel-collector.nomad

# Check status
nomad job status otel-collector

# Check Consul for the registered service
consul catalog services | grep otel
```

Deploying the OpenTelemetry Collector on Nomad with Consul and Vault integration gives you a production-ready observability pipeline that leverages the HashiCorp ecosystem. Service discovery keeps your config dynamic, Vault keeps your secrets secure, and Nomad handles scheduling and restarts.
