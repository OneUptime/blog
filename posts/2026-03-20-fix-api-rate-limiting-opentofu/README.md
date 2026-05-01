# How to Fix API Rate Limiting Issues in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Rate Limiting, API, Performance, Infrastructure as Code

Description: Learn how to diagnose and resolve API rate limiting errors in OpenTofu caused by applying large configurations that exceed cloud provider API quotas.

## Introduction

Cloud providers enforce API rate limits. When OpenTofu applies large configurations in parallel, it can exceed these limits and receive `429 Too Many Requests` or `ThrottlingException` responses. Most providers retry automatically, but persistent throttling requires configuration changes.

## Common Rate Limit Errors

```text
Error: creating EC2 Instance: RequestLimitExceeded: Request limit exceeded.
  status code: 503

Error: throttling error (ThrottlingException): Rate exceeded
  status code: 400

Error: Error creating resource: googleapi: Error 429: Quota exceeded for quota metric
```

## Fix 1: Reduce Parallelism

OpenTofu applies up to 10 resources concurrently by default. Reducing parallelism generates fewer API calls simultaneously:

```bash
# Reduce to 5 concurrent operations (default is 10)

tofu apply -parallelism=5

# For very large configurations with aggressive rate limits
tofu apply -parallelism=2

# Set permanently in an environment variable
export TF_CLI_ARGS_apply="-parallelism=5"
```

## Fix 2: Split Configuration into Smaller Applies

OpenTofu recommends breaking very large infrastructure into smaller configurations that can be applied independently. If you need a temporary workaround, apply logical groups with pauses between them:

```bash
# Apply infrastructure foundation first
tofu apply -target=aws_vpc.main -target=aws_subnet.private -target=aws_subnet.public

# Then apply compute resources
tofu apply -target=aws_instance.app

# Finally apply application resources
tofu apply
```

## Fix 3: AWS-Specific: Enable Retry Configuration

The AWS provider has configurable retry behavior:

```hcl
provider "aws" {
  region = "us-east-1"

  # Increase retries for throttling and transient failures
  retry_mode  = "standard"
  max_retries = 10
}
```

## Fix 4: GCP-Specific: Manage Quota

```bash
# View Compute Engine API quota usage and limits
# Requires the gcloud alpha component
gcloud alpha services quota list \
  --service=compute.googleapis.com \
  --consumer=projects/my-project

# Request quota increase in GCP Console
# https://console.cloud.google.com/iam-admin/quotas
```

## Fix 5: Add Delays Between Operations

For resources known to trigger rate limits, use `time_sleep`:

```hcl
resource "time_sleep" "wait_after_iam_changes" {
  depends_on      = [aws_iam_role.app]
  create_duration = "10s"
}

resource "aws_iam_role_policy_attachment" "app" {
  depends_on = [time_sleep.wait_after_iam_changes]
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

## Fix 6: Stagger Large for_each Creates

When creating many resources from a single `for_each` or `count` block, OpenTofu can still apply multiple instances concurrently. Break them into batches:

```hcl
# Use count with batch logic to stagger creation
variable "instance_count" {
  default = 50
}

locals {
  batch_1_count = floor(var.instance_count / 2)
  batch_2_count = var.instance_count - local.batch_1_count
}

# Create in two batches separated by a delay
resource "aws_instance" "batch_1" {
  count         = local.batch_1_count
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}

resource "time_sleep" "batch_delay" {
  depends_on      = [aws_instance.batch_1]
  create_duration = "30s"
}

resource "aws_instance" "batch_2" {
  depends_on    = [time_sleep.batch_delay]
  count         = local.batch_2_count
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}
```

## Conclusion

API rate limiting is solved primarily by reducing parallelism and splitting large configurations into smaller configurations or staged applies. Enable provider-level retry configuration for AWS, and use `time_sleep` resources to add deliberate delays between rate-sensitive operations. For persistent quota issues, request a quota increase from your cloud provider.
