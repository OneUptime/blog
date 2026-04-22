# How to Use Setup and Teardown in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to implement setup and teardown patterns in OpenTofu tests using setup modules, run block sequencing, and the destroy behavior of the test framework.

## Introduction

OpenTofu tests automatically handle cleanup: after a test file completes, the framework destroys all resources created during `apply` runs in reverse order. For setup (creating prerequisites), use setup modules referenced in `run` blocks. This guide explains how the lifecycle works and how to implement robust setup and teardown patterns.

## Automatic Teardown

OpenTofu automatically destroys applied resources when a test file completes:

```text
Test lifecycle:
1. Run "setup" block → apply → creates VPC, subnets
2. Run "test" block → apply → creates main resources
3. Run "verify" block → apply → verifies state
4. All tests complete or fail
5. OpenTofu destroys: main resources → VPC, subnets (reverse order)
```

This means you don't need to write explicit teardown - it's automatic.

## Setup with a Dedicated Setup Module

```hcl
# tests/setup/main.tf - creates test prerequisites

terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}

variable "vpc_cidr" {
  type = string
}

variable "suffix" {
  type = string
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "test" {
  cidr_block = var.vpc_cidr
  tags = {
    Name    = "test-vpc-${var.suffix}"
    TestRun = var.suffix
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.test.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = {
    Name    = "test-private-${count.index}-${var.suffix}"
    TestRun = var.suffix
  }
}

resource "aws_security_group" "test" {
  name   = "test-sg-${var.suffix}"
  vpc_id = aws_vpc.test.id
  tags = {
    Name    = "test-sg-${var.suffix}"
    TestRun = var.suffix
  }
}
```

```hcl
# tests/setup/outputs.tf
output "vpc_id"            { value = aws_vpc.test.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "security_group_id" { value = aws_security_group.test.id }
```

```hcl
# tests/integration.tftest.hcl

variables {
  suffix = formatdate("YYYYMMDDhhmmss", timestamp())
}

# SETUP: Create prerequisites using setup module
run "setup" {
  module {
    source = "./tests/setup"
  }

  variables {
    vpc_cidr = "10.100.0.0/16"
    suffix   = var.suffix
  }
}

# TEST: Use setup outputs
run "creates_database" {
  command = apply

  variables {
    vpc_id     = run.setup.vpc_id
    subnet_ids = run.setup.private_subnet_ids
    sg_id      = run.setup.security_group_id
  }

  assert {
    condition     = output.db_endpoint != ""
    error_message = "Database should have an endpoint after creation"
  }
}

# TEARDOWN: Happens automatically - OpenTofu destroys
# run.creates_database resources, then run.setup resources
```

## Setup for Unit Tests (No Real Resources)

For unit tests, setup is just setting variables:

```hcl
# No external setup needed for unit tests
mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = { id = "vpc-test" }
  }
}

# "Setup" is just the variables block
variables {
  vpc_cidr    = "10.0.0.0/16"
  environment = "test"
  region      = "us-east-1"
}

run "validate_configuration" {
  command = plan

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block should match input"
  }
}
```

## Handling Teardown Failures

If teardown fails (resources can't be destroyed), OpenTofu reports the error and writes an `errored_test.tfstate` file if resources remain in state:

```bash
tofu test

# tests/integration.tftest.hcl... in progress
#   run "setup"... pass
#   run "creates_database"... pass
#
# Error: deleting EC2 VPC: DependencyViolation
# OpenTofu reports the left-over resources and writes them to errored_test.tfstate.
# Use that state file to find and clean up the resources manually.
```

To prevent orphaned resources, use unique naming:

```hcl
variables {
  # Use timestamp to create unique resource names
  # Orphaned resources are identifiable and time-bounded
  suffix = "test-${formatdate("YYYYMMDDhhmmss", timestamp())}"
}
```

## Setup for a Real AWS Environment

```hcl
# tests/integration.tftest.hcl

variables {
  region = "us-east-1"
}

provider "aws" {
  region = var.region
}

run "setup_networking" {
  module {
    source = "./tests/setup/networking"
  }
}

run "test_with_real_vpc" {
  command = apply

  variables {
    vpc_id = run.setup_networking.vpc_id
  }

  assert {
    condition     = output.resource_arn != ""
    error_message = "Resource ARN should be populated"
  }
}
```

## CI/CD Integration

```yaml
# Ensure cleanup happens even if tests fail
- name: Run integration tests
  run: |
    tofu init
    tofu test -filter=tests/integration.tftest.hcl
  # OpenTofu handles teardown automatically, even on test failure

- name: List resources for emergency cleanup (if OpenTofu teardown failed)
  if: always()
  run: |
    aws resourcegroupstaggingapi get-resources \
      --tag-filters Key=TestRun \
      --query 'ResourceTagMappingList[*].ResourceARN' \
      --output text
    # Delete the returned ARNs with service-specific AWS CLI commands.
```

## Conclusion

OpenTofu's test framework handles teardown automatically - resources created with `command = apply` are destroyed after the test file completes, in reverse order. Use setup modules to create prerequisites, reference their outputs in subsequent runs, and rely on automatic cleanup. Use unique suffixes with timestamps to make orphaned resources identifiable if cleanup fails. For unit tests with mocked providers, no teardown is needed since no real resources are created.
