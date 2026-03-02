# How to Create Container Logging Configurations in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Container, Logging, ECS, Kubernetes, CloudWatch

Description: Learn how to create container logging configurations in Terraform for centralized log collection, including CloudWatch, Fluentd, and structured logging across platforms.

---

Effective logging is critical for debugging, monitoring, and auditing containerized applications. Without proper logging configuration, container logs are ephemeral and lost when containers stop. Terraform allows you to define logging configurations as code, ensuring every container in every environment has consistent log collection, retention, and routing. This guide covers container logging setup across AWS ECS, Kubernetes, and Azure Container Apps.

In this guide, we will explore how to configure logging drivers, set up log aggregation, manage retention policies, and implement structured logging patterns with Terraform.

## AWS ECS Logging with CloudWatch

### Basic CloudWatch Logs Configuration

```hcl
# CloudWatch Log Group with retention policy
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/my-application"
  retention_in_days = 30

  # Encrypt logs with KMS
  kms_key_id = aws_kms_key.logs.arn

  tags = {
    Application = "my-app"
    Environment = var.environment
  }
}

# KMS key for log encryption
resource "aws_kms_key" "logs" {
  description             = "KMS key for CloudWatch Logs encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS task definition with CloudWatch logging
resource "aws_ecs_task_definition" "app" {
  family                   = "my-application"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${aws_ecr_repository.app.repository_url}:v1.0"

      # CloudWatch Logs driver configuration
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          # Log group name
          "awslogs-group" = aws_cloudwatch_log_group.app.name
          # AWS region for the log group
          "awslogs-region" = var.region
          # Prefix for log stream names (stream = prefix/container/task-id)
          "awslogs-stream-prefix" = "app"
          # Enable multiline log message detection
          "awslogs-multiline-pattern" = "^\\d{4}-\\d{2}-\\d{2}"
          # Create log group automatically if it does not exist
          "awslogs-create-group" = "true"
          # Set datetime format for log timestamps
          "awslogs-datetime-format" = "%Y-%m-%d %H:%M:%S"
        }
      }

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

### FireLens Logging for Advanced Routing

```hcl
# ECS task with FireLens (Fluent Bit) for advanced log routing
resource "aws_ecs_task_definition" "firelens" {
  family                   = "firelens-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      # FireLens log router container
      name      = "log-router"
      image     = "public.ecr.aws/aws-observability/aws-for-fluent-bit:stable"
      essential = true

      firelensConfiguration = {
        type = "fluentbit"
        options = {
          "config-file-type"  = "file"
          "config-file-value" = "/fluent-bit/configs/parse-json.conf"
        }
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.firelens.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "firelens"
        }
      }

      # FireLens container needs minimal resources
      cpu    = 64
      memory = 128
    },
    {
      # Application container using FireLens for logging
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:v1.0"
      essential = true

      # Route logs through FireLens to multiple destinations
      logConfiguration = {
        logDriver = "awsfirelens"
        options = {
          # Send to CloudWatch Logs
          "Name"            = "cloudwatch_logs"
          "region"          = var.region
          "log_group_name"  = aws_cloudwatch_log_group.app.name
          "log_stream_name" = "app-$(ecs_task_id)"
          "auto_create_group" = "true"
        }
        # Additional output - send error logs to a separate destination
        secretOptions = []
      }

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      dependsOn = [
        {
          containerName = "log-router"
          condition     = "START"
        }
      ]
    }
  ])
}

# CloudWatch Log Group for FireLens router logs
resource "aws_cloudwatch_log_group" "firelens" {
  name              = "/ecs/firelens-router"
  retention_in_days = 7
}
```

## Kubernetes Logging Configuration

### Fluent Bit DaemonSet for Log Collection

```hcl
# Fluent Bit DaemonSet for cluster-wide log collection
resource "kubernetes_daemon_set" "fluent_bit" {
  metadata {
    name      = "fluent-bit"
    namespace = "logging"
    labels = {
      app = "fluent-bit"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "fluent-bit"
      }
    }

    template {
      metadata {
        labels = {
          app = "fluent-bit"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.fluent_bit.metadata[0].name

        container {
          name  = "fluent-bit"
          image = "fluent/fluent-bit:2.2"

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }

          # Mount container log directory
          volume_mount {
            name       = "varlog"
            mount_path = "/var/log"
            read_only  = true
          }

          # Mount container runtime log directory
          volume_mount {
            name       = "containers"
            mount_path = "/var/lib/docker/containers"
            read_only  = true
          }

          # Mount Fluent Bit configuration
          volume_mount {
            name       = "config"
            mount_path = "/fluent-bit/etc/"
          }
        }

        # Host log volumes
        volume {
          name = "varlog"
          host_path {
            path = "/var/log"
          }
        }

        volume {
          name = "containers"
          host_path {
            path = "/var/lib/docker/containers"
          }
        }

        volume {
          name = "config"
          config_map {
            name = kubernetes_config_map.fluent_bit_config.metadata[0].name
          }
        }

        # Tolerate all taints to run on every node
        toleration {
          operator = "Exists"
        }
      }
    }
  }
}

