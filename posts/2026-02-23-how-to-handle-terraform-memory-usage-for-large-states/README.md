# How to Handle Terraform Memory Usage for Large States

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Memory, Performance, State Management, DevOps

Description: Diagnose and fix Terraform memory issues when working with large state files containing hundreds or thousands of resources.

---

Terraform loads the entire state file into memory during every operation. For small projects, this is not a problem. But when your state file grows to tens of megabytes with thousands of resources, Terraform's memory usage can spike to several gigabytes, causing crashes, slow performance, or out-of-memory errors in constrained environments like CI/CD runners.

This post covers how to diagnose memory problems, reduce memory usage, and work around the limitations.

## How Terraform Uses Memory

Terraform's memory consumption comes from several sources during a plan or apply:

1. **State file parsing**: The entire JSON state file is loaded and deserialized into Go data structures
2. **Provider schemas**: Each provider's schema is loaded into memory
3. **Dependency graph**: Terraform builds an in-memory graph of all resource dependencies
4. **Plan data**: The diff between current and desired state is computed and stored
5. **Provider plugin communication**: Each provider runs as a separate process, communicating via gRPC

For a state file with 2,000 resources, the in-memory representation can be 5-10x larger than the JSON file on disk. A 20 MB state file might consume 100-200 MB of RAM just for state parsing.

## Diagnosing Memory Issues

First, check your state file size:

```bash
# For S3 backend
aws s3 ls s3://my-terraform-state/production/terraform.tfstate

# For local state
ls -lh terraform.tfstate

# Count resources in state
terraform state list | wc -l
```

Monitor Terraform's actual memory usage during a plan:

```bash
# On Linux, use /usr/bin/time for detailed resource usage
/usr/bin/time -v terraform plan 2>&1 | grep "Maximum resident"

# On macOS
/usr/bin/time -l terraform plan 2>&1 | grep "maximum resident"
```

You can also watch memory usage in real time:

```bash
# Start terraform in the background and monitor it
terraform plan &
TERRAFORM_PID=$!

# Monitor memory every second
while kill -0 $TERRAFORM_PID 2>/dev/null; do
  ps -o rss= -p $TERRAFORM_PID | awk '{printf "Memory: %.0f MB\n", $1/1024}'
  sleep 1
done
```

## Splitting State to Reduce Memory

The most effective way to reduce memory usage is to reduce the size of each state file by splitting your project. Instead of one project with 3,000 resources, have 10 projects with 300 resources each.

```bash
# Check how many resources are in your state
terraform state list | wc -l

# If over 500, consider splitting
# Move resources to a new state
terraform state mv -state-out=networking.tfstate \
  'module.networking' 'module.networking'
```

See our post on [splitting large Terraform projects](https://oneuptime.com/blog/post/2026-02-23-how-to-split-large-terraform-projects-for-performance/view) for a detailed guide on how to do this.

## Increasing Available Memory

Sometimes splitting is not immediately feasible. In that case, give Terraform more memory.

### CI/CD Runner Sizing

For GitHub Actions, use a larger runner:

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest-8-cores  # Larger runner with more RAM
    steps:
      - uses: actions/checkout@v4
      - run: terraform plan
```

For GitLab CI, request more resources:

```yaml
terraform-plan:
  tags:
    - large-runner  # Tag for runners with more memory
  script:
    - terraform plan
```

### Docker Container Memory Limits

If running Terraform in Docker, increase the memory limit:

```bash
# Run with 4 GB memory limit
docker run --memory=4g hashicorp/terraform:1.7 plan
```

### Go Runtime Tuning

Terraform is written in Go. You can tune the Go garbage collector to trade CPU time for lower memory usage:

```bash
# Make the garbage collector more aggressive about freeing memory
# Lower values = more frequent GC = lower peak memory but slower execution
export GOGC=50

terraform plan
```

The default `GOGC` value is 100. Setting it to 50 makes the garbage collector run twice as often, which can reduce peak memory by 20-30% at the cost of some CPU overhead.

## Reducing State File Size

Beyond splitting, you can reduce the amount of data stored in state.

### Remove Unnecessary Resources from State

If you have resources that no longer need Terraform management:

```bash
# Remove a resource from state without destroying it
terraform state rm aws_cloudwatch_log_group.old_logs

# Remove an entire module from state
terraform state rm module.deprecated_service
```

### Avoid Storing Large Values in State

Some resources store large blobs in state. For example, `aws_lambda_function` stores the deployment package hash, and `aws_s3_bucket_object` can reference large files. Use external storage instead:

```hcl
# Instead of embedding the Lambda zip in Terraform
resource "aws_lambda_function" "api" {
  function_name = "api-handler"

  # Reference S3 instead of local file
  s3_bucket = aws_s3_bucket.deployments.id
  s3_key    = "lambda/api-handler-${var.version}.zip"

  runtime = "nodejs18.x"
  handler = "index.handler"
  role    = aws_iam_role.lambda.arn
}
```

### Clean Up State Cruft

Over time, state files accumulate metadata that may no longer be relevant. You can compact the state:

```bash
# Pull state, then push it back
# This effectively re-serializes it, removing any cruft
terraform state pull > state.json
terraform state push state.json
```

## Using -target to Reduce Plan Memory

When you need to make a quick change and memory is tight, use `-target` to limit what Terraform loads:

```bash
# Only plan for specific resources
terraform plan -target=module.api_gateway

# This loads less of the dependency graph into memory
```

This is a workaround, not a permanent solution. But it can unblock you when a full plan runs out of memory.

## Optimizing Provider Memory Usage

Each provider plugin runs as a separate process. If you have many providers, each one consumes memory independently. Minimize the number of providers you use:

```hcl
# Check your required_providers block
# Do you really need all of these?
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # Remove providers you no longer use
    # random = {
    #   source = "hashicorp/random"
    # }
  }
}
```

Also, avoid using multiple aliases for the same provider unless necessary. Each alias creates a separate provider instance:

```hcl
# Each alias is a separate process consuming memory
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}
```

If you only need cross-region references occasionally, consider using data sources instead of separate provider instances.

## Monitoring Memory in Production Pipelines

Set up alerts for when Terraform pipelines approach memory limits:

```bash
#!/bin/bash
# terraform-with-memory-check.sh
# Run terraform and check memory usage

MAX_MEMORY_MB=3000  # Alert if memory exceeds 3 GB

terraform plan &
TF_PID=$!

while kill -0 $TF_PID 2>/dev/null; do
  MEM_KB=$(ps -o rss= -p $TF_PID 2>/dev/null || echo 0)
  MEM_MB=$((MEM_KB / 1024))

  if [ "$MEM_MB" -gt "$MAX_MEMORY_MB" ]; then
    echo "WARNING: Terraform memory usage is ${MEM_MB} MB (threshold: ${MAX_MEMORY_MB} MB)"
    # Send alert to your monitoring system
  fi

  sleep 5
done

wait $TF_PID
exit $?
```

## Summary

Terraform's memory usage scales with state file size. For large infrastructure, the primary solution is splitting state files to keep each one manageable. When that is not immediately possible, increase available memory, tune the Go garbage collector, and use `-target` for focused operations. Keep an eye on state file size and resource count as leading indicators of memory problems. Addressing memory issues early prevents surprise failures in production pipelines.

For comprehensive monitoring of your infrastructure and CI/CD pipelines, [OneUptime](https://oneuptime.com) offers alerting and observability tools that help you catch issues before they impact your team.
