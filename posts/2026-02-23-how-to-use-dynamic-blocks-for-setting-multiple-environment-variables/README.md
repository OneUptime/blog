# How to Use Dynamic Blocks for Setting Multiple Environment Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Environment Variables, AWS, ECS, Lambda, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to set environment variables on Lambda functions, ECS tasks, and other compute resources from maps and lists.

---

Most compute resources - Lambda functions, ECS containers, Kubernetes pods, Elastic Beanstalk environments - need environment variables. When you manage infrastructure with Terraform, you need a clean way to pass these variables from your configuration. Dynamic blocks and maps make this straightforward.

## Lambda Function Environment Variables

Lambda functions take environment variables as a map inside an `environment` block. This is actually one of the simpler cases because the block itself is not repeated - you just need to conditionally include it:

```hcl
variable "lambda_env_vars" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

resource "aws_lambda_function" "main" {
  function_name = "my-function"
  runtime       = "python3.12"
  handler       = "main.handler"
  role          = aws_iam_role.lambda.arn
  filename      = "lambda.zip"

  # Only include the environment block if there are variables to set
  dynamic "environment" {
    for_each = length(var.lambda_env_vars) > 0 ? [1] : []
    content {
      variables = var.lambda_env_vars
    }
  }
}
```

The dynamic block is needed here because AWS Lambda does not allow an empty environment variables map. If you set `environment { variables = {} }`, Terraform will try to create an empty environment block and the API will reject it. The dynamic block approach avoids this.

## Building Environment Variables from Multiple Sources

In practice, Lambda environment variables come from several places: hardcoded values, other resource outputs, and user-provided overrides. Merge them with `merge()`:

```hcl
variable "custom_env_vars" {
  type    = map(string)
  default = {}
}

locals {
  # Base environment variables that every function needs
  base_env = {
    LOG_LEVEL   = var.log_level
    ENVIRONMENT = var.environment
    REGION      = var.aws_region
  }

  # Variables derived from other resources
  infra_env = {
    DB_HOST         = aws_rds_cluster.main.endpoint
    DB_NAME         = aws_rds_cluster.main.database_name
    CACHE_ENDPOINT  = aws_elasticache_cluster.main.cache_nodes[0].address
    QUEUE_URL       = aws_sqs_queue.main.url
    BUCKET_NAME     = aws_s3_bucket.data.id
  }

  # Merge all sources - custom vars override infra vars override base vars
  all_env_vars = merge(
    local.base_env,
    local.infra_env,
    var.custom_env_vars
  )
}

resource "aws_lambda_function" "main" {
  function_name = "my-function"
  runtime       = "python3.12"
  handler       = "main.handler"
  role          = aws_iam_role.lambda.arn
  filename      = "lambda.zip"

  dynamic "environment" {
    for_each = length(local.all_env_vars) > 0 ? [1] : []
    content {
      variables = local.all_env_vars
    }
  }
}
```

## ECS Task Definition Environment Variables

ECS container definitions take environment variables as a list of name/value objects. This is a different shape than Lambda's map:

```hcl
variable "container_env_vars" {
  description = "Environment variables for the ECS container"
  type        = map(string)
  default = {
    NODE_ENV    = "production"
    PORT        = "3000"
    LOG_FORMAT  = "json"
  }
}

# ECS wants a JSON list of {name, value} objects
locals {
  container_environment = [
    for key, value in var.container_env_vars : {
      name  = key
      value = value
    }
  ]
}

resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      # Environment variables as a list
      environment = local.container_environment

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])
}
```

## ECS with Secrets from Parameter Store

ECS also supports pulling secrets from SSM Parameter Store or Secrets Manager. You can manage both environment variables and secrets dynamically:

```hcl
variable "container_secrets" {
  description = "Secrets to inject from SSM Parameter Store"
  type        = map(string)  # name => SSM parameter ARN
  default = {
    DB_PASSWORD = "arn:aws:ssm:us-east-1:123456789:parameter/prod/db-password"
    API_KEY     = "arn:aws:ssm:us-east-1:123456789:parameter/prod/api-key"
  }
}

locals {
  container_secrets_list = [
    for key, arn in var.container_secrets : {
      name      = key
      valueFrom = arn
    }
  ]
}

resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name        = "app"
      image       = "${var.ecr_repository_url}:${var.image_tag}"
      essential   = true
      environment = local.container_environment
      secrets     = local.container_secrets_list  # SSM/Secrets Manager refs

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Elastic Beanstalk Environment Variables

Elastic Beanstalk uses a different pattern - each environment variable is a separate `setting` block:

```hcl
variable "eb_env_vars" {
  description = "Environment variables for Elastic Beanstalk"
  type        = map(string)
  default = {
    RAILS_ENV        = "production"
    SECRET_KEY_BASE  = "change-me-in-real-config"
    DATABASE_URL     = "postgres://..."
  }
}

resource "aws_elastic_beanstalk_environment" "main" {
  name                = "my-app-prod"
  application         = aws_elastic_beanstalk_application.main.name
  solution_stack_name = "64bit Amazon Linux 2023 v4.0.0 running Ruby 3.2"

  # Instance settings
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = "t3.small"
  }

  # Dynamic environment variables - each becomes a separate setting block
  dynamic "setting" {
    for_each = var.eb_env_vars
    content {
      namespace = "aws:elasticbeanstalk:application:environment"
      name      = setting.key
      value     = setting.value
    }
  }
}
```

This is a textbook use of dynamic blocks - each map entry becomes one `setting` block with the `aws:elasticbeanstalk:application:environment` namespace.

## Kubernetes ConfigMap for Environment Variables

If you use the Terraform Kubernetes provider, environment variables can be set through ConfigMaps:

```hcl
variable "app_config" {
  description = "Application configuration as environment variables"
  type        = map(string)
}

resource "kubernetes_config_map" "app" {
  metadata {
    name      = "app-config"
    namespace = var.namespace
  }

  data = var.app_config
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "app"
    namespace = var.namespace
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = var.image

          # Individual env vars from the ConfigMap
          dynamic "env" {
            for_each = var.app_config
            content {
              name = env.key
              value_from {
                config_map_key_ref {
                  name = kubernetes_config_map.app.metadata[0].name
                  key  = env.key
                }
              }
            }
          }

          # Or use env_from to load the entire ConfigMap at once
          env_from {
            config_map_ref {
              name = kubernetes_config_map.app.metadata[0].name
            }
          }
        }
      }
    }
  }
}
```

## Sensitive Environment Variables

Be careful with sensitive values. Mark variables as sensitive to prevent them from appearing in plan output:

```hcl
variable "sensitive_env_vars" {
  description = "Sensitive environment variables"
  type        = map(string)
  sensitive   = true
}

locals {
  all_env_vars = merge(
    var.container_env_vars,
    var.sensitive_env_vars
  )
}
```

Even better, use SSM Parameter Store or Secrets Manager to avoid putting secrets in Terraform state at all.

## Summary

Setting environment variables with dynamic blocks follows a consistent pattern across AWS services: define variables as a map, transform them if needed (Lambda wants a map, ECS wants a list, Beanstalk wants setting blocks), and use dynamic blocks or `for` expressions to generate the right structure. The `merge()` function is your friend for combining variables from different sources. For more on structuring data for dynamic blocks, check out our guide on [simplifying complex dynamic blocks with locals](https://oneuptime.com/blog/post/2026-02-23-how-to-simplify-complex-dynamic-blocks-with-locals/view).
