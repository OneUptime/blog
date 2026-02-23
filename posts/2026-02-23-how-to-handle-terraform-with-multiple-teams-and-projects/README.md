# How to Handle Terraform with Multiple Teams and Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Team Management, DevOps, Infrastructure as Code, Collaboration

Description: Learn how to organize and manage Terraform across multiple teams and projects, covering state isolation, workspace strategies, access control, and collaboration patterns.

---

Scaling Terraform from a single team to multiple teams across different projects is one of the most challenging transitions in infrastructure management. What works for a small team managing one project breaks down when you have dozens of teams, each with their own infrastructure needs, deployment cadences, and skill levels.

In this guide, we will cover the strategies and patterns that make multi-team Terraform adoption successful.

## The Core Challenge

When multiple teams share Terraform infrastructure, several tensions emerge. Teams want autonomy to move fast, but the organization needs consistency. Teams want to own their infrastructure, but resources often have cross-team dependencies. Teams have different skill levels, but everyone needs to produce reliable infrastructure.

Addressing these tensions requires a thoughtful approach to state management, code organization, access control, and shared modules.

## State Isolation Strategy

The most critical decision is how to isolate Terraform state across teams and projects:

```hcl
# Option 1: Separate state files per team and environment
# infrastructure/team-backend/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "team-backend/production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

# Option 2: Terraform Cloud workspaces per team/project
# infrastructure/team-backend/production/backend.tf
terraform {
  cloud {
    organization = "myorg"
    workspaces {
      name = "team-backend-production"
    }
  }
}
```

The key principle is that each team should have their own state files that they can manage independently. Cross-team state sharing should be done through data sources and outputs, not shared state files:

```hcl
# Team A exposes their VPC details through outputs
# team-a/networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

# Team B reads Team A's outputs using remote state
# team-b/application/data.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "myorg-terraform-state"
    key    = "team-a/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the shared data
resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
  # ...
}
```

## Repository Organization

Choose a repository strategy that matches your organization's size and culture:

```
# Monorepo approach (works well for up to ~20 teams)
infrastructure/
  shared/
    networking/          # Shared networking (owned by platform team)
    dns/                 # Shared DNS (owned by platform team)
    iam-baseline/        # Base IAM roles (owned by security team)
  teams/
    backend/
      production/
        main.tf
        variables.tf
      staging/
        main.tf
        variables.tf
    frontend/
      production/
      staging/
    data-engineering/
      production/
      staging/
  modules/
    internal/            # Shared internal modules
      web-service/
      database/
      monitoring/

# Polyrepo approach (better for larger organizations)
# Each team gets their own repo
# terraform-team-backend/
# terraform-team-frontend/
# terraform-team-data/
# terraform-shared-modules/
# terraform-shared-infrastructure/
```

## Access Control and Permissions

Implement granular access control so teams can manage their own infrastructure without affecting others:

```hcl
# iam/team-permissions.tf
# Create IAM roles for each team with scoped permissions

resource "aws_iam_role" "team_terraform" {
  for_each = var.teams

  name = "terraform-${each.key}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = each.value.ci_role_arn
        }
      }
    ]
  })
}

# Each team gets permission only for resources they own
resource "aws_iam_role_policy" "team_terraform" {
  for_each = var.teams

  name = "terraform-${each.key}-policy"
  role = aws_iam_role.team_terraform[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = each.value.allowed_actions
        Resource = [
          # Scope to team-specific resources using tags or naming
          "arn:aws:*:*:*:*/${each.key}-*"
        ]
        Condition = {
          StringEquals = {
            "aws:RequestTag/Team" = each.key
          }
        }
      },
      {
        # Allow reading shared resources
        Effect = "Allow"
        Action = ["ec2:Describe*", "s3:GetObject"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Shared" = "true"
          }
        }
      }
    ]
  })
}
```

## Shared Module Strategy

Create a library of shared modules that teams can use as building blocks:

