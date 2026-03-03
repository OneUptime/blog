# How to Use Terraform with Resource Batching Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Performance, Infrastructure as Code, Optimization

Description: Learn how to batch Terraform resource creation and updates for faster deployments and better management of large-scale infrastructure.

---

When you are managing hundreds or thousands of resources with Terraform, applying everything at once can be slow, risky, and hard to debug. Resource batching - the practice of grouping related resources and applying them in controlled batches - gives you faster deployments, safer rollouts, and better visibility into what changed.

This is not a built-in Terraform feature with a single flag you can flip. It is a set of patterns and techniques that experienced teams use to manage large infrastructure efficiently. Let us walk through the strategies.

## Why Batching Matters

Consider a scenario where you have 200 AWS resources in a single Terraform configuration. When you run `terraform apply`, Terraform tries to create or update all of them, respecting dependency ordering but otherwise running up to 10 operations in parallel (the default).

The problems with this approach:

- If something fails halfway through, you have a partially applied state that is hard to reason about
- Debugging which resource caused a failure among 200 is painful
- API rate limits from your cloud provider can cause intermittent failures
- The blast radius of a mistake is your entire infrastructure

Batching lets you apply changes in smaller, controlled groups.

## Strategy 1: Structural Batching with Separate State Files

The most common batching strategy is to physically separate your Terraform code into independent configurations, each with its own state file:

```text
infrastructure/
  batch-01-foundation/
    main.tf           # VPC, subnets, route tables
    outputs.tf
  batch-02-security/
    main.tf           # Security groups, IAM roles
    outputs.tf
  batch-03-data/
    main.tf           # RDS, ElastiCache, S3
    outputs.tf
  batch-04-compute/
    main.tf           # EC2, ECS, Lambda
    outputs.tf
  batch-05-monitoring/
    main.tf           # CloudWatch, alerts
    outputs.tf
```

Each batch is applied in order, and later batches reference earlier ones via remote state:

```hcl
# batch-02-security/main.tf
data "terraform_remote_state" "foundation" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "prod/batch-01-foundation/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_security_group" "app" {
  vpc_id = data.terraform_remote_state.foundation.outputs.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.terraform_remote_state.foundation.outputs.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Apply them in sequence with a simple script:

```bash
#!/bin/bash
# apply-all.sh - Apply batches in order

set -e

BATCHES=(
  "batch-01-foundation"
  "batch-02-security"
  "batch-03-data"
  "batch-04-compute"
  "batch-05-monitoring"
)

for batch in "${BATCHES[@]}"; do
  echo "Applying $batch..."
  cd "infrastructure/$batch"
  terraform init -input=false
  terraform apply -auto-approve -lock-timeout=5m
  cd ../..
  echo "$batch applied successfully."
done
```

## Strategy 2: Target-Based Batching

When you cannot or do not want to restructure your code, use `-target` to apply specific resources in batches:

```bash
# Batch 1: Apply networking resources first
terraform apply \
  -target=aws_vpc.main \
  -target=aws_subnet.private \
  -target=aws_subnet.public \
  -target=aws_internet_gateway.main \
  -target=aws_nat_gateway.main

# Batch 2: Apply security resources
terraform apply \
  -target=aws_security_group.app \
  -target=aws_security_group.db \
  -target=aws_iam_role.app

# Batch 3: Apply compute resources
terraform apply \
  -target=aws_instance.app \
  -target=aws_lb.app
```

This is useful for one-off situations, but do not rely on it as a permanent workflow. Terraform explicitly warns that `-target` is for exceptional cases. If you find yourself using it regularly, restructure your code into separate state files.

## Strategy 3: Parallelism Control

Terraform's `-parallelism` flag controls how many resource operations run concurrently. The default is 10. Adjusting this is a simple form of batching:

```bash
# Reduce parallelism to avoid API rate limits
terraform apply -parallelism=5

# Increase parallelism when your provider can handle it
# and you want faster applies
terraform apply -parallelism=30

# Serial execution for debugging - one resource at a time
terraform apply -parallelism=1
```

Lower parallelism means fewer concurrent API calls, which helps with rate limiting:

```hcl
# For AWS, you might hit API throttling with the default parallelism
# when managing many resources of the same type
provider "aws" {
  region = "us-east-1"

  # Also configure retry behavior for API throttling
  retry_mode  = "adaptive"
  max_retries = 10
}
```

## Strategy 4: Dynamic Batching with count and for_each

You can build batching logic directly into your Terraform code. This is useful when creating many similar resources:

```hcl
# Create instances in batches using depends_on
variable "instances_per_batch" {
  default = 10
}

variable "total_instances" {
  default = 50
}

