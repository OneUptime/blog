# How to Build an Internal Developer Platform with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Internal Developer Platform, IdP, Platform Engineering, DevOps, Self-Service

Description: Learn how to build an internal developer platform using Terraform that provides self-service workflows, standardized environments, and automated infrastructure provisioning.

---

An Internal Developer Platform (IDP) sits between your developers and your infrastructure. It provides a self-service layer where teams can provision environments, deploy applications, and manage resources without needing deep infrastructure knowledge or waiting for ops tickets to be resolved.

The difference between an IDP and just having a bunch of Terraform modules is the workflow. An IDP provides guardrails, templates, and automation that guide developers through the right path while preventing mistakes. In this guide, we will build the infrastructure components of an IDP using Terraform.

## IDP Architecture

An Internal Developer Platform typically has these components:

- **Service catalog**: Templates for creating new services
- **Environment management**: Standardized dev, staging, and production environments
- **Self-service provisioning**: Automated workflows for requesting resources
- **Secrets management**: Centralized, secure secret distribution
- **Observability**: Built-in monitoring and logging for every service

## Environment Management

Each team gets isolated environments that follow the same patterns.

```hcl
# environments.tf - Standardized environment provisioning
locals {
  environments = {
    dev = {
      instance_size = "small"
      replicas      = 1
      db_class      = "db.t3.small"
    }
    staging = {
      instance_size = "medium"
      replicas      = 2
      db_class      = "db.t3.medium"
    }
    production = {
      instance_size = "large"
      replicas      = 3
      db_class      = "db.r6g.large"
    }
  }
}

# Per-team namespace and resource quota
resource "kubernetes_namespace" "team" {
  for_each = var.teams

  metadata {
    name = each.key

    labels = {
      team        = each.key
      managed-by  = "platform"
      environment = var.environment
    }
  }
}

resource "kubernetes_resource_quota" "team" {
  for_each = var.teams

  metadata {
    name      = "team-quota"
    namespace = kubernetes_namespace.team[each.key].metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = each.value.cpu_quota
      "requests.memory" = each.value.memory_quota
      "limits.cpu"      = each.value.cpu_limit
      "limits.memory"   = each.value.memory_limit
      "pods"            = each.value.max_pods
    }
  }
}

# Network policies to isolate team namespaces
resource "kubernetes_network_policy" "team_isolation" {
  for_each = var.teams

  metadata {
    name      = "team-isolation"
    namespace = kubernetes_namespace.team[each.key].metadata[0].name
  }

  spec {
    pod_selector {}

    ingress {
      # Allow traffic from same namespace
      from {
        namespace_selector {
          match_labels = {
            team = each.key
          }
        }
      }
      # Allow traffic from ingress controller
      from {
        namespace_selector {
          match_labels = {
            name = "ingress-nginx"
          }
        }
      }
    }

    egress {
      # Allow DNS
      to {
        namespace_selector {
          match_labels = {
            name = "kube-system"
          }
        }
      }
      ports {
        protocol = "UDP"
        port     = "53"
      }
    }

    egress {
      # Allow external traffic
      to {
        ip_block {
          cidr = "0.0.0.0/0"
          except = [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16"
          ]
        }
      }
    }

    policy_types = ["Ingress", "Egress"]
  }
}
```

## Service Templates

Service templates let developers create new services from standardized patterns. Each template provisions all the infrastructure a service needs.

