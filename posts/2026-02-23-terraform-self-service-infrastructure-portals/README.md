# How to Use Terraform with Self-Service Infrastructure Portals

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Self-Service, Platform Engineering, DevOps, Infrastructure as Code, Developer Portal

Description: Learn how to build self-service infrastructure portals that let developers provision pre-approved resources through Terraform without needing to write HCL or understand cloud details.

---

Self-service infrastructure portals let developers provision the resources they need without waiting for a platform team to process tickets. Behind the scenes, these portals use Terraform to create infrastructure that follows organizational standards. Developers fill out a form, select options from a dropdown, and click a button. The portal translates their choices into Terraform variables and triggers a run that provisions everything correctly.

In this guide, we will build a self-service portal architecture that uses Terraform as the provisioning engine. You will learn how to design portal interfaces, create standardized Terraform modules, and connect the two through the Terraform Cloud API.

## The Self-Service Model

The traditional model for infrastructure provisioning looks like this: a developer submits a ticket, a platform engineer reviews it, writes or modifies Terraform code, creates a pull request, gets it reviewed, merges it, and waits for the pipeline to apply. This process can take days.

The self-service model eliminates most of these steps. Platform engineers create standardized Terraform modules with well-defined inputs. The portal presents these inputs as a form. Developers fill out the form, and automation handles the rest.

## Designing Terraform Modules for Self-Service

Self-service modules need to be opinionated. They should have sensible defaults, validate inputs strictly, and produce everything a developer needs without requiring Terraform knowledge.

```hcl
# modules/web-service/variables.tf
# Variables designed for portal consumption

variable "service_name" {
  description = "Name of the web service"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,28}[a-z0-9]$", var.service_name))
    error_message = "Service name must be 4-30 lowercase alphanumeric characters or hyphens."
  }
}

variable "team" {
  description = "Team that owns this service"
  type        = string

  validation {
    condition     = contains(["platform", "backend", "frontend", "data", "ml"], var.team)
    error_message = "Team must be one of: platform, backend, frontend, data, ml."
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "size" {
  description = "Service size tier"
  type        = string
  default     = "small"

  validation {
    condition     = contains(["small", "medium", "large", "xlarge"], var.size)
    error_message = "Size must be small, medium, large, or xlarge."
  }
}

variable "enable_database" {
  description = "Whether to provision a database for this service"
  type        = bool
  default     = false
}

variable "database_engine" {
  description = "Database engine type"
  type        = string
  default     = "postgres"

  validation {
    condition     = contains(["postgres", "mysql", "redis"], var.database_engine)
    error_message = "Database engine must be postgres, mysql, or redis."
  }
}

variable "enable_cdn" {
  description = "Whether to enable CDN for static assets"
  type        = bool
  default     = false
}
```

```hcl
# modules/web-service/main.tf

locals {
  # Map size tiers to concrete resource specifications
  size_map = {
    small  = { instance_type = "t3.small", cpu = 1024, memory = 2048, replicas = 2 }
    medium = { instance_type = "t3.medium", cpu = 2048, memory = 4096, replicas = 3 }
    large  = { instance_type = "t3.large", cpu = 4096, memory = 8192, replicas = 4 }
    xlarge = { instance_type = "t3.xlarge", cpu = 8192, memory = 16384, replicas = 6 }
  }

  spec = local.size_map[var.size]

  standard_tags = {
    Service     = var.service_name
    Team        = var.team
    Environment = var.environment
    ManagedBy   = "terraform-self-service"
    Size        = var.size
  }
}

# ECS Service
resource "aws_ecs_service" "main" {
  name            = var.service_name
  cluster         = data.aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = local.spec.replicas

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = var.service_name
    container_port   = 8080
  }

  tags = local.standard_tags
}

# Task Definition
resource "aws_ecs_task_definition" "main" {
  family                   = var.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = local.spec.cpu
  memory                   = local.spec.memory
  execution_role_arn       = data.aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = "${data.aws_ecr_repository.service.repository_url}:latest"
      cpu       = local.spec.cpu
      memory    = local.spec.memory
      essential = true
      portMappings = [
        { containerPort = 8080, protocol = "tcp" }
      ]
      environment = concat(
        [
          { name = "SERVICE_NAME", value = var.service_name },
          { name = "ENVIRONMENT", value = var.environment }
        ],
        var.enable_database ? [
          { name = "DATABASE_HOST", value = aws_rds_instance.database[0].address }
        ] : []
      )
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = var.service_name
        }
      }
    }
  ])

  tags = local.standard_tags
}

# Optional database
resource "aws_rds_instance" "database" {
  count = var.enable_database ? 1 : 0

  identifier     = "${var.service_name}-db"
  engine         = var.database_engine
  instance_class = var.size == "small" ? "db.t3.small" : "db.t3.medium"
  allocated_storage = 20

  db_name  = replace(var.service_name, "-", "_")
  username = "admin"
  password = random_password.db_password[0].result

  skip_final_snapshot = var.environment != "production"

  tags = local.standard_tags
}

resource "random_password" "db_password" {
  count   = var.enable_database ? 1 : 0
  length  = 32
  special = true
}
```

