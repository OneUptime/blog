# How to Scale Terraform Enterprise for Large Organizations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Scaling, Performance, Architecture, Enterprise

Description: Strategies and best practices for scaling Terraform Enterprise to support large organizations with hundreds of teams, thousands of workspaces, and high concurrency needs.

---

Terraform Enterprise works great out of the box for small and medium teams. But when your organization grows to hundreds of developers across dozens of teams, all running Terraform against thousands of workspaces, the default single-node deployment starts showing strain. Run queue times creep up, the UI feels sluggish, and teams start competing for limited concurrency slots.

This guide covers the architectural decisions and practical configurations you need to scale TFE for large organizations.

## Identifying Scaling Bottlenecks

Before throwing more resources at the problem, figure out where the bottleneck actually is:

```bash
# Check run queue depth - high numbers mean concurrency is the bottleneck
curl -s \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" \
  "https://tfe.example.com/api/v2/admin/runs?filter[status]=pending" | \
  jq '.meta.pagination["total-count"]'

# Check plan/apply times - slow runs might indicate resource constraints
curl -s \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" \
  "https://tfe.example.com/api/v2/admin/runs?filter[status]=applied&page[size]=10" | \
  jq '.data[] | {id: .id, created: .attributes["created-at"], status_timestamps: .attributes["status-timestamps"]}'

# Check database performance
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U tfe_admin -d tfe -c \
  "SELECT count(*) as active_queries FROM pg_stat_activity WHERE state = 'active';"

# Check TFE host resource usage
docker stats tfe --no-stream
```

## Horizontal Scaling - Multiple TFE Nodes

The most impactful scaling move is going from a single TFE node to multiple nodes. This requires external PostgreSQL, external Redis, and external object storage.

### Architecture Overview

```text
                    Load Balancer
                   /      |       \
                  /       |        \
              TFE-1    TFE-2    TFE-3
                 \       |       /
                  \      |      /
            +------+-----+-----+------+
            |      |           |      |
         Postgres  Redis   Object    Vault
                              Storage
```

### Load Balancer Configuration

```hcl
# AWS Application Load Balancer for TFE
resource "aws_lb" "tfe" {
  name               = "tfe-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [aws_security_group.tfe_alb.id]
  subnets            = var.private_subnets

  enable_deletion_protection = true
}

resource "aws_lb_target_group" "tfe" {
  name     = "tfe-targets"
  port     = 443
  protocol = "HTTPS"
  vpc_id   = var.vpc_id

  # Sticky sessions are required for TFE
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
    unhealthy_threshold = 5
    interval            = 30
    timeout             = 10
  }
}

# Auto Scaling Group for TFE nodes
resource "aws_autoscaling_group" "tfe" {
  name                = "tfe-asg"
  desired_capacity    = 3
  max_size            = 6
  min_size            = 2
  target_group_arns   = [aws_lb_target_group.tfe.arn]
  vpc_zone_identifier = var.private_subnets

  launch_template {
    id      = aws_launch_template.tfe.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "tfe-node"
    propagate_at_launch = true
  }
}
```

### Node Configuration

Each TFE node runs the same configuration, pointing to the shared external services:

```yaml
# docker-compose.yml - Same on every TFE node
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:v202402-1
    environment:
      TFE_HOSTNAME: tfe.example.com

      # External PostgreSQL (shared)
      TFE_DATABASE_HOST: tfe-postgres.cluster-abc123.us-east-1.rds.amazonaws.com
      TFE_DATABASE_USER: tfe
      TFE_DATABASE_PASSWORD: "${DB_PASSWORD}"
      TFE_DATABASE_NAME: tfe

      # External Redis (shared)
      TFE_REDIS_HOST: tfe-redis.abc123.ng.0001.use1.cache.amazonaws.com
      TFE_REDIS_PORT: "6379"
      TFE_REDIS_PASSWORD: "${REDIS_PASSWORD}"
      TFE_REDIS_USE_TLS: "true"

      # External Object Storage (shared)
      TFE_OBJECT_STORAGE_TYPE: s3
      TFE_OBJECT_STORAGE_S3_BUCKET: tfe-object-storage
      TFE_OBJECT_STORAGE_S3_REGION: us-east-1
      TFE_OBJECT_STORAGE_S3_USE_INSTANCE_PROFILE: "true"

      # Run concurrency per node
      TFE_CAPACITY_CONCURRENCY: "20"

    ports:
      - "443:443"
    volumes:
      - tfe-data:/var/lib/terraform-enterprise
volumes:
  tfe-data:
```

