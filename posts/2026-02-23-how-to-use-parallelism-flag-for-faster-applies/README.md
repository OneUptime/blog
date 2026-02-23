# How to Use -parallelism Flag for Faster Applies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, DevOps, Infrastructure as Code, Optimization

Description: Speed up Terraform apply operations by tuning the -parallelism flag to control concurrent resource operations while avoiding API rate limiting.

---

Terraform creates, updates, and destroys resources in parallel by default. The `-parallelism` flag controls how many resource operations happen at the same time. The default is 10, which is conservative. For many workloads, you can increase this to significantly reduce apply times. But push it too high and you will hit API rate limits that actually slow things down.

This guide covers how to tune the `-parallelism` flag for your specific workloads, when to increase it, when to decrease it, and how to avoid common pitfalls.

## How Terraform Parallelism Works

Terraform builds a dependency graph of all resources and operations. Resources that do not depend on each other can be created in parallel. The `-parallelism` flag sets the maximum number of concurrent operations.

```
# Default: 10 concurrent operations
terraform apply

# Increase parallelism
terraform apply -parallelism=20

# Set it for plan as well (affects refresh operations)
terraform plan -parallelism=20

# Decrease for rate-limited APIs
terraform apply -parallelism=5
```

The parallelism value is a ceiling, not a target. If your dependency graph only allows 3 concurrent operations at a given point, that is what Terraform will do regardless of the parallelism setting.

## When to Increase Parallelism

### Many Independent Resources

If your configuration creates many resources that do not depend on each other, increasing parallelism helps a lot:

```hcl
# 100 independent S3 buckets - perfect for high parallelism
resource "aws_s3_bucket" "data" {
  for_each = toset(var.bucket_names)
  bucket   = each.value
}

# 50 independent security group rules
resource "aws_vpc_security_group_ingress_rule" "rules" {
  for_each          = var.ingress_rules
  security_group_id = aws_security_group.main.id
  from_port         = each.value.from_port
  to_port           = each.value.to_port
  ip_protocol       = each.value.protocol
  cidr_ipv4         = each.value.cidr
}
```

```bash
# These 150 independent resources can be created much faster
terraform apply -parallelism=30
```

### Route53 Records

DNS record creation is a common case where higher parallelism helps:

```bash
# 200 Route53 records with default parallelism: ~20 minutes
terraform apply

# Same records with higher parallelism: ~4 minutes
terraform apply -parallelism=50
```

### IAM Resources

IAM is a global service with high rate limits. IAM resource creation benefits from higher parallelism:

```bash
# Creating many IAM roles and policies
terraform apply -parallelism=25
```

## When to Decrease Parallelism

### API Rate Limiting

If you see errors like these, reduce parallelism:

```
Error: error creating Security Group: RequestLimitExceeded: Request limit exceeded.
Error: ThrottlingException: Rate exceeded
Error: error creating S3 bucket: TooManyBuckets: You have attempted to create more buckets than allowed
```

```bash
# Reduce parallelism when hitting rate limits
terraform apply -parallelism=5

# Or even lower for very rate-limited services
terraform apply -parallelism=2
```

### AWS Service Limits

Some AWS services have low concurrency limits:

```bash
# CloudFormation custom resources: low concurrency
terraform apply -parallelism=3

# RDS creation: limited by underlying capacity
terraform apply -parallelism=5

# ACM certificate validation: DNS propagation dependent
terraform apply -parallelism=5
```

### Resource Dependencies on External Systems

When resources depend on external systems that cannot handle high concurrency:

```hcl
# Database migrations, external API calls, etc.
resource "null_resource" "db_migration" {
  provisioner "local-exec" {
    command = "python run_migration.py"
  }
}
```

## Finding the Right Value

Use a binary search approach to find the optimal parallelism for your workload:

