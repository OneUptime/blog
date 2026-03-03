# How to Use Terraform with Resource Parallelism

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Parallelism, Performance, Resource Management, DevOps

Description: Configure and tune Terraform resource parallelism to speed up infrastructure provisioning while avoiding rate limits and race conditions.

---

Terraform processes resources in parallel by default, creating, updating, or destroying up to 10 resources simultaneously. This parallelism is one of the reasons Terraform can manage large infrastructure in reasonable time. But the default of 10 is not always optimal. Depending on your situation, you might want to increase it for speed or decrease it for stability.

This post explains how resource parallelism works, how to tune it, and how to handle the problems that come with concurrent operations.

## How Parallelism Works in Terraform

Terraform uses a walk algorithm on the dependency graph. It starts with resources that have no dependencies (the roots), processes them in parallel, then moves to the next level of resources whose dependencies are satisfied.

```text
Level 0: [VPC]
Level 1: [Subnet A] [Subnet B] [Internet GW] [Security Group]
Level 2: [Instance A] [Instance B] [NAT GW]
Level 3: [Route Table] [EIP]
```

With parallelism=10 and 4 resources at Level 1, all 4 are processed simultaneously. The effective parallelism is the minimum of the `-parallelism` setting and the number of resources at each graph level.

## Setting Parallelism

Parallelism is a CLI flag, not a configuration option:

```bash
# Default: 10 concurrent operations
terraform apply

# Higher parallelism for faster execution
terraform apply -parallelism=30

# Lower parallelism to avoid rate limits
terraform apply -parallelism=5

# Serial execution for debugging
terraform apply -parallelism=1
```

You can also set it via environment variable in some wrapper scripts, though Terraform itself does not have a native env var for parallelism. Common approaches:

```bash
# In a CI/CD script
PARALLELISM=${TERRAFORM_PARALLELISM:-10}
terraform apply -parallelism=$PARALLELISM
```

## Finding the Optimal Value

The optimal parallelism depends on several factors:

### Cloud Provider Rate Limits

Each cloud provider has API rate limits. Higher parallelism means more concurrent API calls:

```bash
# AWS: Generally handles 15-25 concurrent operations well
terraform apply -parallelism=20

# Azure: Resource Manager limits vary by subscription
terraform apply -parallelism=15

# GCP: Generally more lenient, can handle higher parallelism
terraform apply -parallelism=30
```

### Resource Types

Some resource types are slow to create and benefit from higher parallelism (since each one takes a long time, more can be in flight):

- **RDS instances**: 5-15 minutes each
- **EKS clusters**: 10-15 minutes each
- **CloudFront distributions**: 15-30 minutes each

Other types are fast and can hit rate limits with high parallelism:

- **IAM policies**: Sub-second creation, low rate limits
- **Security group rules**: Fast creation, shared API limits
- **Route53 records**: Fast but rate-limited

### Benchmarking

The only reliable way to find the optimal value is to test:

```bash
#!/bin/bash
# benchmark-parallelism.sh

# Test with a set of test resources
for p in 5 10 15 20 25 30; do
  echo "=== Parallelism: $p ==="

  # Destroy existing resources
  terraform destroy -auto-approve -parallelism=30 > /dev/null 2>&1

  # Time the apply
  start=$(date +%s)
  terraform apply -auto-approve -parallelism=$p > /dev/null 2>&1
  end=$(date +%s)

  echo "Time: $((end - start)) seconds"
  echo ""
done
```

## Maximizing Effective Parallelism

Even with high `-parallelism`, Terraform can only parallelize resources at the same dependency level. To maximize effective parallelism, minimize unnecessary dependencies.

### Remove Unnecessary depends_on

```hcl
# Unnecessary dependency reduces parallelism
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

resource "aws_sqs_queue" "events" {
  name = "my-events-queue"
  depends_on = [aws_s3_bucket.data]  # Why? These are independent
}

# Fixed: Remove unnecessary dependency
resource "aws_sqs_queue" "events" {
  name = "my-events-queue"
  # Now created in parallel with the S3 bucket
}
```

