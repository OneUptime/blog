# How to Handle Terraform Enterprise High Availability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, High Availability, HA, Resilience, Architecture

Description: A guide to deploying Terraform Enterprise in a high availability configuration, covering architecture patterns, failover strategies, and production-ready HA deployment steps.

---

A single Terraform Enterprise instance is a single point of failure. When it goes down, nobody can run Terraform plans, applies are blocked, and CI/CD pipelines that depend on TFE start failing. For organizations where TFE is a critical path for deployments, high availability is essential. TFE's HA architecture distributes the workload across multiple nodes so that losing one node does not take down the entire system.

This guide covers the architecture, prerequisites, deployment steps, and operational considerations for running TFE in high availability mode.

## HA Architecture Overview

TFE high availability runs multiple TFE application nodes behind a load balancer, all sharing the same external services:

```text
                    Load Balancer (ALB/NLB)
                    /         |         \
                   /          |          \
               TFE-1       TFE-2       TFE-3
                  \          |          /
                   \         |         /
              +-----+-------+-------+-----+
              |     |       |       |     |
           Postgres Redis  S3/Blob  Vault DNS
           (RDS)   (ElastiCache)         (Route53)
```

All TFE nodes are identical and stateless. The state lives entirely in the external services. Any node can handle any request. If one node fails, the load balancer routes traffic to the healthy nodes.

## Prerequisites for HA

HA mode requires all external services - there is no option for embedded databases in HA:

- **External PostgreSQL**: RDS, Aurora, Azure Database for PostgreSQL, or self-managed with replication
- **External Redis**: ElastiCache, Azure Cache for Redis, or self-managed Redis Sentinel/Cluster
- **External Object Storage**: S3, Azure Blob, or GCS
- **Load Balancer**: ALB, NLB, Azure Load Balancer, or similar
- **Shared TLS certificates**: All nodes use the same certificates
- **DNS**: A single hostname that resolves to the load balancer

## Step 1: Set Up External PostgreSQL with HA

```hcl
# AWS RDS Aurora PostgreSQL for TFE HA
resource "aws_rds_cluster" "tfe" {
  cluster_identifier      = "tfe-postgres"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "tfe"
  master_username         = "tfe_admin"
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.tfe.name
  vpc_security_group_ids  = [aws_security_group.tfe_rds.id]
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.tfe.arn
  backup_retention_period = 14
  preferred_backup_window = "03:00-04:00"

  # Multi-AZ for high availability
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Primary writer instance
resource "aws_rds_cluster_instance" "tfe_primary" {
  identifier           = "tfe-postgres-primary"
  cluster_identifier   = aws_rds_cluster.tfe.id
  instance_class       = "db.r6g.xlarge"
  engine               = aws_rds_cluster.tfe.engine
  engine_version       = aws_rds_cluster.tfe.engine_version
  db_subnet_group_name = aws_db_subnet_group.tfe.name
}

# Reader instance for failover
resource "aws_rds_cluster_instance" "tfe_reader" {
  identifier           = "tfe-postgres-reader"
  cluster_identifier   = aws_rds_cluster.tfe.id
  instance_class       = "db.r6g.large"
  engine               = aws_rds_cluster.tfe.engine
  engine_version       = aws_rds_cluster.tfe.engine_version
  db_subnet_group_name = aws_db_subnet_group.tfe.name
}
```

## Step 2: Set Up Redis with HA

```hcl
# ElastiCache Redis with automatic failover
resource "aws_elasticache_replication_group" "tfe" {
  replication_group_id = "tfe-redis"
  description          = "Redis for TFE HA"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2  # Primary + 1 replica
  port                 = 6379

  # HA settings
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Security
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  subnet_group_name  = aws_elasticache_subnet_group.tfe.name
  security_group_ids = [aws_security_group.tfe_redis.id]

  # Maintenance window
  maintenance_window = "sun:05:00-sun:06:00"
}
```

