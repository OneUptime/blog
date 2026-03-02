# How to Implement Zero-Downtime Infrastructure Updates with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Zero Downtime, Blue-Green, Rolling Update, DevOps

Description: Learn how to implement zero-downtime infrastructure updates using Terraform, including blue-green deployments, rolling updates, canary releases, and safe resource replacement strategies.

---

Infrastructure updates should not cause downtime. Users expect services to be available around the clock, and modern deployment practices make this achievable. Terraform provides several mechanisms for updating infrastructure without interrupting service, but they require careful planning and understanding of how Terraform handles resource lifecycle operations.

In this guide, we will explore multiple strategies for achieving zero-downtime infrastructure updates with Terraform.

## Understanding Terraform's Update Behavior

By default, Terraform updates resources in place when possible and destroys then recreates them when in-place updates are not supported. The destroy-then-create pattern is the primary cause of downtime during Terraform updates. Understanding when this happens is the first step to avoiding it.

```hcl
# This change triggers a destroy-and-recreate because
# the AMI change requires a new instance
resource "aws_instance" "web" {
  ami           = "ami-new-version"  # Changed from ami-old-version
  instance_type = "t3.medium"
}

# Solution: Use create_before_destroy lifecycle
resource "aws_instance" "web" {
  ami           = "ami-new-version"
  instance_type = "t3.medium"

  lifecycle {
    create_before_destroy = true
  }
}
```

## Blue-Green Deployments with Terraform

Blue-green deployment runs two identical environments and switches traffic between them:

```hcl
# blue-green/main.tf
# Blue-green deployment using weighted target groups

variable "active_color" {
  description = "Which environment is currently active (blue or green)"
  type        = string
  default     = "blue"
}

# Blue environment
module "blue" {
  source = "./modules/app-environment"

  name         = "app-blue"
  ami_id       = var.blue_ami_id
  instance_count = var.active_color == "blue" ? var.desired_count : var.desired_count
  environment  = "production"
}

# Green environment
module "green" {
  source = "./modules/app-environment"

  name         = "app-green"
  ami_id       = var.green_ami_id
  instance_count = var.active_color == "green" ? var.desired_count : var.desired_count
  environment  = "production"
}

# ALB listener rule with weighted routing
resource "aws_lb_listener_rule" "app" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 100

  action {
    type = "forward"

    forward {
      # Route traffic to the active environment
      target_group {
        arn    = module.blue.target_group_arn
        weight = var.active_color == "blue" ? 100 : 0
      }

      target_group {
        arn    = module.green.target_group_arn
        weight = var.active_color == "green" ? 100 : 0
      }

      stickiness {
        enabled  = true
        duration = 600
      }
    }
  }
}
```

## Rolling Updates with Auto Scaling Groups

Auto Scaling Groups support rolling updates natively:

```hcl
# rolling-update/asg.tf
# Rolling update configuration for ASG

resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  # User data for application configuration
  user_data = base64encode(templatefile("user-data.sh", {
    app_version = var.app_version
  }))

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "app-${aws_launch_template.app.latest_version}"
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity
  vpc_zone_identifier = var.subnet_ids
  health_check_type   = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Rolling update configuration
  instance_refresh {
    strategy = "Rolling"

    preferences {
      # Keep at least 75% of instances healthy during update
      min_healthy_percentage = 75

      # Wait 60 seconds between instance replacements
      instance_warmup = 60

      # Automatically rollback if health check fails
      auto_rollback = true
    }

    triggers = ["launch_template"]
  }

  # Wait for new instances to be healthy before continuing
  wait_for_capacity_timeout = "10m"

  tag {
    key                 = "Name"
    value               = "app-${var.app_version}"
    propagate_at_launch = true
  }
}
```

## Canary Deployments

Route a small percentage of traffic to the new version first:

```hcl
# canary/main.tf
# Canary deployment with gradual traffic shifting

variable "canary_percentage" {
  description = "Percentage of traffic to route to canary"
  type        = number
  default     = 5

  validation {
    condition     = var.canary_percentage >= 0 && var.canary_percentage <= 100
    error_message = "Canary percentage must be between 0 and 100."
  }
}

# Stable version target group
resource "aws_lb_target_group" "stable" {
  name     = "app-stable"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
  }
}

# Canary version target group
resource "aws_lb_target_group" "canary" {
  name     = "app-canary"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
  }
}

# Weighted routing between stable and canary
resource "aws_lb_listener_rule" "canary_routing" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 100

  action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.stable.arn
        weight = 100 - var.canary_percentage
      }

      target_group {
        arn    = aws_lb_target_group.canary.arn
        weight = var.canary_percentage
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Database Updates Without Downtime

Database changes are the trickiest to do without downtime:

```hcl
# database/zero-downtime.tf
# Zero-downtime RDS updates

