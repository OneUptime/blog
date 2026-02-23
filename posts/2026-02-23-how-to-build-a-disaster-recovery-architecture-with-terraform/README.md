# How to Build a Disaster Recovery Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Disaster Recovery, High Availability, AWS, Infrastructure Patterns, Business Continuity

Description: Learn how to build a disaster recovery architecture with Terraform covering backup strategies, cross-region replication, automated failover, and RTO/RPO planning.

---

Disasters happen. Entire AWS regions have gone offline, data centers have flooded, and configuration mistakes have taken down production systems. The question is not whether something will go wrong, but how quickly you can recover when it does.

Disaster recovery (DR) planning is about defining your Recovery Time Objective (RTO) and Recovery Point Objective (RPO), then building the infrastructure to meet those targets. Terraform is particularly well suited for DR because your entire infrastructure is defined as code. If a region goes down, you can spin up a replacement in minutes rather than days.

## DR Strategy Tiers

There are four common DR strategies, each with different cost and recovery characteristics:

1. **Backup and Restore**: Cheapest. You back up data and rebuild infrastructure when needed. RTO: hours. RPO: hours.
2. **Pilot Light**: A minimal version of your environment runs in the DR region. RTO: minutes to hours. RPO: minutes.
3. **Warm Standby**: A scaled-down but fully functional copy runs in the DR region. RTO: minutes. RPO: seconds to minutes.
4. **Active-Active**: Full capacity in both regions, serving traffic simultaneously. RTO: near zero. RPO: near zero.

We will focus on the Warm Standby strategy since it offers a good balance of cost and recovery speed.

## Backup Foundation

Regardless of your DR strategy, backups are essential. Start with automated backups using AWS Backup:

```hcl
# AWS Backup vault for centralized backup management
resource "aws_backup_vault" "main" {
  name        = "${var.project_name}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Purpose = "disaster-recovery"
  }
}

# Backup plan with daily and weekly schedules
resource "aws_backup_plan" "main" {
  name = "${var.project_name}-backup-plan"

  # Daily backups retained for 30 days
  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      delete_after = 30
    }

    # Copy to DR region
    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn

      lifecycle {
        delete_after = 30
      }
    }
  }

  # Weekly backups retained for 90 days
  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"

    lifecycle {
      cold_storage_after = 30
      delete_after       = 90
    }
  }
}

# Assign resources to the backup plan
resource "aws_backup_selection" "main" {
  name         = "${var.project_name}-backup-selection"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.main.id

  # Back up everything tagged for DR
  selection_tag {
    type  = "STRINGEQUALS"
    key   = "BackupPolicy"
    value = "daily"
  }
}
```

## Cross-Region Database Replication

For the warm standby approach, the database in the DR region needs to stay in sync with the primary:

```hcl
# Primary RDS instance
resource "aws_db_instance" "primary" {
  provider                    = aws.primary
  identifier                  = "${var.project_name}-primary"
  engine                      = "postgres"
  engine_version              = "15.4"
  instance_class              = "db.r6g.xlarge"
  allocated_storage           = 200
  storage_encrypted           = true
  kms_key_id                  = aws_kms_key.primary_db.arn
  multi_az                    = true
  backup_retention_period     = 7
  db_subnet_group_name        = aws_db_subnet_group.primary.name
  vpc_security_group_ids      = [aws_security_group.primary_db.id]
  performance_insights_enabled = true

  tags = {
    BackupPolicy = "daily"
  }
}

# Cross-region read replica in DR region
resource "aws_db_instance" "dr_replica" {
  provider                = aws.dr
  identifier              = "${var.project_name}-dr-replica"
  replicate_source_db     = aws_db_instance.primary.arn
  instance_class          = "db.r6g.large" # Smaller in standby
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.dr_db.arn
  db_subnet_group_name    = aws_db_subnet_group.dr.name
  vpc_security_group_ids  = [aws_security_group.dr_db.id]

  tags = {
    Role = "dr-replica"
  }
}
```

## DR Region Infrastructure

The warm standby runs a scaled-down version of your application in the DR region:

```hcl
# DR region ECS cluster
resource "aws_ecs_cluster" "dr" {
  provider = aws.dr
  name     = "${var.project_name}-dr-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# DR service runs with fewer tasks than primary
resource "aws_ecs_service" "dr_app" {
  provider        = aws.dr
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.dr.id
  task_definition = aws_ecs_task_definition.dr_app.arn
  desired_count   = 1 # Minimal capacity, scale up during failover
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.dr_vpc.private_subnet_ids
    security_groups  = [aws_security_group.dr_app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.dr_app.arn
    container_name   = "app"
    container_port   = 8080
  }
}
```

## Automated Failover with Route53

Route53 health checks detect when the primary region is down and automatically route traffic to the DR region:

```hcl
resource "aws_route53_health_check" "primary" {
  fqdn              = module.primary_alb.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10

  tags = {
    Name = "primary-region-health"
  }
}

resource "aws_route53_record" "failover_primary" {
  zone_id = var.hosted_zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.primary_alb.dns_name
    zone_id                = module.primary_alb.zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary.id
}

resource "aws_route53_record" "failover_dr" {
  zone_id = var.hosted_zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.dr_alb.dns_name
    zone_id                = module.dr_alb.zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "dr"
}
```

## Scaling Up During Failover

When a failover occurs, you need to scale up the DR region to handle production traffic. Use a Lambda function triggered by a CloudWatch alarm:

```hcl
# Lambda function that scales up DR resources
resource "aws_lambda_function" "failover_scaleup" {
  provider      = aws.dr
  filename      = "failover_scaleup.zip"
  function_name = "${var.project_name}-failover-scaleup"
  role          = aws_iam_role.failover_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.12"

  environment {
    variables = {
      ECS_CLUSTER    = aws_ecs_cluster.dr.name
      ECS_SERVICE    = aws_ecs_service.dr_app.name
      TARGET_COUNT   = "4" # Scale to production capacity
      DB_IDENTIFIER  = aws_db_instance.dr_replica.identifier
      TARGET_DB_CLASS = "db.r6g.xlarge"
    }
  }
}

# Trigger scale-up when primary health check fails
resource "aws_cloudwatch_metric_alarm" "primary_down" {
  provider            = aws.dr
  alarm_name          = "primary-region-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Primary region health check failing"
  alarm_actions       = [aws_sns_topic.failover.arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary.id
  }
}
```

## S3 Cross-Region Replication

Static assets and uploaded files need to be available in the DR region:

```hcl
resource "aws_s3_bucket_replication_configuration" "dr" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary_assets.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "dr-replication"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.dr_assets.arn
      storage_class = "STANDARD"

      # Replicate encrypted objects
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.dr_s3.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}
```

## Testing Your DR Plan

The most important part of DR is testing. Your plan is worthless if you have never actually executed a failover. Schedule quarterly DR drills where you:

1. Trigger a simulated failover
2. Verify all services come up in the DR region
3. Run smoke tests against the DR deployment
4. Measure actual RTO and RPO
5. Document any gaps and fix them

For comprehensive monitoring during failover events, consider building a [monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Wrapping Up

Disaster recovery is insurance for your infrastructure. The warm standby approach we built here keeps a minimal DR environment running at all times, with automated failover when the primary region goes down. Terraform makes this practical because the DR infrastructure is defined in the same codebase as your primary, stays in sync through code reviews, and can be tested regularly. The worst time to figure out your DR plan is during an actual disaster.
