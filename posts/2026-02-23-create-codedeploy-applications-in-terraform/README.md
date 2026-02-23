# How to Create CodeDeploy Applications in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CodeDeploy, CI/CD, DevOps, Infrastructure as Code

Description: Learn how to create and manage AWS CodeDeploy applications, deployment groups, and deployment configurations using Terraform for automated application deployments.

---

AWS CodeDeploy is a deployment service that automates application deployments to Amazon EC2 instances, on-premises instances, serverless Lambda functions, and Amazon ECS services. When you pair CodeDeploy with Terraform, you get a repeatable, version-controlled deployment pipeline that you can spin up across multiple environments without clicking through the console.

In this guide, we will walk through creating CodeDeploy applications, deployment groups, and custom deployment configurations entirely in Terraform.

## Prerequisites

Before getting started, make sure you have:

- Terraform 1.0 or later installed
- AWS CLI configured with appropriate credentials
- An existing VPC and EC2 instances (or ECS cluster) to deploy to
- A basic understanding of Terraform HCL syntax

## Setting Up the Provider

Start by configuring the AWS provider in your Terraform configuration.

```hcl
# Configure the AWS provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating the IAM Role for CodeDeploy

CodeDeploy needs an IAM service role to interact with other AWS services on your behalf. This role allows CodeDeploy to read tags on your instances, publish to SNS topics, and perform other deployment-related operations.

```hcl
# IAM role that CodeDeploy assumes during deployments
resource "aws_iam_role" "codedeploy_role" {
  name = "codedeploy-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codedeploy.amazonaws.com"
        }
      }
    ]
  })
}

# Attach the AWS managed policy for CodeDeploy
resource "aws_iam_role_policy_attachment" "codedeploy_policy" {
  role       = aws_iam_role.codedeploy_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRole"
}
```

## Creating a CodeDeploy Application

The application is the top-level container in CodeDeploy. You create one per application you want to deploy.

```hcl
# CodeDeploy application for an EC2/on-premises deployment
resource "aws_codedeploy_app" "my_app" {
  name             = "my-web-application"
  compute_platform = "Server" # Options: Server, Lambda, ECS
}
```

The `compute_platform` parameter determines what kind of targets your application deploys to. Use `Server` for EC2 and on-premises instances, `Lambda` for serverless functions, and `ECS` for container services.

## Creating a Custom Deployment Configuration

While CodeDeploy ships with default configurations like `CodeDeployDefault.OneAtATime` and `CodeDeployDefault.AllAtOnce`, you can create custom ones to control exactly how many instances are updated at a time.

```hcl
# Custom deployment configuration - deploy to 50% of instances at a time
resource "aws_codedeploy_deployment_config" "half_at_a_time" {
  deployment_config_name = "half-at-a-time"
  compute_platform       = "Server"

  minimum_healthy_hosts {
    type  = "FLEET_PERCENT"
    value = 50
  }
}
```

You can also use `HOST_COUNT` instead of `FLEET_PERCENT` if you want to specify an exact number of healthy hosts that must remain available during the deployment.

## Creating a Deployment Group for EC2

A deployment group defines the set of instances that CodeDeploy targets. You identify instances by tags, Auto Scaling groups, or both.

```hcl
# SNS topic for deployment notifications
resource "aws_sns_topic" "deployment_notifications" {
  name = "codedeploy-notifications"
}