resource "aws_db_instance" "main" {
  identifier     = "app-production"
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class

  # Apply changes during next maintenance window
  # to avoid immediate disruption
  apply_immediately = false

  # Enable Multi-AZ for automatic failover
  multi_az = true

  # Blue-green deployment for major version upgrades
  blue_green_update {
    enabled = true
  }

  # Prevent accidental deletion
  deletion_protection = true

  # Allow minor version upgrades automatically
  auto_minor_version_upgrade = true

  lifecycle {
    # Prevent terraform from destroying the database
    prevent_destroy = true

    # Ignore changes that are managed by AWS
    ignore_changes = [
      latest_restorable_time
    ]
  }
}
```

## ECS Service Zero-Downtime Deployments

```hcl
# ecs/zero-downtime.tf
# Zero-downtime ECS service deployment

resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3

  # Deployment configuration for zero downtime
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  # Circuit breaker to automatically rollback
  # failed deployments
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Use rolling deployment strategy
  deployment_controller {
    type = "ECS"
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  # Wait for service to stabilize
  wait_for_steady_state = true

  lifecycle {
    # Ignore changes to task definition that are
    # managed by CI/CD pipeline
    ignore_changes = [task_definition]
  }
}
```

## DNS-Based Traffic Switching

Use DNS for gradual traffic migration:

```hcl
# dns/weighted-routing.tf
# DNS-based zero-downtime migration

resource "aws_route53_record" "app_v1" {
  zone_id = var.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.v1.dns_name
    zone_id                = aws_lb.v1.zone_id
    evaluate_target_health = true
  }

  set_identifier = "v1"

  weighted_routing_policy {
    weight = var.v1_weight  # Start at 100, gradually reduce
  }
}

resource "aws_route53_record" "app_v2" {
  zone_id = var.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.v2.dns_name
    zone_id                = aws_lb.v2.zone_id
    evaluate_target_health = true
  }

  set_identifier = "v2"

  weighted_routing_policy {
    weight = var.v2_weight  # Start at 0, gradually increase
  }
}
```

## Safety Mechanisms

Build safety mechanisms into your zero-downtime update process:

```hcl
# safety/checks.tf
# Pre-deployment health checks

# Verify the current environment is healthy before deploying
data "http" "health_check" {
  url = "https://${var.app_domain}/health"

  request_headers = {
    Accept = "application/json"
  }
}

# Fail the plan if the current environment is unhealthy
resource "null_resource" "pre_deploy_check" {
  triggers = {
    health = data.http.health_check.status_code
  }

  lifecycle {
    precondition {
      condition     = data.http.health_check.status_code == 200
      error_message = "Current environment is unhealthy. Do not proceed with deployment."
    }
  }
}
```

## Best Practices

Always use create_before_destroy for critical resources. This ensures the new version is running before the old one is removed.

Implement health checks that verify functionality, not just process status. A running process that returns errors is not healthy.

Use gradual traffic shifting. Whether through weighted target groups, DNS routing, or canary deployments, gradually shifting traffic gives you time to detect issues before they affect all users.

Monitor aggressively during updates. Set up dashboards and alerts specifically for deployment periods. Automated rollback based on error rate thresholds is even better.

Practice updates in staging first. Every zero-downtime update pattern should be tested in a non-production environment before being used in production.

Plan for rollback. Every deployment should have a clear rollback plan that can be executed quickly. Terraform makes this easier when you maintain the previous version's configuration.

## Conclusion

Zero-downtime infrastructure updates with Terraform require understanding Terraform's resource lifecycle, choosing the right deployment strategy for each resource type, and implementing proper safety mechanisms. By combining strategies like blue-green deployments, rolling updates, and canary releases with Terraform's lifecycle management features, you can update infrastructure without disrupting service. The investment in proper zero-downtime patterns pays off in customer trust and operational confidence.