## Step 3: Configure the Load Balancer

```hcl
# Application Load Balancer for TFE HA
resource "aws_lb" "tfe" {
  name               = "tfe-ha-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.tfe_alb.id]
  subnets            = var.private_subnets

  enable_deletion_protection = true
  enable_http2               = true
}

resource "aws_lb_target_group" "tfe" {
  name     = "tfe-ha-targets"
  port     = 443
  protocol = "HTTPS"
  vpc_id   = var.vpc_id

  # Session stickiness for consistent user experience
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  health_check {
    path                = "/_health_check"
    port                = 443
    protocol            = "HTTPS"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    timeout             = 10
    matcher             = "200"
  }

  # Slow start to give new nodes time to warm up
  slow_start = 60
}

resource "aws_lb_listener" "tfe_https" {
  load_balancer_arn = aws_lb.tfe.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.tfe.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tfe.arn
  }
}

# HTTP to HTTPS redirect
resource "aws_lb_listener" "tfe_http_redirect" {
  load_balancer_arn = aws_lb.tfe.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

## Step 4: Deploy Multiple TFE Nodes

### Using an Auto Scaling Group

```hcl
# Launch template for TFE nodes
resource "aws_launch_template" "tfe" {
  name_prefix   = "tfe-ha-"
  image_id      = var.ami_id
  instance_type = "m5.2xlarge"

  vpc_security_group_ids = [aws_security_group.tfe.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.tfe.name
  }

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size = 100
      volume_type = "gp3"
      encrypted   = true
      kms_key_id  = aws_kms_key.tfe.arn
    }
  }

  # User data script that installs and starts TFE
  user_data = base64encode(templatefile("${path.module}/tfe-userdata.sh", {
    tfe_hostname     = var.tfe_hostname
    tfe_license      = var.tfe_license
    db_host          = aws_rds_cluster.tfe.endpoint
    db_password      = var.db_password
    redis_host       = aws_elasticache_replication_group.tfe.primary_endpoint_address
    redis_auth_token = var.redis_auth_token
    s3_bucket        = aws_s3_bucket.tfe.id
  }))
}

# Auto Scaling Group
resource "aws_autoscaling_group" "tfe" {
  name                = "tfe-ha-asg"
  desired_capacity    = 3
  min_size            = 2
  max_size            = 5
  target_group_arns   = [aws_lb_target_group.tfe.arn]
  vpc_zone_identifier = var.private_subnets
  health_check_type   = "ELB"

  # Wait for ELB health check before considering instance healthy
  health_check_grace_period = 600

  launch_template {
    id      = aws_launch_template.tfe.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 66
    }
  }
}
```

### User Data Script

```bash
#!/bin/bash
# tfe-userdata.sh - Bootstrap TFE on a new HA node
set -euo pipefail

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Create TFE directory
mkdir -p /opt/tfe/certs

# Pull TFE certificates from Secrets Manager
aws secretsmanager get-secret-value --secret-id tfe/tls-cert --query SecretString --output text > /opt/tfe/certs/tfe.crt
aws secretsmanager get-secret-value --secret-id tfe/tls-key --query SecretString --output text > /opt/tfe/certs/tfe.key
aws secretsmanager get-secret-value --secret-id tfe/ca-bundle --query SecretString --output text > /opt/tfe/certs/ca-bundle.crt

