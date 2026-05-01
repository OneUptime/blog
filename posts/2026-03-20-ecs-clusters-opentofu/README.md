# How to Create ECS Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Container Orchestration, Fargate, Infrastructure as Code

Description: Learn how to create Amazon ECS clusters with OpenTofu, including container insights, capacity providers, and namespace configuration for Fargate and EC2 launch types.

## Introduction

Amazon ECS clusters are logical groupings of tasks and services. A cluster acts as the namespace for your containerized workloads and can mix Fargate capacity providers with EC2-backed Auto Scaling group capacity providers. Creating clusters with OpenTofu enables consistent cluster configuration across environments and integrates with your infrastructure pipeline.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with ECS and IAM permissions

## Step 1: Create an ECS Cluster with Container Insights

```hcl
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  # Enable Container Insights for detailed monitoring
  setting {
    name  = "containerInsights"
    value = "enabled"  # or "enhanced" / "disabled"
  }

  configuration {
    execute_command_configuration {
      kms_key_id = var.kms_key_arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = {
    Name        = "${var.project_name}-cluster"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/${var.project_name}/exec"
  retention_in_days = 7
  kms_key_id        = var.kms_key_arn
}
```

## Step 2: Configure Fargate Capacity Provider

```hcl
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1       # Minimum tasks placed on FARGATE before weight distribution
    weight            = 1       # Relative weight for FARGATE after the base is satisfied
    capacity_provider = "FARGATE"
  }

  # Optional: add FARGATE_SPOT for cost savings
  # default_capacity_provider_strategy {
  #   weight            = 4     # Roughly 80% of remaining tasks on FARGATE_SPOT
  #   capacity_provider = "FARGATE_SPOT"
  # }
}
```

## Step 3: Service Discovery Namespace

```hcl
# Private DNS namespace for service discovery

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project_name}.local"
  description = "Private DNS namespace for ${var.project_name} services"
  vpc         = var.vpc_id

  tags = {
    Name = "${var.project_name}.local"
  }
}
```

## Step 4: IAM Roles for ECS

```hcl
# ECS task execution role (for pulling images, writing logs)
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional permissions for Secrets Manager and Parameter Store
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "ssm:GetParameters", "kms:Decrypt"]
      Resource = "*"
    }]
  })
}
```

## Step 5: Outputs

```hcl
output "cluster_id" {
  value = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "execution_role_arn" {
  value = aws_iam_role.ecs_execution.arn
}

output "service_discovery_namespace_id" {
  value = aws_service_discovery_private_dns_namespace.main.id
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify cluster
aws ecs describe-clusters --clusters my-project-cluster
```

## Conclusion

ECS clusters are lightweight-their primary purpose is grouping and naming. Container Insights is one of the most useful cluster settings to enable, as it provides CPU, memory, network, and storage metrics for tasks and services in CloudWatch. The `execute_command_configuration` sets cluster-level ECS Exec logging and encryption defaults, but you still enable ECS Exec on the service or task itself. When you use `logging = "OVERRIDE"`, the referenced log group must already exist, and a customer-managed KMS key is only required when you want to encrypt the session channel or CloudWatch log group with your own key.