locals {
  # Calculate batch assignments
  batch_count = ceil(var.total_instances / var.instances_per_batch)
  batches = {
    for i in range(var.total_instances) :
    "instance-${i}" => {
      batch = floor(i / var.instances_per_batch)
      index = i
    }
  }
}

# Create a null_resource for each batch to establish ordering
resource "null_resource" "batch_gate" {
  for_each = toset([for i in range(local.batch_count) : tostring(i)])

  # Each batch depends on the previous one
  depends_on = []

  triggers = {
    batch = each.key
  }
}

resource "aws_instance" "app" {
  for_each = local.batches

  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"

  tags = {
    Name  = each.key
    Batch = each.value.batch
  }
}
```

## Strategy 5: Phased Rollouts with Workspaces

Use workspaces to create a phased rollout strategy where you apply changes to one environment at a time:

```bash
#!/bin/bash
# phased-rollout.sh - Apply to environments in phases

set -e

# Phase 1: Dev
echo "Phase 1: Applying to dev..."
terraform workspace select dev
terraform apply -auto-approve
echo "Dev applied. Waiting 10 minutes for validation..."
sleep 600

# Phase 2: Staging
echo "Phase 2: Applying to staging..."
terraform workspace select staging
terraform apply -auto-approve
echo "Staging applied. Waiting 30 minutes for validation..."
sleep 1800

# Phase 3: Production
echo "Phase 3: Applying to production..."
terraform workspace select prod
terraform apply -auto-approve
echo "Production applied."
```

You can automate the validation steps between phases:

```bash
# validate-deployment.sh - Check health between phases
check_health() {
  local environment=$1
  local endpoint=$2

  echo "Checking health for $environment..."

  for i in {1..30}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint/health")
    if [ "$STATUS" = "200" ]; then
      echo "$environment is healthy."
      return 0
    fi
    echo "Attempt $i: Got $STATUS, waiting..."
    sleep 10
  done

  echo "ERROR: $environment health check failed."
  return 1
}
```

## Strategy 6: Module-Level Batching

Group related resources into modules and apply modules as batches using `-target`:

```hcl
# main.tf
module "networking" {
  source = "./modules/networking"
  # ...
}

module "security" {
  source     = "./modules/security"
  vpc_id     = module.networking.vpc_id
  depends_on = [module.networking]
}

module "application" {
  source           = "./modules/application"
  security_group_id = module.security.app_sg_id
  subnet_ids       = module.networking.private_subnet_ids
  depends_on       = [module.security]
}
```

```bash
# Apply module by module
terraform apply -target=module.networking
terraform apply -target=module.security
terraform apply -target=module.application
```

## Strategy 7: Rate-Limited Batching for API-Heavy Operations

Some cloud operations are rate-limited. When creating many resources of the same type, you might need to explicitly slow things down:

```hcl
# Use time_sleep to add delays between batch operations
resource "time_sleep" "wait_between_batches" {
  depends_on = [aws_instance.batch_1]

  # Wait 30 seconds for API rate limits to reset
  create_duration = "30s"
}

resource "aws_instance" "batch_2" {
  count = 10
  depends_on = [time_sleep.wait_between_batches]

  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
}
```

## Automating Batch Applies in CI/CD

Here is a complete CI/CD pipeline that applies batches with health checks between each:

```yaml
# GitHub Actions workflow for batched Terraform applies
name: Batched Infrastructure Deploy

on:
  push:
    branches: [main]

jobs:
  apply-foundation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd infrastructure/batch-01-foundation
          terraform init
          terraform apply -auto-approve -lock-timeout=5m

  apply-security:
    needs: apply-foundation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd infrastructure/batch-02-security
          terraform init
          terraform apply -auto-approve -lock-timeout=5m

  apply-compute:
    needs: apply-security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd infrastructure/batch-03-compute
          terraform init
          terraform apply -auto-approve -lock-timeout=5m

  validate:
    needs: apply-compute
    runs-on: ubuntu-latest
    steps:
      - name: Health Check
        run: |
          curl -f https://app.example.com/health || exit 1
```

## Choosing the Right Strategy

The right batching strategy depends on your situation:

- **New project with clean architecture**: Use structural batching with separate state files from the start
- **Existing monolith you want to improve**: Start with parallelism tuning and target-based batching, then gradually extract into separate state files
- **Many similar resources**: Use dynamic batching with for_each and parallelism control
- **Multi-environment rollouts**: Use phased rollouts with validation between environments
- **API rate limit issues**: Use rate-limited batching with time_sleep resources

Monitor your deployment times and error rates with a tool like [OneUptime](https://oneuptime.com) to measure the impact of your batching strategy and adjust as needed. The goal is to find the sweet spot between speed and safety for your specific infrastructure.
