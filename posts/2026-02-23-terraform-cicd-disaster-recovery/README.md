# How to Implement Terraform CI/CD for Disaster Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Disaster Recovery, AWS, High Availability, Infrastructure as Code

Description: Build Terraform CI/CD pipelines that automate disaster recovery infrastructure including multi-region deployments, state backup, failover automation, and recovery testing.

---

Disaster recovery with Terraform is about more than having a backup plan. It means your infrastructure can be recreated quickly and reliably in a different region or account when things go wrong. A well-built CI/CD pipeline makes DR practical by automating the creation, testing, and maintenance of your recovery infrastructure.

This post covers how to build Terraform CI/CD pipelines with DR in mind.

## DR Strategy with Terraform

There are three common DR patterns, each with different Terraform approaches:

- **Pilot Light**: Minimal resources always running in DR region (database replicas, AMIs). Full infrastructure spun up during failover.
- **Warm Standby**: Scaled-down copy running in DR region. Scaled up during failover.
- **Multi-Region Active-Active**: Full infrastructure in both regions. No failover needed, just traffic shifting.

## Multi-Region Terraform Structure

Organize your code to support multiple regions:

```text
infrastructure/
  modules/
    app-stack/        # Reusable module for the full application stack
      main.tf
      variables.tf
      outputs.tf
  regions/
    us-east-1/        # Primary region
      main.tf
      backend.tf
      terraform.tfvars
    us-west-2/        # DR region
      main.tf
      backend.tf
      terraform.tfvars
  global/
    dns/              # Global DNS and failover routing
      main.tf
    iam/              # Global IAM roles
      main.tf
```

The app stack module encapsulates everything needed for one region:

```hcl
# modules/app-stack/variables.tf
variable "environment" {
  type = string
}

variable "region" {
  type = string
}

variable "is_dr" {
  type        = bool
  description = "Whether this is the DR region (affects scaling)"
  default     = false
}

variable "primary_region" {
  type        = string
  description = "Primary region for cross-region references"
  default     = ""
}
```

```hcl
# modules/app-stack/main.tf
locals {
  # Scale down in DR region for cost savings (warm standby)
  instance_count = var.is_dr ? max(var.instance_count / 2, 1) : var.instance_count
  instance_type  = var.is_dr ? "t3.medium" : var.instance_type
}

# VPC
module "vpc" {
  source = "../vpc"

  name       = "${var.environment}-${var.region}"
  cidr_block = var.vpc_cidr
}

# Application instances
resource "aws_autoscaling_group" "app" {
  name                = "${var.environment}-app"
  desired_capacity    = local.instance_count
  min_size            = var.is_dr ? 1 : var.min_instances
  max_size            = var.max_instances  # Keep max high for failover scaling

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  vpc_zone_identifier = module.vpc.private_subnet_ids
}

# Database with cross-region replication
resource "aws_db_instance" "main" {
  identifier          = "${var.environment}-db"
  engine              = "postgres"
  instance_class      = var.is_dr ? "db.t3.medium" : var.db_instance_class
  replicate_source_db = var.is_dr ? var.primary_db_arn : null

  multi_az            = !var.is_dr  # Multi-AZ in primary, single in DR
  storage_encrypted   = true
  skip_final_snapshot = var.is_dr
}
```

## Primary Region Configuration

```hcl
# regions/us-east-1/main.tf
provider "aws" {
  region = "us-east-1"
}

module "app_stack" {
  source = "../../modules/app-stack"

  environment    = "production"
  region         = "us-east-1"
  is_dr          = false
  instance_count = 6
  instance_type  = "t3.xlarge"
  vpc_cidr       = "10.0.0.0/16"
}

# Cross-region DB replica for DR
resource "aws_db_instance_automated_backups_replication" "dr" {
  source_db_instance_arn = module.app_stack.db_arn
  retention_period       = 7

  # Replicate backups to DR region
  provider = aws.dr
}

output "db_arn" {
  value = module.app_stack.db_arn
}
```

## DR Region Configuration

```hcl
# regions/us-west-2/main.tf
provider "aws" {
  region = "us-west-2"
}

# Read primary region outputs
data "terraform_remote_state" "primary" {
  backend = "s3"
  config = {
    bucket = "terraform-state-primary"
    key    = "us-east-1/terraform.tfstate"
    region = "us-east-1"
  }
}

module "app_stack" {
  source = "../../modules/app-stack"

  environment    = "production"
  region         = "us-west-2"
  is_dr          = true
  primary_region = "us-east-1"
  primary_db_arn = data.terraform_remote_state.primary.outputs.db_arn
  instance_count = 6         # Will be halved by the module for DR
  instance_type  = "t3.xlarge"  # Will be downgraded by the module
  vpc_cidr       = "10.1.0.0/16"
}
```

## CI/CD Pipeline for DR

