# How to Build a Disaster Recovery Site with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Disaster Recovery, AWS, High Availability, Business Continuity, Infrastructure as Code

Description: Learn how to build a disaster recovery site using Terraform with cross-region infrastructure, automated failover, data replication, and recovery runbooks.

---

Disaster recovery is not something you want to figure out during an actual disaster. A well-designed DR site, built and tested in advance, can mean the difference between minutes of downtime and hours or days. Terraform is particularly well suited for disaster recovery because you can define your DR infrastructure as code, keep it in sync with your primary site, and spin it up quickly when needed.

In this guide, we will build a disaster recovery site on AWS using Terraform. We will cover different DR strategies, from pilot light to warm standby, and show you how to automate failover.

## DR Strategy Overview

AWS defines four DR strategies with increasing cost and decreasing recovery time:

1. **Backup and Restore**: Cheapest, slowest (hours to recover)
2. **Pilot Light**: Core infrastructure always running, scale up when needed (minutes to recover)
3. **Warm Standby**: Scaled-down version of production always running (minutes to recover)
4. **Multi-Site Active/Active**: Full production in both regions (near-zero downtime)

We will implement a warm standby approach, which provides a good balance of cost and recovery time.

## Multi-Region Provider Configuration

```hcl
# providers.tf - Primary and DR region providers
provider "aws" {
  region = var.primary_region
  alias  = "primary"

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
      DR          = "primary"
    }
  }
}

provider "aws" {
  region = var.dr_region
  alias  = "dr"

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
      DR          = "standby"
    }
  }
}

variable "primary_region" {
  type    = string
  default = "us-east-1"
}

variable "dr_region" {
  type    = string
  default = "us-west-2"
}
```

## DR VPC and Networking

The DR site needs its own VPC with the same network layout as primary.

```hcl
# dr-network.tf - DR site networking
module "dr_vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  providers = {
    aws = aws.dr
  }

  name = "${var.project_name}-dr-vpc"
  cidr = var.dr_vpc_cidr

  azs             = var.dr_availability_zones
  private_subnets = var.dr_private_subnet_cidrs
  public_subnets  = var.dr_public_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = true # Scale up during failover
  enable_dns_hostnames   = true
  enable_dns_support     = true

  tags = {
    Purpose = "DisasterRecovery"
  }
}

# VPC peering between primary and DR for replication traffic
resource "aws_vpc_peering_connection" "primary_to_dr" {
  provider = aws.primary

  vpc_id      = module.primary_vpc.vpc_id
  peer_vpc_id = module.dr_vpc.vpc_id
  peer_region = var.dr_region

  tags = {
    Name = "primary-to-dr-peering"
  }
}

resource "aws_vpc_peering_connection_accepter" "dr" {
  provider = aws.dr

  vpc_peering_connection_id = aws_vpc_peering_connection.primary_to_dr.id
  auto_accept               = true

  tags = {
    Name = "primary-to-dr-peering"
  }
}
```

## Database Replication

The database is usually the most critical component. We will use an Aurora Global Database for cross-region replication with minimal lag.

```hcl
# dr-database.tf - Cross-region database replication
# Primary Aurora cluster (in primary region)
resource "aws_rds_global_cluster" "main" {
  provider = aws.primary

  global_cluster_identifier = "${var.project_name}-global-db"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = var.database_name
  storage_encrypted         = true
}

resource "aws_rds_cluster" "primary" {
  provider = aws.primary

  cluster_identifier        = "${var.project_name}-primary"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version

  master_username = var.db_username
  master_password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.primary_db.id]

  backup_retention_period = 35
  preferred_backup_window = "03:00-04:00"

  tags = {
    Role = "primary"
  }
}

resource "aws_rds_cluster_instance" "primary" {
  provider = aws.primary
  count    = 2

  identifier         = "${var.project_name}-primary-${count.index}"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_global_cluster.main.engine
  engine_version     = aws_rds_global_cluster.main.engine_version
}

# DR Aurora cluster (in DR region) - read replica
resource "aws_rds_cluster" "dr" {
  provider = aws.dr

  cluster_identifier        = "${var.project_name}-dr"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version

  db_subnet_group_name   = aws_db_subnet_group.dr.name
  vpc_security_group_ids = [aws_security_group.dr_db.id]

  # No master credentials needed for secondary cluster

  tags = {
    Role = "dr-standby"
  }
}

resource "aws_rds_cluster_instance" "dr" {
  provider = aws.dr
  count    = 1 # Fewer instances in standby, scale up during failover

  identifier         = "${var.project_name}-dr-${count.index}"
  cluster_identifier = aws_rds_cluster.dr.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_global_cluster.main.engine
  engine_version     = aws_rds_global_cluster.main.engine_version
}
```

## S3 Cross-Region Replication

