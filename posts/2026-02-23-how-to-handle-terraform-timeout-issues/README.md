# How to Handle Terraform Timeout Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Troubleshooting, Performance, Infrastructure as Code

Description: Diagnose and fix Terraform timeout issues including resource creation timeouts, API throttling, backend timeouts, and strategies for long-running operations.

---

Terraform timeout issues are one of the most frustrating problems you will encounter. An apply runs for 30 minutes, hits a timeout, and leaves your infrastructure in a partially created state. Understanding why timeouts happen and how to prevent them saves hours of debugging and manual cleanup.

This guide covers the different types of Terraform timeouts, what causes them, and how to handle each one.

## Types of Terraform Timeouts

There are several distinct timeout scenarios in Terraform:

1. **Resource creation timeouts**: A resource takes too long to become ready
2. **API rate limiting**: Too many API calls cause delays and failures
3. **State backend timeouts**: The state backend is slow or unreachable
4. **Provider timeouts**: The provider's HTTP client times out on API calls
5. **CI/CD pipeline timeouts**: The overall pipeline job times out

Each requires a different fix.

## Resource Creation Timeouts

Many Terraform resources have default timeouts for create, update, and delete operations. When a resource takes longer than expected, Terraform gives up.

### Setting Custom Timeouts

```hcl
# RDS instances can take 30+ minutes to create
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.2xlarge"

  allocated_storage     = 500
  max_allocated_storage = 1000
  storage_encrypted     = true

  # Increase timeouts for large database creation
  timeouts {
    create = "90m"   # Default is 40m
    update = "120m"  # Default is 80m
    delete = "60m"   # Default is 60m
  }
}

# EKS clusters are notoriously slow to create
resource "aws_eks_cluster" "main" {
  name     = "production"
  role_arn = aws_iam_role.eks.arn
  version  = "1.28"

  vpc_config {
    subnet_ids = var.private_subnet_ids
  }

  timeouts {
    create = "45m"  # Default is 30m
    update = "60m"
    delete = "30m"
  }
}

# ElastiCache clusters
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "production-redis"
  description          = "Production Redis cluster"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 3

  timeouts {
    create = "60m"
    update = "40m"
    delete = "30m"
  }
}

# CloudFront distributions
resource "aws_cloudfront_distribution" "main" {
  # ... configuration ...

  timeouts {
    create = "60m"   # CloudFront propagation is slow
    update = "60m"
    delete = "30m"
  }
}
```

### Common Resources That Need Timeout Increases

| Resource | Default Create | Recommended |
|----------|---------------|-------------|
| aws_db_instance | 40m | 60-90m |
| aws_eks_cluster | 30m | 45m |
| aws_eks_node_group | 60m | 90m |
| aws_cloudfront_distribution | 70m | 90m |
| aws_elasticsearch_domain | 60m | 90m |
| aws_redshift_cluster | 75m | 90m |
| aws_emr_cluster | 30m | 60m |
| aws_neptune_cluster | 120m | 150m |

## API Rate Limiting

When Terraform makes too many API calls too quickly, cloud providers throttle the requests. This causes delays that can cascade into timeouts.

### Reduce Parallelism

```bash
# Default parallelism is 10 - reduce when hitting rate limits
terraform apply -parallelism=5

# For very rate-limited operations
terraform apply -parallelism=2
```

### Add Retry Logic in Providers

The AWS provider has built-in retry logic that you can configure:

```hcl
provider "aws" {
  region = "us-east-1"

  # Increase retry settings for rate limiting
  retry_mode  = "adaptive"  # Adaptive retry with exponential backoff
  max_retries = 25           # Default is 25, but you can increase

  # Custom HTTP timeout
  default_tags {
    tags = {
      ManagedBy = "terraform"
    }
  }
}
```

### Stagger Resource Creation

If you are creating many similar resources, add artificial dependencies to stagger creation:

```hcl
# Instead of creating 50 Lambda functions simultaneously,
# create them in batches using depends_on

resource "aws_lambda_function" "batch_1" {
  for_each = { for k, v in var.functions : k => v if v.batch == 1 }
  # ... configuration ...
}

resource "aws_lambda_function" "batch_2" {
  for_each = { for k, v in var.functions : k => v if v.batch == 2 }
  # ... configuration ...

  depends_on = [aws_lambda_function.batch_1]
}

resource "aws_lambda_function" "batch_3" {
  for_each = { for k, v in var.functions : k => v if v.batch == 3 }
  # ... configuration ...

  depends_on = [aws_lambda_function.batch_2]
}
```

## State Backend Timeouts

When the state backend is slow or unreachable, every Terraform operation stalls.

### S3 Backend Issues

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"

    # Increase timeouts
    skip_metadata_api_check = false
  }
}
```

If DynamoDB lock acquisition is timing out:

```bash
# Check for stale locks
aws dynamodb scan --table-name terraform-locks

# Remove a stale lock (only if you are SURE no one else is running Terraform)
aws dynamodb delete-item \
  --table-name terraform-locks \
  --key '{"LockID": {"S": "terraform-state/production/terraform.tfstate"}}'