```bash
#!/bin/bash
# benchmark-parallelism.sh

for P in 5 10 20 30 50; do
  echo "=== Testing parallelism=$P ==="

  # Destroy and recreate to get clean timing
  terraform destroy -auto-approve -parallelism=$P 2>&1 | tail -1

  START=$(date +%s)
  terraform apply -auto-approve -parallelism=$P 2>&1 | tail -5
  END=$(date +%s)

  DURATION=$((END - START))
  echo "Parallelism $P: ${DURATION}s"
  echo ""
done
```

**Warning**: Only run this benchmark against a development environment. Do not destroy and recreate production resources for benchmarking.

## Setting Parallelism as Default

You can set a default parallelism value through environment variables or wrapper scripts:

```bash
# Environment variable (not a built-in Terraform feature,
# but useful in wrapper scripts)
export TF_CLI_ARGS_apply="-parallelism=20"
export TF_CLI_ARGS_plan="-parallelism=20"
export TF_CLI_ARGS_destroy="-parallelism=20"
```

Or use a wrapper script:

```bash
#!/bin/bash
# tf - wrapper script with tuned parallelism

PARALLELISM=20

case "$1" in
  apply|plan|destroy|refresh)
    terraform "$@" -parallelism=$PARALLELISM
    ;;
  *)
    terraform "$@"
    ;;
esac
```

## Parallelism and Resource Timeouts

Higher parallelism can trigger timeouts when cloud provider APIs are slow under load. Adjust timeouts accordingly:

```hcl
resource "aws_db_instance" "main" {
  # ... configuration ...

  timeouts {
    create = "60m"  # Increase from default 40m
    update = "80m"
    delete = "60m"
  }
}

resource "aws_eks_cluster" "main" {
  # ... configuration ...

  timeouts {
    create = "30m"
    update = "60m"
    delete = "30m"
  }
}
```

## Parallelism Per Cloud Provider

Different cloud providers have different rate limits. Here are recommended starting points:

### AWS

```bash
# General AWS resources: 20-30 works well
terraform apply -parallelism=25

# EC2 instances: 10-20 (launch limits vary by account)
terraform apply -parallelism=15

# S3 operations: 30-50 (S3 has high rate limits)
terraform apply -parallelism=40

# RDS: 5-10 (slow to create, limited concurrency)
terraform apply -parallelism=5
```

### Azure

```bash
# Azure generally has lower rate limits than AWS
terraform apply -parallelism=10

# Azure Resource Manager: 10-15
terraform apply -parallelism=12
```

### GCP

```bash
# GCP: similar to AWS defaults
terraform apply -parallelism=20

# GCE instances: 10-15
terraform apply -parallelism=15
```

## Monitoring Parallelism Effects

Watch for throttling in CloudTrail or provider logs:

```bash
# Check for throttling in recent CloudTrail events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=ThrottleEvent \
  --max-items 20

# Enable Terraform debug logging to see API calls
TF_LOG=DEBUG terraform apply -parallelism=30 2>terraform-debug.log

# Count throttling errors in the log
grep -c "ThrottlingException\|RequestLimitExceeded\|Rate exceeded" terraform-debug.log
```

## Combining Parallelism with Other Optimizations

For maximum performance, combine parallelism tuning with other techniques:

```bash
# Fast development workflow
terraform plan \
  -refresh=false \
  -target=module.application \
  -parallelism=30

# Fast full apply with provider caching
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
terraform apply -parallelism=25
```

## Summary

The `-parallelism` flag is a simple but effective way to speed up Terraform operations. The default of 10 is conservative and can often be doubled or tripled for workloads with many independent resources. Start at 20, watch for rate limiting errors, and adjust up or down based on your specific cloud provider and resource types. For mixed workloads, a value of 20-25 is usually a good balance between speed and API rate limit safety.

For more optimization techniques, see [how to speed up terraform init with provider caching](https://oneuptime.com/blog/post/2026-02-23-how-to-speed-up-terraform-init-with-provider-caching/view) and [how to reduce Terraform plan time with -refresh=false](https://oneuptime.com/blog/post/2026-02-23-how-to-reduce-terraform-plan-time-with-refresh-false/view).