# Deployment group targeting EC2 instances by tag
resource "aws_codedeploy_deployment_group" "my_deployment_group" {
  app_name              = aws_codedeploy_app.my_app.name
  deployment_group_name = "production"
  service_role_arn      = aws_iam_role.codedeploy_role.arn
  deployment_config_name = aws_codedeploy_deployment_config.half_at_a_time.deployment_config_name

  # Target instances by tag
  ec2_tag_set {
    ec2_tag_filter {
      key   = "Environment"
      type  = "KEY_AND_VALUE"
      value = "Production"
    }

    ec2_tag_filter {
      key   = "Application"
      type  = "KEY_AND_VALUE"
      value = "MyWebApp"
    }
  }

  # Auto rollback on deployment failure
  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

  # Alarm-based rollback
  alarm_configuration {
    alarms  = ["my-app-high-cpu-alarm"]
    enabled = true
  }

  # Notify on deployment events
  trigger_configuration {
    trigger_events = [
      "DeploymentFailure",
      "DeploymentSuccess",
    ]
    trigger_name       = "deployment-trigger"
    trigger_target_arn = aws_sns_topic.deployment_notifications.arn
  }
}
```

## Deployment Group with Auto Scaling

If your application runs behind an Auto Scaling group, CodeDeploy can automatically deploy to new instances as they launch.

```hcl
# Deployment group that integrates with Auto Scaling
resource "aws_codedeploy_deployment_group" "asg_deployment_group" {
  app_name              = aws_codedeploy_app.my_app.name
  deployment_group_name = "production-asg"
  service_role_arn      = aws_iam_role.codedeploy_role.arn

  # Reference your Auto Scaling group
  autoscaling_groups = [aws_autoscaling_group.web_asg.name]

  # Blue/green deployment style
  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  # Blue/green specific settings
  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    green_fleet_provisioning_option {
      action = "COPY_AUTO_SCALING_GROUP"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  # Load balancer to shift traffic
  load_balancer_info {
    target_group_info {
      name = aws_lb_target_group.web_tg.name
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
}
```

## Creating a Lambda Deployment Group

For Lambda deployments, CodeDeploy supports canary and linear traffic shifting strategies.

```hcl
# CodeDeploy application for Lambda
resource "aws_codedeploy_app" "lambda_app" {
  name             = "my-lambda-application"
  compute_platform = "Lambda"
}

# Lambda deployment config - shift 10% of traffic, then all after 10 minutes
resource "aws_codedeploy_deployment_config" "lambda_canary" {
  deployment_config_name = "lambda-canary-10-percent"
  compute_platform       = "Lambda"

  traffic_routing_config {
    type = "TimeBasedCanary"

    time_based_canary {
      interval   = 10  # minutes
      percentage = 10  # initial traffic percentage
    }
  }
}

# Lambda deployment group
resource "aws_codedeploy_deployment_group" "lambda_dg" {
  app_name              = aws_codedeploy_app.lambda_app.name
  deployment_group_name = "lambda-production"
  service_role_arn      = aws_iam_role.codedeploy_role.arn
  deployment_config_name = aws_codedeploy_deployment_config.lambda_canary.deployment_config_name

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }
}
```

## ECS Deployment Group

For ECS services, CodeDeploy manages blue/green deployments by shifting traffic between task sets.

```hcl
# CodeDeploy application for ECS
resource "aws_codedeploy_app" "ecs_app" {
  name             = "my-ecs-application"
  compute_platform = "ECS"
}

# ECS deployment group
resource "aws_codedeploy_deployment_group" "ecs_dg" {
  app_name              = aws_codedeploy_app.ecs_app.name
  deployment_group_name = "ecs-production"
  service_role_arn      = aws_iam_role.codedeploy_role.arn
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }

  ecs_service {
    cluster_name = aws_ecs_cluster.main.name
    service_name = aws_ecs_service.main.name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [aws_lb_listener.production.arn]
      }

      target_group {
        name = aws_lb_target_group.blue.name
      }

      target_group {
        name = aws_lb_target_group.green.name
      }
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
}
```

## Using Variables for Reusability

To make your configuration reusable across environments, extract values into variables.

```hcl
variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "deployment_style" {
  description = "In-place or blue/green deployment"
  type        = string
  default     = "IN_PLACE"
}

# Use variables in your resources
resource "aws_codedeploy_app" "app" {
  name             = var.app_name
  compute_platform = "Server"
}

resource "aws_codedeploy_deployment_group" "group" {
  app_name              = aws_codedeploy_app.app.name
  deployment_group_name = var.environment
  service_role_arn      = aws_iam_role.codedeploy_role.arn

  deployment_style {
    deployment_option = var.deployment_style == "BLUE_GREEN" ? "WITH_TRAFFIC_CONTROL" : "WITHOUT_TRAFFIC_CONTROL"
    deployment_type   = var.deployment_style
  }

  ec2_tag_set {
    ec2_tag_filter {
      key   = "Environment"
      type  = "KEY_AND_VALUE"
      value = var.environment
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
}
```

## Best Practices

There are a few things worth keeping in mind when managing CodeDeploy with Terraform:

1. **Always enable auto-rollback.** Deployment failures happen, and automatic rollback minimizes downtime.

2. **Use blue/green deployments in production.** In-place deployments are simpler but riskier. Blue/green gives you a clean rollback path.

3. **Tag your instances consistently.** CodeDeploy relies on tags to find deployment targets. Inconsistent tagging leads to missed instances.

4. **Set up deployment notifications.** The SNS trigger configuration keeps your team informed about deployment status.

5. **Use custom deployment configurations.** The defaults work, but tuning the minimum healthy hosts percentage gives you better control over deployment speed vs. safety.

## Wrapping Up

CodeDeploy is a solid deployment automation tool, and managing it through Terraform means you can version control your entire deployment pipeline. From the application definition to deployment groups and custom configurations, everything lives in code. Whether you are deploying to EC2 instances, Lambda functions, or ECS services, the patterns shown here give you a strong foundation to build on.

For more Terraform and AWS guides, check out our post on [creating CloudFormation stacks in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-cloudformation-stacks-in-terraform/view).
