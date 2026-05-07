# How to Handle API Throttling During Large Applies in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, API Throttling, AWS, Performance, Best Practice, Infrastructure as Code

Description: Learn how to handle AWS API throttling errors during large OpenTofu applies by configuring parallelism, retry settings, and breaking up large configurations.

## Introduction

Large OpenTofu applies that create hundreds of resources simultaneously can hit AWS API rate limits, resulting in `RequestThrottled` or `ThrottlingException` errors. This guide covers strategies to reduce throttling and recover gracefully.

## Reducing Parallelism

The most direct solution is limiting how many resources OpenTofu creates concurrently.

```bash
# Default parallelism is 10; reduce for throttle-prone operations

tofu apply -parallelism=5

# For very large applies with many IAM/S3 calls
tofu apply -parallelism=3
```

## AWS Provider Retry Configuration

The AWS provider has built-in retry logic that you can tune.

```hcl
provider "aws" {
  region = var.region

  retry_mode = "adaptive"

  # Maximum number of retries for API calls
  max_retries = 30  # default is 25; increase for heavily throttled environments
}
```

## Splitting Large Configurations

Break a monolithic configuration into smaller configurations that can be applied independently.

```text
infrastructure/
├── networking/          # VPC, subnets, route tables
├── security/            # IAM roles, security groups, KMS
├── compute/             # EC2, ECS, Lambda
└── data/                # RDS, ElastiCache, DynamoDB
```

Apply each component separately:

```bash
# Apply networking first (fewer API calls)
tofu -chdir=infrastructure/networking apply

# Then security
tofu -chdir=infrastructure/security apply

# Then compute (most resources, reduce parallelism)
tofu -chdir=infrastructure/compute apply -parallelism=5
```

## Using -target for Surgical Applies

During large creates, use `-target` only for exceptional cases when you need to apply or recover a subset of resources.

```bash
# Apply just IAM resources first (exceptional use, not a routine workflow)
tofu apply -target=aws_iam_role.app -target=aws_iam_policy.app

# Then the rest
tofu apply
```

## Exponential Backoff in Scripts

If applying from a script, add exponential backoff retry logic.

```bash
#!/usr/bin/env bash
# scripts/apply-with-retry.sh

MAX_ATTEMPTS=5
ATTEMPT=1

until tofu apply -parallelism=5 -auto-approve; do
  if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
    echo "Apply failed after $MAX_ATTEMPTS attempts"
    exit 1
  fi

  WAIT=$((2 ** ATTEMPT))  # 2, 4, 8, 16 seconds
  echo "Apply failed (attempt $ATTEMPT/$MAX_ATTEMPTS). Retrying in ${WAIT}s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$WAIT"
done

echo "Apply succeeded on attempt $ATTEMPT"
```

## IAM Eventual Consistency Workaround

IAM changes have eventual consistency, which can cause downstream resource creation to fail.

```hcl
resource "aws_iam_role" "app" {
  name = "${var.app_name}-role"
  # ...
}

# Add a deliberate wait after IAM changes propagate
resource "time_sleep" "wait_for_iam" {
  depends_on = [
    aws_iam_role_policy_attachment.app,
    aws_iam_instance_profile.app
  ]

  create_duration = "10s"  # wait 10 seconds for IAM to propagate globally
}

resource "aws_instance" "app" {
  depends_on           = [time_sleep.wait_for_iam]
  iam_instance_profile = aws_iam_instance_profile.app.name
  # ...
}
```

## Summary

API throttling during large OpenTofu applies can be mitigated by reducing parallelism, splitting configurations into smaller configurations, using `-target` selectively for exceptional cases, and adding retry logic in scripts. The `time_sleep` resource handles IAM eventual consistency issues that can cause cascading failures.