# Fluent Bit configuration
resource "kubernetes_config_map" "fluent_bit_config" {
  metadata {
    name      = "fluent-bit-config"
    namespace = "logging"
  }

  data = {
    "fluent-bit.conf" = <<-EOF
      [SERVICE]
          Flush         5
          Daemon        Off
          Log_Level     info
          Parsers_File  parsers.conf

      [INPUT]
          Name              tail
          Tag               kube.*
          Path              /var/log/containers/*.log
          Parser            docker
          DB                /var/log/flb_kube.db
          Mem_Buf_Limit     5MB
          Skip_Long_Lines   On
          Refresh_Interval  10

      [FILTER]
          Name                kubernetes
          Match               kube.*
          Kube_URL            https://kubernetes.default.svc:443
          Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
          Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
          Merge_Log           On
          K8S-Logging.Parser  On
          K8S-Logging.Exclude On

      [OUTPUT]
          Name              es
          Match             *
          Host              elasticsearch.logging.svc
          Port              9200
          Index             kubernetes-logs
          Retry_Limit       5
    EOF

    "parsers.conf" = <<-EOF
      [PARSER]
          Name        docker
          Format      json
          Time_Key    time
          Time_Format %Y-%m-%dT%H:%M:%S.%L
          Time_Keep   On
    EOF
  }
}

# Service account for Fluent Bit
resource "kubernetes_service_account" "fluent_bit" {
  metadata {
    name      = "fluent-bit"
    namespace = "logging"
  }
}

# ClusterRole for Fluent Bit to read pod metadata
resource "kubernetes_cluster_role" "fluent_bit" {
  metadata {
    name = "fluent-bit"
  }

  rule {
    api_groups = [""]
    resources  = ["namespaces", "pods"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_cluster_role_binding" "fluent_bit" {
  metadata {
    name = "fluent-bit"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.fluent_bit.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.fluent_bit.metadata[0].name
    namespace = "logging"
  }
}
```

## Log Retention and Archival

```hcl
# Multiple log groups with different retention periods
locals {
  log_groups = {
    "/ecs/api" = {
      retention = 30
      class     = "STANDARD"
    }
    "/ecs/worker" = {
      retention = 14
      class     = "STANDARD"
    }
    "/ecs/audit" = {
      retention = 365
      class     = "STANDARD"
    }
  }
}

resource "aws_cloudwatch_log_group" "services" {
  for_each          = local.log_groups
  name              = each.key
  retention_in_days = each.value.retention
  log_group_class   = each.value.class

  tags = {
    Service = split("/", each.key)[2]
  }
}

# Export logs to S3 for long-term storage
resource "aws_cloudwatch_log_subscription_filter" "to_kinesis" {
  name            = "audit-log-export"
  log_group_name  = aws_cloudwatch_log_group.services["/ecs/audit"].name
  filter_pattern  = ""
  destination_arn = aws_kinesis_firehose_delivery_stream.log_archive.arn
  role_arn        = aws_iam_role.cloudwatch_to_firehose.arn
}
```

## Monitoring with OneUptime

Logging is one half of observability. OneUptime complements your logging infrastructure by providing real-time monitoring and alerting. When your log pipeline has issues or your application stops generating expected log patterns, OneUptime can detect and alert you. Visit [OneUptime](https://oneuptime.com) for comprehensive monitoring that works alongside your logging setup.

## Conclusion

Container logging configurations in Terraform ensure consistent, reliable log collection across all your services. CloudWatch Logs provides the simplest path for AWS ECS containers, while FireLens enables advanced routing to multiple destinations. For Kubernetes, Fluent Bit DaemonSets provide cluster-wide log collection with rich metadata enrichment. The key principles are centralizing log configuration in Terraform, setting appropriate retention policies to balance cost and compliance, encrypting logs at rest, and structuring logs for easy querying. With these patterns in place, your logging infrastructure is reproducible, auditable, and ready for production.

For more container management, see [How to Handle Container Environment Variables in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-container-environment-variables-in-terraform/view) and [How to Create Container Health Check Configurations in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-health-check-configurations-in-terraform/view).
