# How to Handle API Rate Limiting from Cloud Providers in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Rate Limiting, Performance, Cloud Provider, Infrastructure as Code, AWS

Description: Learn how to handle API rate limiting from AWS, GCP, and Azure when running large OpenTofu operations, including retry configuration, parallelism tuning, and request batching.

## Introduction

Cloud providers enforce per-second and per-minute API call quotas. When OpenTofu issues many requests in parallel - especially during a large initial apply - it can exhaust these quotas, causing retried failures and slow applies. Handling rate limits gracefully keeps your pipelines reliable.

## AWS: Configuring Retry Behavior

The AWS provider handles rate limiting via automatic retry with exponential backoff. You can tune the retry behavior:

```hcl
provider "aws" {
  region = "us-east-1"

  # Enable adaptive retry mode (adjusts based on capacity signals)
  retry_mode  = "adaptive"
  max_retries = 10
}
```

Common rate-limited AWS services include EC2, IAM, and CloudWatch, but exact throttling quotas vary by API, account, and Region.

## Reducing Parallelism to Stay Under Limits

```bash
# Lower concurrency prevents request bursts

tofu apply -parallelism=5

# For IAM-heavy configurations
tofu apply -parallelism=3
```

## Adding Explicit Delays Between Operations

```hcl
# Use time_sleep to add a pause between rate-sensitive operations
resource "time_sleep" "after_iam_propagation" {
  depends_on      = [aws_iam_role_policy_attachment.app]
  create_duration = "15s"
}

resource "aws_ecs_service" "app" {
  # Wait for IAM to propagate before creating the ECS service
  depends_on = [time_sleep.after_iam_propagation]
  # ...
}
```

## GCP: Managing Quota

```bash
# Check which quota is being exceeded
TF_LOG=DEBUG tofu apply 2>&1 | grep -E "429|quotaExceeded"

# View current Compute Engine quotas
gcloud compute project-info describe --format="table(quotas.metric,quotas.usage,quotas.limit)"
```

```hcl
provider "google" {
  project = var.project_id
  region  = "us-central1"
  # Reduce parallelism if you hit persistent quota errors
}
```

## Azure: Understanding Rate Limits

Azure Resource Manager and individual resource providers enforce throttling, and the exact limits vary by operation and resource provider.

```hcl
provider "azurerm" {
  features {}
  # Lower -parallelism if you hit ARM or resource-provider throttling
}
```

## Staggering Large Creates with Batching

```hcl
# Create resources in batches with delays between them
variable "instance_names" {
  default = ["app1", "app2", "app3", "app4", "app5", "app6"]
}

# Batch 1: first 3 instances
resource "aws_instance" "batch1" {
  for_each      = toset(slice(var.instance_names, 0, 3))
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  tags          = { Name = each.key }
}

resource "time_sleep" "between_batches" {
  depends_on      = [aws_instance.batch1]
  create_duration = "30s"
}

# Batch 2: next 3 instances after a delay
resource "aws_instance" "batch2" {
  depends_on    = [time_sleep.between_batches]
  for_each      = toset(slice(var.instance_names, 3, 6))
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  tags          = { Name = each.key }
}
```

## Monitoring Rate Limit Errors

```bash
# Count rate limit errors in a plan/apply log
TF_LOG=DEBUG TF_LOG_PATH=/tmp/apply.log tofu apply
grep -E -c "ThrottlingException|RequestLimitExceeded|429" /tmp/apply.log

# If count > 0, reduce parallelism and retry
```

## Conclusion

API rate limiting is handled through a combination of provider-level retry configuration (AWS `adaptive` mode), reduced parallelism, explicit delays via `time_sleep`, and staggered batch creation. Monitor your applies with debug logging to detect throttling and adjust accordingly.