# Or use terraform force-unlock
terraform force-unlock LOCK_ID
```

### Large State File Transfers

If your state file is very large, transfers can time out:

```bash
# Check state size
terraform state pull | wc -c

# If over 10 MB, consider splitting state
# See: how-to-optimize-large-terraform-state-files
```

## Provider HTTP Timeouts

Some providers have configurable HTTP timeout settings:

```hcl
# AWS provider
provider "aws" {
  region = "us-east-1"

  # These are implicit but can be influenced by retry settings
  max_retries = 25
  retry_mode  = "adaptive"
}

# Kubernetes provider
provider "kubernetes" {
  # Increase timeout for slow API servers
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", var.cluster_name]
  }
}

# Helm provider
provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca)
    token                  = var.cluster_token
  }
}
```

## Handling Timeout-Related Partial State

When a timeout leaves resources in a partial state:

```bash
# Step 1: Check what Terraform thinks the state is
terraform state list
terraform state show aws_db_instance.production

# Step 2: Check what AWS thinks the state is
aws rds describe-db-instances --db-instance-identifier production-db

# Step 3: If the resource was actually created, do a refresh
terraform refresh

# Step 4: If the resource is stuck in a creating/modifying state,
# wait for it to finish, then refresh
aws rds wait db-instance-available --db-instance-identifier production-db
terraform refresh

# Step 5: If the resource failed and needs cleanup
terraform state rm aws_db_instance.production
# Then manually clean up in AWS if needed
```

## CI/CD Pipeline Timeouts

When your CI/CD pipeline has a job timeout that is shorter than your Terraform operations:

### GitHub Actions

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest
    timeout-minutes: 120  # Increase from default 360 for long applies

    steps:
      - name: Terraform Apply
        run: terraform apply -auto-approve
        timeout-minutes: 90  # Step-level timeout
```

### GitLab CI

```yaml
terraform-apply:
  stage: deploy
  timeout: 2h  # Default is 1h
  script:
    - terraform apply -auto-approve
```

## Debugging Timeout Issues

Enable logging to understand where time is being spent:

```bash
# Enable trace logging
TF_LOG=TRACE terraform apply 2>terraform-trace.log

# Enable just provider-level logging
TF_LOG_PROVIDER=DEBUG terraform apply 2>provider-debug.log

# Time each phase
time terraform init
time terraform plan
time terraform apply -auto-approve
```

Look for patterns in the logs:

```bash
# Find slow API calls
grep "HTTP Response" terraform-trace.log | sort -t= -k3 -rn | head

# Find retry attempts
grep -c "retrying" terraform-trace.log

# Find timeout errors
grep -i "timeout\|timed out\|deadline exceeded" terraform-trace.log
```

## Preventive Strategies

### Break Up Large Applies

Instead of one massive apply, break it into phases:

```bash
# Phase 1: Networking (fast, few dependencies)
terraform apply -target=module.networking

# Phase 2: Data stores (slow, but independent)
terraform apply -target=module.database -target=module.cache

# Phase 3: Compute (depends on phase 1 and 2)
terraform apply -target=module.application

# Phase 4: Full reconciliation
terraform apply
```

### Use create_before_destroy

For resources that are slow to create, avoid downtime by creating the replacement before destroying the old one:

```hcl
resource "aws_db_instance" "production" {
  # ... configuration ...

  lifecycle {
    create_before_destroy = true
  }

  timeouts {
    create = "90m"
    delete = "60m"
  }
}
```

### Implement Health Checks in Your Pipeline

```bash
#!/bin/bash
# terraform-apply-with-retry.sh

MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  terraform apply -auto-approve 2>&1 | tee apply-output.log

  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "Apply succeeded"
    exit 0
  fi

  # Check if it was a timeout/throttling error (retryable)
  if grep -q "ThrottlingException\|RequestLimitExceeded\|timeout" apply-output.log; then
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Retryable error detected. Retry $RETRY_COUNT of $MAX_RETRIES"
    echo "Waiting 60 seconds before retry..."
    sleep 60
  else
    echo "Non-retryable error. Exiting."
    exit 1
  fi
done

echo "Max retries exceeded"
exit 1
```

## Summary

Terraform timeout issues come in several varieties: resource creation timeouts, API rate limiting, backend timeouts, and CI/CD pipeline timeouts. For resource timeouts, increase the timeout block values. For rate limiting, reduce parallelism. For backend issues, check for stale locks and large state files. For CI/CD timeouts, increase job time limits and break up large applies into phases. The most important thing is to plan for long-running operations upfront rather than hitting timeouts in production.

For more on Terraform performance, see [how to optimize large Terraform state files](https://oneuptime.com/blog/post/2026-02-23-how-to-optimize-large-terraform-state-files/view) and [how to use the parallelism flag for faster applies](https://oneuptime.com/blog/post/2026-02-23-how-to-use-parallelism-flag-for-faster-applies/view).
