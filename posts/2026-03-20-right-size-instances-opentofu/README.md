# How to Right-Size Instances Using OpenTofu Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cost Optimization, Right-Sizing, EC2, Instance Types, Variable, Infrastructure as Code

Description: Learn how to use OpenTofu variables and locals to implement right-sized instance configurations per environment, making it easy to scale down dev and scale up production.

---

Right-sizing means running the smallest instance that meets your performance requirements. Over-provisioning is common in cloud environments - teams often copy production sizes to dev and staging "just in case." OpenTofu variables make it easy to define environment-appropriate sizes in one place.

## Environment-Based Sizing

```hcl
# locals.tf - single source of truth for sizing

locals {
  instance_sizes = {
    dev = {
      web_instance_type    = "t3.micro"
      api_instance_type    = "t3.small"
      db_instance_class    = "db.t3.micro"
      cache_node_type      = "cache.t3.micro"
      ecs_cpu              = 256
      ecs_memory           = 512
    }
    staging = {
      web_instance_type    = "t3.small"
      api_instance_type    = "t3.medium"
      db_instance_class    = "db.t3.small"
      cache_node_type      = "cache.t3.small"
      ecs_cpu              = 512
      ecs_memory           = 1024
    }
    production = {
      web_instance_type    = "m5.large"
      api_instance_type    = "m5.xlarge"
      db_instance_class    = "db.m5.large"
      cache_node_type      = "cache.m5.large"
      ecs_cpu              = 1024
      ecs_memory           = 2048
    }
  }

  sizes = local.instance_sizes[var.environment]
}
```

## Using Sizing Locals in Resources

```hcl
# ec2.tf
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = local.sizes.web_instance_type

  tags = {
    Name        = "${var.environment}-web"
    Environment = var.environment
  }
}

# rds.tf
resource "aws_db_instance" "main" {
  instance_class              = local.sizes.db_instance_class
  engine                      = "postgres"
  engine_version              = "15"
  username                    = var.db_username
  manage_master_user_password = true
  allocated_storage           = var.environment == "production" ? 100 : 20
  storage_type                = var.environment == "production" ? "gp3" : "gp2"
}

# ecs.tf
resource "aws_ecs_task_definition" "api" {
  family = "${var.environment}-api"
  cpu    = local.sizes.ecs_cpu
  memory = local.sizes.ecs_memory

  container_definitions = jsonencode([{
    name   = "api"
    image  = var.api_image
    cpu    = local.sizes.ecs_cpu
    memory = local.sizes.ecs_memory
  }])
}
```

## Auto-Shutdown for Dev Environments

```hcl
# auto_shutdown.tf - save costs by scaling dev ASGs down outside business hours
resource "aws_autoscaling_schedule" "dev_shutdown" {
  count = var.environment == "dev" ? 1 : 0

  scheduled_action_name  = "dev-nightly-shutdown"
  autoscaling_group_name = aws_autoscaling_group.app.name
  min_size               = 0
  max_size               = 0
  desired_capacity       = 0
  recurrence             = "0 20 * * 1-5"  # 8 PM weekdays (UTC)
}

resource "aws_autoscaling_schedule" "dev_startup" {
  count = var.environment == "dev" ? 1 : 0

  scheduled_action_name  = "dev-morning-startup"
  autoscaling_group_name = aws_autoscaling_group.app.name
  min_size               = 1
  max_size               = 2
  desired_capacity       = 1
  recurrence             = "0 8 * * 1-5"  # 8 AM weekdays (UTC)
}
```

## Using Spot Instances for Dev

```hcl
# Use spot for non-critical environments
resource "aws_launch_template" "app" {
  name_prefix = "${var.environment}-app-"

  dynamic "instance_market_options" {
    for_each = var.environment != "production" ? [1] : []
    content {
      market_type = "spot"
      spot_options {
        instance_interruption_behavior = "terminate"
        max_price                      = var.spot_max_price
      }
    }
  }
}
```

## Comparing Costs with Infracost

```bash
# Compare costs between environments
infracost breakdown \
  --path environments/dev \
  --format json \
  --out-file infracost-dev.json

infracost breakdown \
  --path environments/production \
  --format json \
  --out-file infracost-production.json

infracost diff \
  --path infracost-production.json \
  --compare-to infracost-dev.json \
  --format table
```

## Best Practices

- Define all environment sizing in a single `locals` map - changing sizes in one place propagates to all resources.
- Use `t3.micro` or `t3.small` for dev and staging databases - RDS is often the biggest cost driver in non-production.
- Enable scale-down schedules for dev Auto Scaling groups - an ASG running 12 hours/day instead of 24 cuts EC2 instance-hour costs by about 50%.
- Use spot instances for dev/staging ASGs - Spot Instances can save up to 90% compared to On-Demand pricing, but savings vary by instance type, Region, and Availability Zone.
- Review AWS Compute Optimizer recommendations for supported resources quarterly and update sizing locals based on actual CPU/memory utilization data.
