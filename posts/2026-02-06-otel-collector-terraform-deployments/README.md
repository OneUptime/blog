# How to Define OpenTelemetry Collector Deployments in Terraform for Reproducible Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terraform, Infrastructure as Code, DevOps

Description: Use Terraform to define and manage OpenTelemetry Collector deployments for consistent, reproducible observability infrastructure.

Managing OpenTelemetry Collector deployments manually across multiple environments is error-prone. Terraform lets you define your Collector infrastructure as code, version it in Git, and apply it consistently across dev, staging, and production. This post shows how to write Terraform modules for Collector deployments on both Kubernetes and AWS ECS.

## Why Terraform for Collector Deployments

When you manage Collectors by hand, configuration drift is inevitable. Production ends up with different settings than staging, and nobody remembers why. Terraform solves this by making your infrastructure declarative: you define what you want, and Terraform figures out how to get there.

## Terraform Module for Kubernetes Collector

Here is a reusable Terraform module that deploys the OpenTelemetry Collector to Kubernetes:

```hcl
# modules/otel-collector/main.tf

variable "namespace" {
  description = "Kubernetes namespace for the Collector"
  type        = string
  default     = "observability"
}

variable "collector_mode" {
  description = "Deployment mode: daemonset or deployment"
  type        = string
  default     = "daemonset"
}

variable "collector_config" {
  description = "Collector configuration YAML"
  type        = string
}

variable "image_tag" {
  description = "Collector image tag"
  type        = string
  default     = "0.96.0"
}

variable "resource_limits" {
  description = "Resource limits for the Collector pods"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "1"
    memory = "2Gi"
  }
}

# Create the namespace
resource "kubernetes_namespace" "observability" {
  metadata {
    name = var.namespace
    labels = {
      "managed-by" = "terraform"
    }
  }
}

# Store the collector config in a ConfigMap
resource "kubernetes_config_map" "collector_config" {
  metadata {
    name      = "otel-collector-config"
    namespace = var.namespace
  }

  data = {
    "config.yaml" = var.collector_config
  }
}

# Deploy as DaemonSet for agent mode
resource "kubernetes_daemon_set_v1" "collector_agent" {
  count = var.collector_mode == "daemonset" ? 1 : 0

  metadata {
    name      = "otel-collector-agent"
    namespace = var.namespace
    labels = {
      app        = "otel-collector"
      mode       = "agent"
      managed-by = "terraform"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "otel-collector-agent"
      }
    }

    template {
      metadata {
        labels = {
          app = "otel-collector-agent"
        }
      }

      spec {
        container {
          name  = "otel-collector"
          image = "otel/opentelemetry-collector-contrib:${var.image_tag}"
          args  = ["--config", "/etc/otel/config.yaml"]

          port {
            container_port = 4317
            name           = "otlp-grpc"
          }

          port {
            container_port = 4318
            name           = "otlp-http"
          }

          resources {
            limits = {
              cpu    = var.resource_limits.cpu
              memory = var.resource_limits.memory
            }
            requests = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          volume_mount {
            name       = "config"
            mount_path = "/etc/otel"
          }
        }

        volume {
          name = "config"
          config_map {
            name = kubernetes_config_map.collector_config.metadata[0].name
          }
        }
      }
    }
  }
}
```

## Using the Module

Call the module from your root Terraform configuration:

```hcl
# main.tf

module "otel_collector_production" {
  source = "./modules/otel-collector"

  namespace      = "observability"
  collector_mode = "daemonset"
  image_tag      = "0.96.0"

  resource_limits = {
    cpu    = "2"
    memory = "4Gi"
  }

  collector_config = file("${path.module}/configs/production-collector.yaml")
}

module "otel_collector_staging" {
  source = "./modules/otel-collector"

  namespace      = "observability-staging"
  collector_mode = "daemonset"
  image_tag      = "0.96.0"

  resource_limits = {
    cpu    = "500m"
    memory = "1Gi"
  }

  collector_config = file("${path.module}/configs/staging-collector.yaml")
}
```

## AWS ECS Collector Module

For teams running on ECS:

```hcl
# modules/otel-collector-ecs/main.tf

resource "aws_ecs_task_definition" "collector" {
  family                   = "otel-collector"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name  = "otel-collector"
      image = "otel/opentelemetry-collector-contrib:${var.image_tag}"
      essential = true
      command = ["--config", "/etc/otel/config.yaml"]

      portMappings = [
        { containerPort = 4317, protocol = "tcp" },
        { containerPort = 4318, protocol = "tcp" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "otel-collector"
        }
      }

      environment = [
        {
          name  = "OTEL_CONFIG"
          value = var.collector_config_base64
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "collector" {
  name            = "otel-collector"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.collector.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.collector.arn
  }
}
```

## Applying Changes

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan -out=tfplan

# Apply the changes
terraform apply tfplan
```

## Wrapping Up

Defining OpenTelemetry Collector deployments in Terraform ensures that your observability infrastructure is as reproducible and auditable as your application infrastructure. Use modules to standardize Collector configurations across environments, and store everything in Git so you have a complete history of every change.