### Use for_each for Maximum Width

Resources created with `for_each` are independent of each other and can all be created in parallel:

```hcl
# All 10 instances are created in parallel (up to parallelism limit)
resource "aws_instance" "workers" {
  for_each = toset(["worker-1", "worker-2", "worker-3", "worker-4", "worker-5",
                     "worker-6", "worker-7", "worker-8", "worker-9", "worker-10"])

  ami           = var.ami_id
  instance_type = "t3.medium"
  tags = {
    Name = each.key
  }
}
```

### Flatten Module Dependencies

When one module depends on another, all resources in the consuming module wait for all resources in the dependency:

```hcl
# Module B waits for ALL of module A to complete
module "a" {
  source = "./modules/a"
}

module "b" {
  source = "./modules/b"
  input  = module.a.output_value  # Creates full module dependency
}
```

If module B only needs one output from module A, consider restructuring so that specific resource's output is passed directly:

```hcl
# More granular dependency
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

module "b" {
  source = "./modules/b"
  vpc_id = aws_vpc.main.id  # Only depends on the VPC, not all of module A
}
```

## Handling Parallelism-Related Failures

### Rate Limit Errors

If you see throttling errors, reduce parallelism:

```text
Error: error creating Security Group Rule: RequestLimitExceeded: Request limit exceeded.
```

```bash
# Reduce parallelism and retry
terraform apply -parallelism=5
```

### Race Conditions

Some resources have implicit dependencies that Terraform does not know about:

```hcl
# These might conflict when created simultaneously
resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.a.id
  route_table_id = aws_route_table.main.id
}

resource "aws_route_table_association" "b" {
  subnet_id      = aws_subnet.b.id
  route_table_id = aws_route_table.main.id
}
```

If they fail due to concurrent modification of the route table, add an explicit dependency:

```hcl
resource "aws_route_table_association" "b" {
  subnet_id      = aws_subnet.b.id
  route_table_id = aws_route_table.main.id
  depends_on     = [aws_route_table_association.a]
}
```

### Terraform Cloud Parallelism

If you use Terraform Cloud, parallelism is managed differently. The `-parallelism` flag sets the within-run concurrency, but you also have run queue concurrency (how many runs happen across workspaces simultaneously):

```hcl
# Terraform Cloud workspace settings
# Execution Mode: Remote
# The -parallelism flag is passed to the remote run
```

## Parallelism During Destroy

Destroy operations also respect parallelism. Terraform destroys resources in reverse dependency order:

```bash
# Fast destroy with high parallelism
terraform destroy -parallelism=30

# Careful destroy with low parallelism (useful for resources with cleanup dependencies)
terraform destroy -parallelism=5
```

Some resources have long deletion times (like RDS instances with final snapshots). High parallelism helps because more deletions run concurrently.

## Monitoring Concurrent Operations

Track how many operations are actually running in parallel:

```bash
# Watch Terraform's progress output
terraform apply -parallelism=20 2>&1 | grep -E "Creating|Modifying|Destroying"
```

The output shows timestamps, so you can see how many operations overlap:

```text
aws_instance.worker["worker-1"]: Creating...
aws_instance.worker["worker-2"]: Creating...
aws_instance.worker["worker-3"]: Creating...
aws_instance.worker["worker-1"]: Creation complete after 45s
aws_instance.worker["worker-4"]: Creating...
```

Here, 3 instances are creating simultaneously, and a 4th starts as soon as one finishes.

## Summary

Resource parallelism is Terraform's built-in mechanism for fast infrastructure provisioning. The default of 10 is a safe starting point, but tuning it based on your provider, resource types, and constraints can significantly improve performance. Increase it for speed when your provider can handle the load, decrease it when you hit rate limits or race conditions, and structure your dependencies to enable the widest possible parallel execution.

For monitoring the resources created through your parallel Terraform applies, [OneUptime](https://oneuptime.com) provides comprehensive infrastructure monitoring that scales with your deployment.