## Vertical Scaling - Right-Sizing Instances

Sometimes you need bigger nodes rather than more nodes.

### Sizing Guidelines

| Organization Size | Users | Workspaces | Instance Type | vCPU | Memory |
|---|---|---|---|---|---|
| Small | < 50 | < 200 | m5.xlarge | 4 | 16 GB |
| Medium | 50-200 | 200-1000 | m5.2xlarge | 8 | 32 GB |
| Large | 200-500 | 1000-5000 | m5.4xlarge | 16 | 64 GB |
| Very Large | 500+ | 5000+ | m5.8xlarge | 32 | 128 GB |

### Run Concurrency Tuning

```bash
# The concurrency setting controls how many runs execute simultaneously per node
# Default is 10. Increase it based on available resources.
# Each concurrent run uses approximately 256MB-1GB of memory

# For a 32GB instance, you can safely run 20-25 concurrent runs
TFE_CAPACITY_CONCURRENCY=20

# Monitor memory usage to find the right number
docker stats tfe --no-stream --format "{{.MemUsage}}"
```

## Database Scaling

### PostgreSQL Optimization

```sql
-- Key PostgreSQL settings for large TFE deployments
-- Apply these to your RDS parameter group or postgresql.conf

-- Connection pool settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '8GB';  -- 25% of available memory

-- Query performance
ALTER SYSTEM SET effective_cache_size = '24GB';  -- 75% of available memory
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';

-- Write performance
ALTER SYSTEM SET wal_buffers = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET max_wal_size = '4GB';

-- Autovacuum tuning for large tables
ALTER SYSTEM SET autovacuum_max_workers = 4;
ALTER SYSTEM SET autovacuum_naptime = '30s';
```

### Read Replicas

For read-heavy workloads (many users browsing workspaces, viewing state):

```bash
# Create a read replica for TFE reporting queries
aws rds create-db-instance-read-replica \
  --db-instance-identifier tfe-postgres-read \
  --source-db-instance-identifier tfe-postgres \
  --db-instance-class db.r6g.xlarge
```

## Workspace Organization Strategy

Scaling is not just about infrastructure. How you organize workspaces matters:

```text
Organization Structure for Large Enterprises:

my-company/
  production/
    networking-prod
    compute-prod
    database-prod
    security-prod
  staging/
    networking-staging
    compute-staging
    database-staging
  dev/
    networking-dev
    compute-dev

# Use workspace tags for filtering
# Tag workspaces by team, environment, region, and application
```

### Using Projects for Grouping

```bash
# Create a project for each team or business unit
curl -s \
  --header "Authorization: Bearer $TFE_ORG_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://tfe.example.com/api/v2/organizations/my-org/projects" \
  --data '{
    "data": {
      "type": "projects",
      "attributes": {
        "name": "platform-engineering"
      }
    }
  }'
```

## Agent Pool Scaling

For organizations that need to run Terraform against private infrastructure, scale agent pools:

```yaml
# Kubernetes deployment for TFE agents
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tfe-agent
  namespace: tfe-agents
spec:
  replicas: 10  # Scale based on run queue depth
  selector:
    matchLabels:
      app: tfe-agent
  template:
    metadata:
      labels:
        app: tfe-agent
    spec:
      containers:
        - name: tfe-agent
          image: hashicorp/tfc-agent:latest
          env:
            - name: TFC_AGENT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tfe-agent-token
                  key: token
            - name: TFC_ADDRESS
              value: "https://tfe.example.com"
            - name: TFC_AGENT_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
---
# HPA to auto-scale agents based on CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tfe-agent-hpa
  namespace: tfe-agents
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: tfe-agent
  minReplicas: 5
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Monitoring at Scale

Track these metrics to understand your scaling needs:

- Run queue wait time (how long runs wait before starting)
- Concurrent run count vs capacity
- API response times
- Database connection count and query latency
- Memory and CPU utilization per TFE node

Use [OneUptime](https://oneuptime.com) to set up dashboards and alerts for these metrics, giving you visibility into when and where to scale next.

## Summary

Scaling Terraform Enterprise is about matching capacity to demand across multiple dimensions - compute concurrency, database performance, storage throughput, and organizational structure. Start by identifying your actual bottleneck before adding resources. Move to external PostgreSQL, Redis, and object storage early. Then scale horizontally by adding TFE nodes behind a load balancer. Combine infrastructure scaling with good workspace organization and agent pool management to keep TFE responsive as your organization grows.
