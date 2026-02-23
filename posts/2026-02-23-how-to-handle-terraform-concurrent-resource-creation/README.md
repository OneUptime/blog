# How to Handle Terraform Concurrent Resource Creation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Concurrency, Parallelism, Resource Creation, DevOps

Description: Master Terraform concurrent resource creation by tuning parallelism, handling race conditions, and resolving conflicts from simultaneous operations.

---

Terraform creates, updates, and destroys resources concurrently by default. It uses a parallelism setting (default of 10) to control how many operations happen simultaneously. While this concurrency speeds things up, it also introduces challenges: race conditions, API rate limits, and ordering issues that can cause failures.

This post covers how to tune concurrency, handle common problems, and get the most out of parallel resource creation.

## How Terraform Concurrency Works

Terraform's dependency graph determines which resources can be created in parallel. If resource B depends on resource A, then A is created first. But if resources B and C are both independent of each other (both only depend on A), they can be created simultaneously.

```
     A
    / \
   B   C   <- B and C are created in parallel
   |   |
   D   E   <- D and E are created in parallel (after B and C respectively)
```

The `-parallelism` flag controls how many of these independent operations run at the same time:

```bash
# Default: 10 concurrent operations
terraform apply

# Increase for faster execution
terraform apply -parallelism=30

# Decrease if hitting rate limits or race conditions
terraform apply -parallelism=5

# Fully serial execution (useful for debugging)
terraform apply -parallelism=1
```

## Finding the Right Parallelism Value

The optimal parallelism depends on your cloud provider's API rate limits and the types of resources you manage.

### Testing Different Values

```bash
#!/bin/bash
# benchmark-parallelism.sh
# Test different parallelism values to find the sweet spot

for p in 5 10 15 20 30; do
  echo "Testing parallelism=$p..."
  start=$(date +%s)
  terraform apply -auto-approve -parallelism=$p 2>&1 | tail -1
  end=$(date +%s)
  echo "Parallelism $p: $((end - start)) seconds"

  # Destroy and recreate for consistent benchmarks
  terraform destroy -auto-approve -parallelism=$p > /dev/null 2>&1
done
```

Typical findings:

| Provider | Sweet Spot | Notes |
|----------|-----------|-------|
| AWS | 15-25 | IAM and CloudFront APIs have lower limits |
| Azure | 10-20 | Resource Manager has per-subscription limits |
| GCP | 20-30 | Generally more lenient rate limits |

## Handling Race Conditions

Some resources have hidden dependencies that Terraform does not know about. When created concurrently, these can fail.

### AWS Security Group Rules

Creating multiple security group rules for the same security group simultaneously can cause conflicts:

```hcl
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = var.vpc_id
}

# These rules might conflict when created concurrently
resource "aws_security_group_rule" "http" {
  security_group_id = aws_security_group.app.id
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "https" {
  security_group_id = aws_security_group.app.id
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}
```

The fix is to use inline rules instead:

```hcl
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Or add explicit dependencies to serialize them:

```hcl
resource "aws_security_group_rule" "https" {
  security_group_id = aws_security_group.app.id
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]

  # Force this rule to be created after the HTTP rule
  depends_on = [aws_security_group_rule.http]
}
```

### IAM Policy Attachments

Attaching multiple policies to the same role concurrently can fail:

```hcl
# These might fail if created concurrently
resource "aws_iam_role_policy_attachment" "policy_a" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "policy_b" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess"
}
```

Chain them with dependencies:

```hcl
resource "aws_iam_role_policy_attachment" "policy_b" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess"

  depends_on = [aws_iam_role_policy_attachment.policy_a]
}
```

## Dealing with Eventual Consistency

Cloud provider APIs are often eventually consistent. A resource might be "created" according to the API, but not yet visible to other API calls. This causes failures when a concurrent operation tries to reference the newly created resource.

### Using Retry with Terraform

Most providers have built-in retry logic for eventually consistent APIs. The AWS provider, for example, waits and retries when a resource is not found immediately after creation.

You can also use `time_sleep` as a workaround:

```hcl
resource "aws_iam_role" "app" {
  name = "app-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# Wait for IAM role to propagate
resource "time_sleep" "wait_for_role" {
  depends_on      = [aws_iam_role.app]
  create_duration = "10s"
}

resource "aws_iam_instance_profile" "app" {
  name = "app-profile"
  role = aws_iam_role.app.name

  depends_on = [time_sleep.wait_for_role]
}
```

This is a blunt workaround. Use it only for known consistency issues, not as a general pattern.

## Optimizing for Maximum Concurrency

To get the most concurrent operations, minimize serial dependency chains:

```hcl
# Bad: Serial chain
# VPC -> Subnet -> Security Group -> Instance -> EIP
# 5 serial operations, no concurrency

# Better: Wide dependency tree
# VPC -> Subnet A (parallel)
#     -> Subnet B (parallel)
#     -> Internet Gateway (parallel)
#     -> Security Group (parallel)
# Then:
# Subnet A + SG -> Instance A (parallel)
# Subnet B + SG -> Instance B (parallel)
```

Structure your code so that independent resources do not accidentally depend on each other:

```hcl
# Independent resources - created in parallel
resource "aws_s3_bucket" "logs" {
  bucket = "app-logs"
}

resource "aws_sqs_queue" "events" {
  name = "app-events"
}

resource "aws_sns_topic" "alerts" {
  name = "app-alerts"
}

# These three have no dependencies on each other
# Terraform creates all three simultaneously
```

## Debugging Concurrency Issues

When concurrent operations fail, it can be hard to tell if the issue is a race condition or a genuine configuration error. Run with parallelism=1 to test:

```bash
# If this succeeds but parallelism=10 fails, you have a concurrency issue
terraform apply -parallelism=1
```

Enable debug logging to see the exact order of operations:

```bash
export TF_LOG=DEBUG
terraform apply -parallelism=10 2>&1 | tee debug.log

# Find the order operations were executed
grep "starting apply" debug.log
```

## Managing Concurrent State Locks

When running multiple Terraform configurations that share a backend, state locking prevents concurrent modifications:

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

If two pipelines try to modify the same state simultaneously, one will get a lock error:

```
Error: Error locking state: Error acquiring the state lock: ConditionalCheckFailedException
```

This is by design. Do not disable locking. Instead, queue your applies or use separate state files for independent resources.

## Summary

Terraform's concurrent resource creation is powerful but requires attention to detail. Tune the parallelism setting based on your provider's rate limits. Watch for race conditions with resources that share the same parent (like security group rules). Handle eventual consistency with provider retries or targeted waits. Structure your dependencies to maximize the width of your graph and minimize serial chains.

For monitoring the resources created by your Terraform pipelines, [OneUptime](https://oneuptime.com) provides real-time visibility into resource health and performance across your infrastructure.