```hcl
# modules/service-template/main.tf - Standard service template
variable "service_name" {
  type = string
}

variable "team" {
  type = string
}

variable "environment" {
  type = string
}

variable "needs_database" {
  type    = bool
  default = false
}

variable "needs_cache" {
  type    = bool
  default = false
}

variable "needs_queue" {
  type    = bool
  default = false
}

# ECR repository for the service
resource "aws_ecr_repository" "service" {
  name = "${var.team}/${var.service_name}"

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "IMMUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# ECR lifecycle policy - keep last 20 images
resource "aws_ecr_lifecycle_policy" "service" {
  repository = aws_ecr_repository.service.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Optional RDS database
resource "aws_db_instance" "service" {
  count = var.needs_database ? 1 : 0

  identifier = "${var.service_name}-${var.environment}"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = local.environments[var.environment].db_class

  allocated_storage = 20
  storage_encrypted = true

  db_name  = replace(var.service_name, "-", "_")
  username = var.service_name
  password = random_password.db[0].result

  vpc_security_group_ids = [aws_security_group.db[0].id]
  db_subnet_group_name   = var.db_subnet_group_name
  publicly_accessible    = false

  backup_retention_period = var.environment == "production" ? 14 : 3

  tags = {
    Service     = var.service_name
    Team        = var.team
    Environment = var.environment
  }
}

# Optional ElastiCache Redis
resource "aws_elasticache_cluster" "service" {
  count = var.needs_cache ? 1 : 0

  cluster_id           = "${var.service_name}-${var.environment}"
  engine               = "redis"
  node_type            = var.environment == "production" ? "cache.r6g.large" : "cache.t3.small"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"

  security_group_ids = [aws_security_group.cache[0].id]
  subnet_group_name  = var.cache_subnet_group_name

  tags = {
    Service     = var.service_name
    Team        = var.team
    Environment = var.environment
  }
}

# Optional SQS queue
resource "aws_sqs_queue" "service" {
  count = var.needs_queue ? 1 : 0

  name                       = "${var.service_name}-${var.environment}"
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
    maxReceiveCount     = 3
  })

  tags = {
    Service     = var.service_name
    Team        = var.team
    Environment = var.environment
  }
}

resource "aws_sqs_queue" "dlq" {
  count = var.needs_queue ? 1 : 0

  name                      = "${var.service_name}-${var.environment}-dlq"
  message_retention_seconds = 1209600
}
```

## Secrets Management

Every service needs secrets. The IDP provides a standardized way to manage them.

```hcl
# secrets.tf - Centralized secrets management
# Per-service secret in AWS Secrets Manager
resource "aws_secretsmanager_secret" "service" {
  for_each = var.services

  name = "${each.value.team}/${each.key}/${var.environment}"

  tags = {
    Service     = each.key
    Team        = each.value.team
    Environment = var.environment
  }
}

# External Secrets Operator for syncing to Kubernetes
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "0.9.0"
  namespace        = "external-secrets"
  create_namespace = true
}

# Cluster-wide secret store
resource "kubectl_manifest" "cluster_secret_store" {
  yaml_body = yamlencode({
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "ClusterSecretStore"
    metadata = {
      name = "aws-secrets-manager"
    }
    spec = {
      provider = {
        aws = {
          service = "SecretsManager"
          region  = var.aws_region
          auth = {
            jwt = {
              serviceAccountRef = {
                name      = "external-secrets-sa"
                namespace = "external-secrets"
              }
            }
          }
        }
      }
    }
  })

  depends_on = [helm_release.external_secrets]
}
```

## CI/CD Pipeline Integration

The IDP includes CI/CD pipelines that teams get automatically when they create a new service.

```hcl
# cicd.tf - Automated pipeline provisioning
resource "aws_codepipeline" "service" {
  for_each = var.services

  name     = "${each.key}-${var.environment}"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.id
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = "${var.github_org}/${each.key}"
        BranchName       = var.environment == "production" ? "main" : var.environment
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.service[each.key].name
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ClusterName = var.ecs_cluster_name
        ServiceName = each.key
      }
    }
  }

  tags = {
    Service     = each.key
    Team        = each.value.team
    Environment = var.environment
  }
}
```

## Built-In Observability

Every service provisioned through the IDP gets monitoring automatically.

```hcl
# observability.tf - Automatic observability for every service
resource "aws_cloudwatch_log_group" "service" {
  for_each = var.services

  name              = "/platform/${each.value.team}/${each.key}"
  retention_in_days = var.environment == "production" ? 90 : 30

  tags = {
    Service = each.key
    Team    = each.value.team
  }
}

resource "aws_cloudwatch_dashboard" "service" {
  for_each = var.services

  dashboard_name = "${each.key}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", each.key]
          ]
          title  = "${each.key} - CPU"
          period = 300
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ServiceName", each.key]
          ]
          title  = "${each.key} - Memory"
          period = 300
        }
      }
    ]
  })
}
```

## Summary

An Internal Developer Platform built with Terraform provides a structured, self-service way for teams to provision and manage their services. The key elements are standardized environments, reusable service templates with optional components, centralized secrets management, automated CI/CD, and built-in observability.

The goal is to reduce the cognitive load on developers. They should be able to say "I need a service with a database and a message queue" and have the platform provision everything correctly, securely, and consistently.

For monitoring the platform itself and all the services running on it, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can provide a unified view of health and performance across your entire organization.