```hcl
# modules/web-service/outputs.tf
# Outputs that the portal displays to the developer

output "service_url" {
  description = "URL to access the service"
  value       = "https://${var.service_name}.${var.environment}.example.com"
}

output "logs_url" {
  description = "CloudWatch Logs URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#logsV2:log-groups/log-group/${aws_cloudwatch_log_group.service.name}"
}

output "database_endpoint" {
  description = "Database connection endpoint"
  value       = var.enable_database ? aws_rds_instance.database[0].endpoint : "N/A"
  sensitive   = false
}

output "dashboard_url" {
  description = "Monitoring dashboard URL"
  value       = "https://grafana.example.com/d/${var.service_name}"
}
```

## Building the Portal Backend

The portal backend receives form submissions and triggers Terraform Cloud runs.

```python
# portal/app.py - Self-service infrastructure portal backend

from flask import Flask, request, jsonify, render_template
from flask_login import login_required, current_user
import requests
import json

app = Flask(__name__)

TFC_TOKEN = os.environ["TFC_TOKEN"]
TFC_ORG = os.environ["TFC_ORGANIZATION"]
TFC_API = "https://app.terraform.io/api/v2"

# Service catalog defining what developers can provision
SERVICE_CATALOG = {
    "web-service": {
        "name": "Web Service",
        "description": "Containerized web service with load balancer",
        "module": "web-service",
        "fields": [
            {"name": "service_name", "type": "text", "required": True},
            {"name": "team", "type": "select", "options": ["platform", "backend", "frontend", "data", "ml"]},
            {"name": "environment", "type": "select", "options": ["development", "staging", "production"]},
            {"name": "size", "type": "select", "options": ["small", "medium", "large", "xlarge"]},
            {"name": "enable_database", "type": "boolean", "default": False},
            {"name": "database_engine", "type": "select", "options": ["postgres", "mysql", "redis"]},
            {"name": "enable_cdn", "type": "boolean", "default": False}
        ]
    },
    "static-site": {
        "name": "Static Website",
        "description": "S3-hosted static site with CloudFront CDN",
        "module": "static-site",
        "fields": [
            {"name": "site_name", "type": "text", "required": True},
            {"name": "team", "type": "select", "options": ["platform", "backend", "frontend"]},
            {"name": "custom_domain", "type": "text", "required": False}
        ]
    }
}

@app.route("/api/catalog", methods=["GET"])
@login_required
def get_catalog():
    """Return the service catalog."""
    return jsonify(SERVICE_CATALOG)

@app.route("/api/provision", methods=["POST"])
@login_required
def provision_service():
    """Provision a new service from the catalog."""
    data = request.json
    service_type = data.get("service_type")
    variables = data.get("variables", {})

    if service_type not in SERVICE_CATALOG:
        return jsonify({"error": "Unknown service type"}), 400

    catalog_entry = SERVICE_CATALOG[service_type]

    # Validate required fields
    for field in catalog_entry["fields"]:
        if field.get("required") and field["name"] not in variables:
            return jsonify({"error": f"Missing required field: {field['name']}"}), 400

    # Create a Terraform Cloud workspace for this service
    workspace_name = f"{variables['service_name']}-{variables.get('environment', 'dev')}"
    workspace_id = create_workspace(workspace_name, catalog_entry["module"])

    # Set variables on the workspace
    for key, value in variables.items():
        create_variable(workspace_id, key, value)

    # Add metadata variables
    create_variable(workspace_id, "requester", current_user.email)
    create_variable(workspace_id, "provisioned_via", "self-service-portal")

    # Trigger a run
    run_id = trigger_run(workspace_id, f"Provisioned by {current_user.email} via portal")

    return jsonify({
        "workspace": workspace_name,
        "run_id": run_id,
        "status": "provisioning",
        "message": f"Service {variables['service_name']} is being provisioned"
    })

def create_workspace(name, module_name):
    """Create a Terraform Cloud workspace."""
    data = {
        "data": {
            "type": "workspaces",
            "attributes": {
                "name": name,
                "auto-apply": True,
                "working-directory": f"modules/{module_name}",
                "vcs-repo": {
                    "identifier": "company/infrastructure-modules",
                    "branch": "main"
                }
            }
        }
    }
    resp = requests.post(
        f"{TFC_API}/organizations/{TFC_ORG}/workspaces",
        json=data,
        headers={"Authorization": f"Bearer {TFC_TOKEN}", "Content-Type": "application/vnd.api+json"}
    )
    return resp.json()["data"]["id"]

def create_variable(workspace_id, key, value):
    """Set a variable on a workspace."""
    data = {
        "data": {
            "type": "vars",
            "attributes": {
                "key": key,
                "value": str(value) if not isinstance(value, bool) else str(value).lower(),
                "category": "terraform",
                "hcl": isinstance(value, (list, dict))
            }
        }
    }
    requests.post(
        f"{TFC_API}/workspaces/{workspace_id}/vars",
        json=data,
        headers={"Authorization": f"Bearer {TFC_TOKEN}", "Content-Type": "application/vnd.api+json"}
    )

def trigger_run(workspace_id, message):
    """Start a Terraform run."""
    data = {
        "data": {
            "type": "runs",
            "attributes": {"message": message, "auto-apply": True},
            "relationships": {
                "workspace": {"data": {"type": "workspaces", "id": workspace_id}}
            }
        }
    }
    resp = requests.post(
        f"{TFC_API}/runs",
        json=data,
        headers={"Authorization": f"Bearer {TFC_TOKEN}", "Content-Type": "application/vnd.api+json"}
    )
    return resp.json()["data"]["id"]
```