# Create Docker Compose file
cat > /opt/tfe/docker-compose.yml << 'COMPOSE'
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:v202402-1
    restart: unless-stopped
    environment:
      TFE_HOSTNAME: "${tfe_hostname}"
      TFE_LICENSE: "${tfe_license}"
      TFE_DATABASE_HOST: "${db_host}"
      TFE_DATABASE_USER: tfe_admin
      TFE_DATABASE_PASSWORD: "${db_password}"
      TFE_DATABASE_NAME: tfe
      TFE_REDIS_HOST: "${redis_host}"
      TFE_REDIS_PORT: "6379"
      TFE_REDIS_PASSWORD: "${redis_auth_token}"
      TFE_REDIS_USE_TLS: "true"
      TFE_OBJECT_STORAGE_TYPE: s3
      TFE_OBJECT_STORAGE_S3_BUCKET: "${s3_bucket}"
      TFE_OBJECT_STORAGE_S3_REGION: us-east-1
      TFE_OBJECT_STORAGE_S3_USE_INSTANCE_PROFILE: "true"
      TFE_TLS_CERT_FILE: /etc/tfe/tls/tfe.crt
      TFE_TLS_KEY_FILE: /etc/tfe/tls/tfe.key
      TFE_TLS_CA_BUNDLE_FILE: /etc/tfe/tls/ca-bundle.crt
      TFE_CAPACITY_CONCURRENCY: "15"
    volumes:
      - /opt/tfe/certs:/etc/tfe/tls:ro
      - tfe-data:/var/lib/terraform-enterprise
    ports:
      - "443:443"
      - "80:80"
volumes:
  tfe-data:
COMPOSE

# Start TFE
cd /opt/tfe
docker compose up -d
```

## Testing HA Failover

```bash
# Verify all nodes are healthy
for NODE in tfe-node-1 tfe-node-2 tfe-node-3; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${NODE}:443/_health_check")
  echo "${NODE}: ${STATUS}"
done

# Verify through the load balancer
curl -s https://tfe.example.com/_health_check | jq .

# Simulate a node failure
# 1. Stop TFE on one node
ssh tfe-node-1 "docker compose -f /opt/tfe/docker-compose.yml down"

# 2. Verify the load balancer detects the failure
# Wait 30-60 seconds for health checks to fail

# 3. Verify TFE is still accessible
curl -s https://tfe.example.com/_health_check | jq .

# 4. Trigger a test run to confirm full functionality
# Plans and applies should work normally on the remaining nodes

# 5. Bring the node back up
ssh tfe-node-1 "docker compose -f /opt/tfe/docker-compose.yml up -d"
```

## Monitoring HA Health

```bash
# Check the number of healthy targets in the load balancer
aws elbv2 describe-target-health \
  --target-group-arn "${TARGET_GROUP_ARN}" | \
  jq '.TargetHealthDescriptions[] | {target: .Target.Id, health: .TargetHealth.State}'

# Alert if fewer than 2 nodes are healthy
HEALTHY_COUNT=$(aws elbv2 describe-target-health \
  --target-group-arn "${TARGET_GROUP_ARN}" | \
  jq '[.TargetHealthDescriptions[] | select(.TargetHealth.State == "healthy")] | length')

if [ "${HEALTHY_COUNT}" -lt 2 ]; then
  echo "WARNING: Only ${HEALTHY_COUNT} healthy TFE nodes"
fi
```

Use [OneUptime](https://oneuptime.com) to monitor each TFE node individually and the load balancer endpoint. This gives you visibility into both overall service health and individual node health.

## Operational Considerations

- **Rolling upgrades**: Update one node at a time. The ASG instance refresh handles this automatically.
- **Scaling up**: Increase `desired_capacity` in the ASG. New nodes bootstrap automatically.
- **Scaling down**: Decrease `desired_capacity`. The ASG drains connections before terminating nodes.
- **Certificate rotation**: Update the certificate in Secrets Manager, then perform a rolling restart of all nodes.
- **Configuration changes**: Update the launch template, then trigger an instance refresh.

## Summary

Terraform Enterprise high availability eliminates the single point of failure by running multiple stateless TFE nodes behind a load balancer. The key to HA is externalizing all state - PostgreSQL, Redis, and object storage must all be external and have their own HA configurations. With the infrastructure in place, TFE nodes become disposable: they can be replaced, upgraded, or scaled without downtime. Test failover regularly to make sure the health checks and load balancer are configured correctly, and monitor each node individually so you know about failures before they affect service availability.