Replicate critical data to the DR region automatically.

```hcl
# dr-storage.tf - S3 cross-region replication
resource "aws_s3_bucket" "dr_data" {
  provider = aws.dr
  bucket   = "${var.project_name}-data-dr"

  tags = {
    Role = "dr-replica"
  }
}

resource "aws_s3_bucket_versioning" "dr_data" {
  provider = aws.dr
  bucket   = aws_s3_bucket.dr_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Replication configuration on the primary bucket
resource "aws_s3_bucket_replication_configuration" "primary_to_dr" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary_data.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.dr_data.arn
      storage_class = "STANDARD"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.dr.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }

  depends_on = [
    aws_s3_bucket_versioning.primary_data,
    aws_s3_bucket_versioning.dr_data
  ]
}
```

## Warm Standby Application Layer

Keep a scaled-down version of the application running in the DR region.

```hcl
# dr-compute.tf - Warm standby application layer
resource "aws_ecs_cluster" "dr" {
  provider = aws.dr
  name     = "${var.project_name}-dr"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Scaled-down service in DR region
resource "aws_ecs_service" "dr_api" {
  provider        = aws.dr
  name            = "api-dr-standby"
  cluster         = aws_ecs_cluster.dr.id
  task_definition = aws_ecs_task_definition.dr_api.arn
  desired_count   = 1 # Minimal count, scale up during failover
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.dr_vpc.private_subnets
    security_groups = [aws_security_group.dr_api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.dr_api.arn
    container_name   = "api"
    container_port   = 8080
  }

  tags = {
    Role = "dr-standby"
  }
}

# ALB in DR region
resource "aws_lb" "dr" {
  provider           = aws.dr
  name               = "${var.project_name}-dr-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.dr_alb.id]
  subnets            = module.dr_vpc.public_subnets
}
```

## DNS Failover with Route53

Route53 health checks and failover routing automatically switch traffic to the DR site.

```hcl
# dr-dns.tf - Automated DNS failover
# Health check for primary site
resource "aws_route53_health_check" "primary" {
  fqdn              = "primary.${var.domain}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10

  tags = {
    Name = "primary-health-check"
  }
}

# Primary DNS record with failover routing
resource "aws_route53_record" "primary" {
  zone_id = var.route53_zone_id
  name    = var.domain
  type    = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary.id

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

# DR DNS record (secondary)
resource "aws_route53_record" "dr" {
  zone_id = var.route53_zone_id
  name    = var.domain
  type    = "A"

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "dr"

  alias {
    name                   = aws_lb.dr.dns_name
    zone_id                = aws_lb.dr.zone_id
    evaluate_target_health = true
  }
}
```

## Failover Automation

A Lambda function handles the scale-up of DR resources when failover is triggered.

```hcl
# dr-automation.tf - Failover automation
resource "aws_lambda_function" "failover" {
  provider      = aws.dr
  filename      = "failover_handler.zip"
  function_name = "${var.project_name}-failover-handler"
  role          = aws_iam_role.failover.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 300

  environment {
    variables = {
      ECS_CLUSTER    = aws_ecs_cluster.dr.name
      ECS_SERVICE    = aws_ecs_service.dr_api.name
      TARGET_COUNT   = var.production_desired_count
      RDS_CLUSTER_ID = aws_rds_cluster.dr.id
      SNS_TOPIC      = aws_sns_topic.dr_notifications.arn
    }
  }
}

# Trigger failover Lambda when health check fails
resource "aws_cloudwatch_event_rule" "failover_trigger" {
  name = "dr-failover-trigger"

  event_pattern = jsonencode({
    source      = ["aws.route53"]
    detail-type = ["Route 53 Health Check Status Changed"]
    detail = {
      "health-check-id" = [aws_route53_health_check.primary.id]
      "status"          = ["FAILURE"]
    }
  })
}

resource "aws_cloudwatch_event_target" "failover" {
  rule      = aws_cloudwatch_event_rule.failover_trigger.name
  target_id = "failover-lambda"
  arn       = aws_lambda_function.failover.arn
}

# Notification topic for DR events
resource "aws_sns_topic" "dr_notifications" {
  provider = aws.dr
  name     = "${var.project_name}-dr-notifications"
}
```

## Summary

A disaster recovery site built with Terraform ensures you have a tested, reproducible recovery environment ready when you need it. The key components are cross-region database replication (Aurora Global Database), S3 replication for data, a warm standby application layer, and automated DNS failover.

Test your DR setup regularly. Run failover drills at least quarterly to make sure everything works as expected. Terraform makes this easy because you can spin up, test, and tear down DR configurations repeatedly.

For monitoring both your primary and DR sites and getting alerted immediately when failover is triggered, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides multi-region monitoring that can validate your DR site is healthy and ready to take traffic.