## Adding Approval Workflows for Production

Production provisioning should require approval from a team lead or platform engineer.

```python
@app.route("/api/provision", methods=["POST"])
@login_required
def provision_service():
    """Provision with approval gate for production."""
    data = request.json
    environment = data.get("variables", {}).get("environment", "development")

    if environment == "production":
        # Create a pending approval request
        approval_id = create_approval_request(data, current_user)
        return jsonify({
            "status": "pending_approval",
            "approval_id": approval_id,
            "message": "Production provisioning requires approval"
        })

    # Non-production proceeds immediately
    return do_provision(data, current_user)
```

## Best Practices

Design modules with clear boundaries. Each module in your service catalog should represent a complete, self-contained unit of infrastructure. Developers should not need to provision multiple catalog items to get a working service.

Enforce naming conventions through validation. Use variable validation blocks to ensure all names follow organizational standards.

Set cost guardrails. Limit the maximum size tier available through the portal, or require additional approval for large resource requests.

Provide visibility. After provisioning, show developers where their resources are, how to access logs, and where the monitoring dashboard lives. The portal should be a one-stop shop.

For more on structuring Terraform modules, see our guide on [Terraform Modules for Multiple Environments](https://oneuptime.com/blog/post/2025-12-18-terraform-modules-multiple-environments/view).

## Conclusion

Self-service infrastructure portals powered by Terraform give developers the speed they need without sacrificing the standards your platform team enforces. By creating opinionated modules with well-defined inputs and connecting them to a portal interface, you eliminate the ticket-and-wait cycle while maintaining full control over what gets provisioned and how. The key is investing in high-quality modules that handle all the complexity so developers can focus on building their applications.
