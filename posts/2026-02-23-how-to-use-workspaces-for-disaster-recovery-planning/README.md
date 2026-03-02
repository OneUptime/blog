# How to Use Workspaces for Disaster Recovery Planning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Disaster Recovery, High Availability, Infrastructure as Code

Description: Learn how to use Terraform workspaces to manage disaster recovery infrastructure across regions and test failover procedures.

---

Disaster recovery planning is one of those areas where Terraform workspaces provide genuine value. You can maintain your primary and DR infrastructure using the same codebase, with workspaces controlling which region and configuration gets deployed. This lets you keep your DR environment in sync with production while adapting it for standby or reduced-capacity operation.

## The DR Workspace Model

The idea is to use workspaces to represent different regions or availability zones within your DR strategy. Your production workspace runs in the primary region, and your DR workspace runs in the secondary region with configuration adjusted for standby mode.

```bash
# Primary region workspace
terraform workspace new primary-us-east-1

# DR region workspace
terraform workspace new dr-us-west-2

# Both use the same Terraform configuration
# but deploy to different regions with different sizing
```

## Configuration for Primary and DR

```hcl
# variables.tf
variable "dr_config" {
  description = "Configuration per DR tier"
  type = map(object({
    region           = string
    instance_type    = string
    instance_count   = number
    db_instance_class = string
    db_multi_az      = bool
    is_standby       = bool
    rds_read_replica = bool
  }))
  default = {
    "primary-us-east-1" = {
      region           = "us-east-1"
      instance_type    = "t3.large"
      instance_count   = 3
      db_instance_class = "db.r5.large"
      db_multi_az      = true
      is_standby       = false
      rds_read_replica = false
    }
    "dr-us-west-2" = {
      region           = "us-west-2"
      instance_type    = "t3.medium"
      instance_count   = 1
      db_instance_class = "db.r5.large"
      db_multi_az      = false
      is_standby       = true
      rds_read_replica = true
    }
  }
}

locals {
  config     = var.dr_config[terraform.workspace]
  is_standby = local.config.is_standby
  name_prefix = "myapp-${terraform.workspace}"

  common_tags = {
    Project     = "myapp"
    Environment = terraform.workspace
    DRTier      = local.is_standby ? "secondary" : "primary"
    ManagedBy   = "terraform"
  }
}

# Configure the provider for the workspace's region
provider "aws" {
  region = local.config.region

  default_tags {
    tags = local.common_tags
  }
}
```

## Network Infrastructure

Both primary and DR need networking, but DR might use a simpler setup in standby mode:

```hcl
# networking.tf
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_subnet" "private" {
  count             = local.is_standby ? 2 : 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${local.name_prefix}-private-${count.index + 1}"
    Tier = "private"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet("10.0.0.0/16", 8, count.index + 100)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${count.index + 1}"
    Tier = "public"
  }
}

# VPC Peering between primary and DR regions
# This is managed from the primary workspace
resource "aws_vpc_peering_connection" "primary_to_dr" {
  count = local.is_standby ? 0 : 1

  vpc_id      = aws_vpc.main.id
  peer_vpc_id = var.dr_vpc_id
  peer_region = "us-west-2"

  tags = {
    Name = "${local.name_prefix}-peering-to-dr"
  }
}
```

## Database Replication

For the database layer, use cross-region read replicas or Aurora Global Database:

```hcl
# database.tf

# Primary database
resource "aws_db_instance" "primary" {
  count = local.is_standby ? 0 : 1

  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = local.config.db_instance_class

  allocated_storage     = 200
  multi_az              = local.config.db_multi_az
  backup_retention_period = 35
  storage_encrypted     = true
  deletion_protection   = true

  # Enable automated backups to the DR region
  backup_target = "region"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  tags = {
    Name   = "${local.name_prefix}-db"
    DRRole = "primary"
  }
}

# DR read replica
resource "aws_db_instance" "replica" {
  count = local.is_standby && local.config.rds_read_replica ? 1 : 0

  identifier     = "${local.name_prefix}-db-replica"
  instance_class = local.config.db_instance_class

  # Reference the primary database
  replicate_source_db = var.primary_db_arn

  storage_encrypted     = true
  deletion_protection   = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  tags = {
    Name   = "${local.name_prefix}-db-replica"
    DRRole = "replica"
  }
}
```

## Application Tier in Standby Mode

The DR application tier runs at reduced capacity until a failover is triggered:

```hcl
# application.tf

resource "aws_lb" "app" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${local.name_prefix}-alb"
  }
}

resource "aws_ecs_cluster" "app" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "app" {
  name            = "${local.name_prefix}-app"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  launch_type     = "FARGATE"

  # Standby runs minimal instances
  desired_count = local.config.instance_count

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }
}
```

## DNS-Based Failover

Use Route 53 health checks and failover routing to handle automatic DNS failover:

```hcl
# dns_failover.tf
# This should be managed from the primary workspace

resource "aws_route53_health_check" "primary" {
  count = local.is_standby ? 0 : 1

  fqdn              = aws_lb.app.dns_name
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 10

  tags = {
    Name = "${local.name_prefix}-health-check"
  }
}

resource "aws_route53_record" "primary" {
  count = local.is_standby ? 0 : 1

  zone_id = var.hosted_zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary[0].id
}

resource "aws_route53_record" "secondary" {
  count = local.is_standby ? 1 : 0

  zone_id = var.hosted_zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "secondary"
}
```

## Failover Procedure

When disaster strikes, you need to scale up the DR environment quickly:

```bash
#!/bin/bash
# failover.sh
# Activates the DR environment to handle production traffic

set -e

echo "DISASTER RECOVERY FAILOVER"
echo "=========================="
echo ""
echo "WARNING: This will scale up the DR environment to production capacity."
read -p "Type 'FAILOVER' to confirm: " confirm

if [ "$confirm" != "FAILOVER" ]; then
  echo "Aborted."
  exit 1
fi

# Switch to the DR workspace
terraform workspace select dr-us-west-2

# Apply with production-level capacity
terraform apply \
  -var="instance_count=3" \
  -var="db_instance_class=db.r5.large" \
  -auto-approve

echo ""
echo "DR environment scaled up."
echo "Verify the application at: $(terraform output -raw app_url)"
echo ""
echo "Next steps:"
echo "1. Verify application health"
echo "2. Promote the database replica to primary"
echo "3. Update DNS if automatic failover has not triggered"
echo "4. Notify stakeholders"
```

## Failback Procedure

After the primary region recovers, you need to fail back:

```bash
#!/bin/bash
# failback.sh
# Returns traffic to the primary region after recovery

set -e

echo "FAILBACK TO PRIMARY"
echo "==================="

# Step 1: Verify primary is healthy
terraform workspace select primary-us-east-1
echo "Checking primary environment..."
terraform plan

# Step 2: Ensure primary database is up to date
echo "Verify database replication is current before proceeding."
read -p "Is the primary database synchronized? (yes/no): " db_sync

if [ "$db_sync" != "yes" ]; then
  echo "Please synchronize the database before failing back."
  exit 1
fi

# Step 3: Scale down DR
terraform workspace select dr-us-west-2
terraform apply \
  -var="instance_count=1" \
  -var="is_standby=true" \
  -auto-approve

echo ""
echo "Failback complete."
echo "Primary region is serving traffic."
echo "DR region is back in standby mode."
```

## Regular DR Testing

The whole point of DR planning is to make sure it works when you need it. Use workspaces to run regular DR drills:

```bash
#!/bin/bash
# dr-drill.sh
# Runs a DR drill by temporarily scaling up the DR environment

set -e

DRILL_DURATION_MINUTES=${1:-60}

echo "Starting DR drill (duration: ${DRILL_DURATION_MINUTES} minutes)"

# Scale up DR
terraform workspace select dr-us-west-2
terraform apply \
  -var="instance_count=3" \
  -var="is_standby=false" \
  -auto-approve

# Record the start time
START_TIME=$(date +%s)
echo "DR environment active at $(date)"

# Run validation tests
echo "Running DR validation tests..."
DR_URL=$(terraform output -raw app_url)

# Health check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DR_URL/health")
echo "Health check: $HTTP_STATUS"

# Response time
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$DR_URL/health")
echo "Response time: ${RESPONSE_TIME}s"

echo ""
echo "DR environment is active. It will be scaled back down in $DRILL_DURATION_MINUTES minutes."
echo "Press Ctrl+C to scale down immediately."

# Wait for the drill duration
sleep $((DRILL_DURATION_MINUTES * 60)) || true

# Scale back down
echo "Scaling DR back to standby..."
terraform apply \
  -var="instance_count=1" \
  -var="is_standby=true" \
  -auto-approve

echo "DR drill complete."
```

## Monitoring DR Readiness

Keep track of your DR environment's health:

```hcl
# monitoring.tf
resource "aws_cloudwatch_metric_alarm" "dr_replica_lag" {
  count = local.is_standby ? 1 : 0

  alarm_name          = "${local.name_prefix}-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 60

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.replica[0].identifier
  }

  alarm_description = "Database replica lag exceeds 60 seconds"
  alarm_actions     = [var.sns_topic_arn]

  tags = local.common_tags
}

# Alert if the DR app becomes unhealthy
resource "aws_cloudwatch_metric_alarm" "dr_health" {
  count = local.is_standby ? 1 : 0

  alarm_name          = "${local.name_prefix}-app-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  dimensions = {
    TargetGroup  = aws_lb_target_group.app.arn_suffix
    LoadBalancer = aws_lb.app.arn_suffix
  }

  alarm_description = "No healthy hosts in DR environment"
  alarm_actions     = [var.sns_topic_arn]

  tags = local.common_tags
}
```

## Summary

Terraform workspaces give you a structured way to manage primary and disaster recovery infrastructure from a single codebase. The workspace controls which region gets deployed, what capacity is provisioned, and whether the environment runs in active or standby mode. Combined with DNS failover, database replication, and regular testing drills, you get a DR setup that is both maintainable and reliable. For more workspace patterns, see our post on [workspace state isolation](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-state-isolation-in-terraform/view).
