# How to Manage OpenTelemetry Collector Configuration as Terraform-Managed ConfigMaps in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terraform, Kubernetes, ConfigMaps, Infrastructure as Code

Description: Manage OpenTelemetry Collector configuration as Terraform-managed Kubernetes ConfigMaps for version-controlled observability infrastructure.

Managing OpenTelemetry Collector configuration through Terraform gives you version control, plan/apply workflows, and the ability to manage Collector config alongside the rest of your Kubernetes infrastructure. Instead of applying ConfigMaps manually with kubectl, you define them in Terraform and let the same pipeline that provisions your cluster also configure your observability.

## The Terraform Kubernetes Provider

```hcl
# providers.tf

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.kube_context
}
```

## Defining the Collector ConfigMap

```hcl
# collector-config.tf

resource "kubernetes_config_map" "otel_collector" {
  metadata {
    name      = "otel-collector-config"
    namespace = var.collector_namespace
    labels = {
      "app.kubernetes.io/name"      = "otel-collector"
      "app.kubernetes.io/component" = "config"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  data = {
    "collector-config.yaml" = templatefile("${path.module}/templates/collector-config.yaml.tpl", {
      otlp_endpoint   = var.otlp_endpoint
      environment     = var.environment
      cluster_name    = var.cluster_name
      sampling_rate   = var.sampling_rate
      batch_timeout   = var.batch_timeout
      batch_size      = var.batch_size
    })
  }
}
```

## Collector Config Template

```hcl
# templates/collector-config.yaml.tpl

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:
    timeout: ${batch_timeout}
    send_batch_size: ${batch_size}

  resource:
    attributes:
      - key: deployment.environment
        value: "${environment}"
        action: upsert
      - key: k8s.cluster.name
        value: "${cluster_name}"
        action: upsert

  probabilistic_sampler:
    sampling_percentage: ${sampling_rate}

exporters:
  otlp:
    endpoint: "${otlp_endpoint}"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, probabilistic_sampler, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Deploying the Collector with the ConfigMap

```hcl
# collector-deployment.tf

resource "kubernetes_deployment" "otel_collector" {
  metadata {
    name      = "otel-collector"
    namespace = var.collector_namespace
    labels = {
      "app.kubernetes.io/name" = "otel-collector"
    }
  }

  spec {
    replicas = var.collector_replicas

    selector {
      match_labels = {
        "app.kubernetes.io/name" = "otel-collector"
      }
    }

    template {
      metadata {
        labels = {
          "app.kubernetes.io/name" = "otel-collector"
        }
        annotations = {
          # Force pod restart when config changes
          "checksum/config" = sha256(kubernetes_config_map.otel_collector.data["collector-config.yaml"])
        }
      }

      spec {
        container {
          name  = "otel-collector"
          image = "otel/opentelemetry-collector-contrib:${var.collector_version}"

          args = ["--config=/etc/otel/collector-config.yaml"]

          port {
            container_port = 4317
            name           = "otlp-grpc"
          }
          port {
            container_port = 4318
            name           = "otlp-http"
          }
          port {
            container_port = 8888
            name           = "metrics"
          }

          volume_mount {
            name       = "config"
            mount_path = "/etc/otel"
            read_only  = true
          }

          resources {
            requests = {
              cpu    = var.collector_cpu_request
              memory = var.collector_memory_request
            }
            limits = {
              cpu    = var.collector_cpu_limit
              memory = var.collector_memory_limit
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 13133
            }
            initial_delay_seconds = 10
            period_seconds        = 10
          }
        }

        volume {
          name = "config"
          config_map {
            name = kubernetes_config_map.otel_collector.metadata[0].name
          }
        }
      }
    }
  }
}
```

## The Service

```hcl
# collector-service.tf

resource "kubernetes_service" "otel_collector" {
  metadata {
    name      = "otel-collector"
    namespace = var.collector_namespace
  }

  spec {
    selector = {
      "app.kubernetes.io/name" = "otel-collector"
    }

    port {
      name        = "otlp-grpc"
      port        = 4317
      target_port = 4317
    }
    port {
      name        = "otlp-http"
      port        = 4318
      target_port = 4318
    }
  }
}
```

## Variables

```hcl
# variables.tf

variable "collector_namespace" {
  description = "Kubernetes namespace for the collector"
  type        = string
  default     = "observability"
}

variable "otlp_endpoint" {
  description = "OTLP backend endpoint"
  type        = string
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
}

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
}

variable "sampling_rate" {
  description = "Trace sampling percentage"
  type        = number
  default     = 100
}

variable "batch_timeout" {
  description = "Batch processor timeout"
  type        = string
  default     = "5s"
}

variable "batch_size" {
  description = "Batch processor send size"
  type        = number
  default     = 512
}

variable "collector_version" {
  description = "OTel Collector image version"
  type        = string
  default     = "0.96.0"
}

variable "collector_replicas" {
  description = "Number of collector replicas"
  type        = number
  default     = 2
}
```

## Automatic Config Reload

The annotation `checksum/config` in the pod template triggers a rolling restart whenever the ConfigMap content changes. This is a standard Terraform pattern that ensures your Collector picks up new configuration.

## Per-Environment Configuration

Use Terraform workspaces or variable files for different environments:

```bash
# Production
terraform apply -var-file=environments/production.tfvars

# Staging
terraform apply -var-file=environments/staging.tfvars
```

```hcl
# environments/production.tfvars
environment        = "production"
cluster_name       = "prod-us-east-1"
sampling_rate      = 10
collector_replicas = 3
batch_size         = 1024
```

```hcl
# environments/staging.tfvars
environment        = "staging"
cluster_name       = "staging-us-east-1"
sampling_rate      = 100
collector_replicas = 1
batch_size         = 256
```

This approach gives you full control over your Collector configuration through the same Terraform workflow you use for everything else. Configuration changes go through pull request review, and you can see exactly what will change with `terraform plan`.
