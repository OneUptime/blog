# How to Use Terraform for Multi-Region Active-Active Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Multi-Region, Active-Active, High Availability, DevOps

Description: Learn how to use Terraform to deploy active-active infrastructure across multiple regions, including global load balancing, database replication, state management, and failover strategies.

---

Active-active multi-region deployments serve traffic from multiple regions simultaneously, providing the lowest latency for users and the highest availability for your application. Building this with Terraform requires careful provider configuration, state management, and resource orchestration across regions.

In this guide, we will cover how to implement active-active multi-region infrastructure with Terraform.

## Multi-Region Provider Configuration

```hcl
# providers.tf
# Configure providers for each region

provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}
```

## Per-Region Infrastructure Module

```hcl
# modules/regional-deployment/main.tf
# Deploy application stack in a single region

variable "region" {
  type = string
}

variable "environment" {
  type = string
}

module "vpc" {
  source = "../networking"

  cidr_block  = var.vpc_cidr
  environment = var.environment
  region      = var.region
}

resource "aws_ecs_cluster" "main" {
  name = "app-${var.environment}-${var.region}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "app" {
  name            = "app-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }
}

resource "aws_lb" "main" {
  name               = "app-${var.region}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}
```

## Deploying Across Regions

```hcl
# production/main.tf
# Deploy to multiple regions

module "us_east" {
  source = "../modules/regional-deployment"

  providers = {
    aws = aws.us_east
  }

  region        = "us-east-1"
  environment   = "production"
  vpc_cidr      = "10.1.0.0/16"
  desired_count = 3
}

module "us_west" {
  source = "../modules/regional-deployment"

  providers = {
    aws = aws.us_west
  }

  region        = "us-west-2"
  environment   = "production"
  vpc_cidr      = "10.2.0.0/16"
  desired_count = 3
}

module "eu_west" {
  source = "../modules/regional-deployment"

  providers = {
    aws = aws.eu_west
  }

  region        = "eu-west-1"
  environment   = "production"
  vpc_cidr      = "10.3.0.0/16"
  desired_count = 3
}
```

## Global Load Balancing with Route 53

```hcl
# production/global-routing.tf
# Route 53 latency-based routing for global traffic distribution

resource "aws_route53_record" "us_east" {
  zone_id = var.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = module.us_east.alb_dns_name
    zone_id                = module.us_east.alb_zone_id
    evaluate_target_health = true
  }

  set_identifier = "us-east-1"
  latency_routing_policy {
    region = "us-east-1"
  }
}

resource "aws_route53_record" "us_west" {
  zone_id = var.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = module.us_west.alb_dns_name
    zone_id                = module.us_west.alb_zone_id
    evaluate_target_health = true
  }

  set_identifier = "us-west-2"
  latency_routing_policy {
    region = "us-west-2"
  }
}

resource "aws_route53_record" "eu_west" {
  zone_id = var.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = module.eu_west.alb_dns_name
    zone_id                = module.eu_west.alb_zone_id
    evaluate_target_health = true
  }

  set_identifier = "eu-west-1"
  latency_routing_policy {
    region = "eu-west-1"
  }
}

# Health checks for automatic failover
resource "aws_route53_health_check" "us_east" {
  fqdn              = module.us_east.alb_dns_name
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30
}
```

## Global Database with Aurora Global

```hcl
# production/global-database.tf
# Aurora Global Database for multi-region data

resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "app-global"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = "app"
  storage_encrypted         = true
}

# Primary cluster in us-east-1
resource "aws_rds_cluster" "primary" {
  provider = aws.us_east

  cluster_identifier        = "app-primary"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  master_username           = var.db_username
  master_password           = var.db_password
  database_name             = "app"

  db_subnet_group_name   = module.us_east.database_subnet_group
  vpc_security_group_ids = [module.us_east.database_sg_id]
}

# Secondary cluster in eu-west-1 (read replica)
resource "aws_rds_cluster" "secondary" {
  provider = aws.eu_west

  cluster_identifier        = "app-secondary"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  global_cluster_identifier = aws_rds_global_cluster.main.id

  db_subnet_group_name   = module.eu_west.database_subnet_group
  vpc_security_group_ids = [module.eu_west.database_sg_id]

  depends_on = [aws_rds_cluster.primary]
}
```

## Cross-Region Monitoring

Monitor the health of each region and the overall deployment:

```hcl
# production/monitoring.tf
# Cross-region monitoring for active-active deployment

resource "aws_cloudwatch_metric_alarm" "regional_health" {
  for_each = toset(["us_east", "us_west", "eu_west"])

  alarm_name          = "regional-health-${each.key}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "No healthy hosts in ${each.key} region"

  alarm_actions = [aws_sns_topic.global_alerts.arn]

  dimensions = {
    TargetGroup  = module[each.key].target_group_arn_suffix
    LoadBalancer = module[each.key].alb_arn_suffix
  }
}

# Dashboard showing all regions at a glance
resource "aws_cloudwatch_dashboard" "global" {
  dashboard_name = "global-deployment-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", module.us_east.alb_arn_suffix],
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", module.us_west.alb_arn_suffix],
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", module.eu_west.alb_arn_suffix]
          ]
          title  = "Requests by Region"
          period = 300
        }
      }
    ]
  })
}
```

## Best Practices

Use latency-based routing to direct users to the nearest region automatically. Route 53 latency-based routing measures latency from the user's DNS resolver to each region and routes to the lowest latency option.

Implement health checks on every regional endpoint so Route 53 can route around failures. Health checks should verify application functionality, not just that the load balancer is responding.

Test failover regularly by deliberately taking down one region to verify the others handle the traffic. Schedule quarterly chaos engineering exercises to validate your multi-region resilience.

Keep regional deployments independent. Each region should be able to serve traffic even if other regions are unavailable. Avoid cross-region dependencies in the request path.

Use global databases for data consistency, but design your application to handle read-after-write eventual consistency. Aurora Global Database provides sub-second replication lag, but applications should be designed to tolerate temporary inconsistencies.

Monitor per-region metrics independently and as a whole. A problem in one region might not be visible in aggregated global metrics. Track latency, error rates, and throughput for each region separately.

## Conclusion

Multi-region active-active deployments with Terraform provide the highest levels of availability and the best user experience through geographic proximity. By using regional modules, global load balancing with Route 53, global databases with Aurora, and comprehensive cross-region monitoring, you can build infrastructure that serves traffic from multiple regions simultaneously while handling regional failures gracefully. The investment in multi-region architecture pays off in improved user experience and business continuity.