```yaml
# .github/workflows/terraform-dr.yml
name: Terraform DR Pipeline
on:
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  # Deploy primary region first
  deploy-primary:
    runs-on: ubuntu-latest
    environment: production-primary
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy Primary
        working-directory: infrastructure/regions/us-east-1
        run: |
          terraform init
          terraform apply -auto-approve -no-color

  # Deploy DR region after primary
  deploy-dr:
    needs: deploy-primary
    runs-on: ubuntu-latest
    environment: production-dr
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-west-2

      - name: Deploy DR Region
        working-directory: infrastructure/regions/us-west-2
        run: |
          terraform init
          terraform apply -auto-approve -no-color

  # Deploy global resources (DNS failover)
  deploy-global:
    needs: [deploy-primary, deploy-dr]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy DNS Failover
        working-directory: infrastructure/global/dns
        run: |
          terraform init
          terraform apply -auto-approve -no-color
```

## DNS Failover Configuration

```hcl
# global/dns/main.tf
# Health check for primary region
resource "aws_route53_health_check" "primary" {
  fqdn              = "api-primary.myapp.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 10

  tags = {
    Name = "primary-health-check"
  }
}

# Primary DNS record with failover
resource "aws_route53_record" "primary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.myapp.com"
  type    = "A"

  alias {
    name                   = data.terraform_remote_state.primary.outputs.alb_dns
    zone_id                = data.terraform_remote_state.primary.outputs.alb_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary.id
}

# DR DNS record (secondary)
resource "aws_route53_record" "dr" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.myapp.com"
  type    = "A"

  alias {
    name                   = data.terraform_remote_state.dr.outputs.alb_dns
    zone_id                = data.terraform_remote_state.dr.outputs.alb_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "dr"
}
```

## Failover Automation Pipeline

```yaml
# .github/workflows/failover.yml
name: DR Failover
on:
  workflow_dispatch:
    inputs:
      action:
        description: 'Failover action'
        required: true
        type: choice
        options:
          - failover-to-dr
          - failback-to-primary

jobs:
  failover:
    runs-on: ubuntu-latest
    environment: production-dr
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-west-2

      - name: Scale Up DR Region
        if: github.event.inputs.action == 'failover-to-dr'
        working-directory: infrastructure/regions/us-west-2
        run: |
          terraform init

          # Override DR scaling to full production capacity
          terraform apply -auto-approve \
            -var="is_dr=false" \
            -var="instance_count=6" \
            -no-color

      - name: Promote DR Database
        if: github.event.inputs.action == 'failover-to-dr'
        run: |
          # Promote the read replica to primary
          aws rds promote-read-replica \
            --db-instance-identifier production-db \
            --region us-west-2

          echo "Database promotion initiated. Monitor progress in AWS console."

      - name: Scale Down DR After Failback
        if: github.event.inputs.action == 'failback-to-primary'
        working-directory: infrastructure/regions/us-west-2
        run: |
          terraform init
          terraform apply -auto-approve \
            -var="is_dr=true" \
            -no-color
```

## State Backup and Recovery

Protect your Terraform state files as part of DR:

```hcl
# State bucket with cross-region replication
resource "aws_s3_bucket" "terraform_state" {
  bucket = "terraform-state-primary"
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Replicate state to DR region
resource "aws_s3_bucket_replication_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-state"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.state_replica.arn
      storage_class = "STANDARD"
    }
  }
}
```

## Automated DR Testing

Schedule regular DR tests to verify the recovery process works:

```yaml
# .github/workflows/dr-test.yml
name: DR Test
on:
  schedule:
    - cron: '0 6 1 * *'  # First day of every month at 6am

jobs:
  test-dr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Verify DR Infrastructure
        working-directory: infrastructure/regions/us-west-2
        run: |
          terraform init
          terraform plan -detailed-exitcode -no-color 2>&1 | tee dr-plan.txt

          # Verify no drift in DR region
          if [ ${PIPESTATUS[0]} -eq 2 ]; then
            echo "WARNING: DR infrastructure has drifted"
          fi

      - name: Test DR Connectivity
        run: |
          # Verify DR endpoints are reachable
          curl -sf https://api-dr.myapp.com/health || echo "DR health check failed"

          # Verify database replication lag
          aws rds describe-db-instances \
            --db-instance-identifier production-db \
            --region us-west-2 \
            --query 'DBInstances[0].ReadReplicaSourceDBInstanceIdentifier'

      - name: Report DR Status
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -d "{\"text\": \"Monthly DR test completed. Check pipeline for details.\"}"
```

## Summary

Terraform CI/CD for disaster recovery covers:

1. Multi-region module design with DR-aware scaling
2. Pipeline ordering - primary first, then DR, then global resources
3. DNS failover with Route 53 health checks
4. Automated failover and failback workflows
5. Cross-region state replication for state file DR
6. Scheduled DR testing to verify recovery readiness

The key principle is treating DR infrastructure as code that gets deployed and tested continuously, not as a dusty runbook that might not work when you need it. For monitoring the health of these pipelines, see [Terraform CI/CD pipeline monitoring](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pipeline-monitoring/view).