```hcl
# modules/internal/web-service/main.tf
# Shared module for deploying a web service
# Used by multiple teams for consistent service deployments

variable "service_name" {
  type        = string
  description = "Name of the service"
}

variable "team" {
  type        = string
  description = "Team that owns this service"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

# All resources get consistent tagging
locals {
  common_tags = {
    Service     = var.service_name
    Team        = var.team
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Standard ECS service deployment
resource "aws_ecs_service" "main" {
  name            = "${var.service_name}-${var.environment}"
  cluster         = data.aws_ecs_cluster.shared.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.environment == "production" ? 3 : 1

  network_configuration {
    subnets         = data.terraform_remote_state.networking.outputs.private_subnet_ids
    security_groups = [aws_security_group.service.id]
  }

  tags = local.common_tags
}
```

## Cross-Team Dependency Management

When teams depend on each other's infrastructure, manage these dependencies explicitly:

```hcl
# shared/service-registry/main.tf
# Central service registry that teams can publish to and read from

resource "aws_ssm_parameter" "service_endpoint" {
  for_each = var.service_endpoints

  name  = "/services/${each.key}/endpoint"
  type  = "String"
  value = each.value

  tags = {
    ManagedBy = "terraform"
    Service   = each.key
  }
}

# teams/backend/data.tf
# Read another team's service endpoint
data "aws_ssm_parameter" "auth_service" {
  name = "/services/auth-service/endpoint"
}

# Use in your configuration
resource "aws_ecs_task_definition" "main" {
  # ...
  container_definitions = jsonencode([
    {
      name = "app"
      environment = [
        {
          name  = "AUTH_SERVICE_URL"
          value = data.aws_ssm_parameter.auth_service.value
        }
      ]
    }
  ])
}
```

## CI/CD Pipeline Per Team

Each team should have their own CI/CD pipeline with appropriate permissions:

```yaml
# .github/workflows/team-backend-deploy.yaml
name: Team Backend - Terraform Deploy

on:
  push:
    branches: [main]
    paths: ['teams/backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Use team-specific environment with its own secrets
    environment: team-backend-production

    steps:
      - uses: actions/checkout@v4

      # Assume team-specific IAM role
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-backend
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: teams/backend/production
        run: terraform init

      - name: Terraform Plan
        working-directory: teams/backend/production
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        working-directory: teams/backend/production
        run: terraform apply tfplan
```

## Conflict Resolution

When teams need to modify shared resources, establish clear ownership and change processes:

```yaml
# CODEOWNERS
# Define who owns what in the infrastructure repo

# Platform team owns shared infrastructure
/shared/                    @myorg/platform-team

# Each team owns their directory
/teams/backend/             @myorg/backend-team
/teams/frontend/            @myorg/frontend-team
/teams/data-engineering/    @myorg/data-team

# Shared modules require platform team review
/modules/internal/          @myorg/platform-team

# Security-sensitive resources require security review
**/iam*.tf                  @myorg/security-team
**/security-group*.tf       @myorg/security-team
```

## Monitoring Cross-Team Infrastructure Health

Set up monitoring that gives each team visibility into their infrastructure while providing a global view for platform teams:

```hcl
# monitoring/team-dashboards.tf
# Create per-team monitoring dashboards

resource "aws_cloudwatch_dashboard" "team" {
  for_each = var.teams

  dashboard_name = "terraform-${each.key}"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", "${each.key}-*"]
          ]
          title = "${each.key} - Service CPU"
        }
      }
    ]
  })
}
```

## Best Practices

Establish a clear ownership model. Every piece of infrastructure should have a single team that owns it. When ownership is ambiguous, conflicts and neglect follow.

Invest in shared modules early. The cost of building a good shared module library is far less than the cost of each team building their own versions of common patterns.

Use consistent naming conventions. When teams name resources differently, cross-team collaboration becomes painful. Define naming standards and enforce them.

Create a platform team or community of practice. Someone needs to own the shared infrastructure, maintain modules, and help teams adopt Terraform effectively.

Document cross-team dependencies. When Team A depends on Team B's VPC, both teams need to know about this dependency so that changes can be coordinated.

## Conclusion

Managing Terraform across multiple teams requires intentional design in state isolation, code organization, access control, and dependency management. The goal is to give each team the autonomy to move fast while maintaining the consistency and governance the organization needs. Start with clear boundaries, invest in shared tooling, and establish communication channels between teams to handle the inevitable cross-cutting concerns.
