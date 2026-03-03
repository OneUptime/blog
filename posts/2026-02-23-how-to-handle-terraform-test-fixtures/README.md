# How to Handle Terraform Test Fixtures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Fixtures, Modules, Infrastructure as Code

Description: Learn how to create and manage test fixtures for Terraform modules including setup resources, mock data, shared configurations, and cleanup strategies.

---

Test fixtures in Terraform are pre-configured resources and configurations that your tests depend on. They set up the preconditions your tests need - a VPC that already exists, an IAM role with specific permissions, or a set of variables that represent a realistic scenario. Good fixture management makes your tests reliable, fast, and maintainable. Bad fixture management leads to flaky tests, orphaned resources, and tests that only work on one person's machine.

## What Are Terraform Test Fixtures?

Fixtures come in several forms:

- **Variable fixtures**: Pre-defined variable files for different test scenarios
- **Setup modules**: Terraform configurations that create prerequisite resources
- **Mock providers**: Fake providers that return predictable data
- **State fixtures**: Pre-built state files for testing state operations
- **Data fixtures**: JSON or HCL files with test data

## Directory Structure for Fixtures

Organize your fixtures alongside your tests:

```text
modules/
  networking/
    main.tf
    variables.tf
    outputs.tf
    tests/
      unit.tftest.hcl
      integration.tftest.hcl
      fixtures/
        default.tfvars       # Standard test variables
        minimal.tfvars       # Minimum viable config
        production.tfvars    # Production-like config
        setup/               # Setup module for prerequisites
          main.tf
          outputs.tf
        data/                # Mock data files
          ami-lookup.json
          vpc-data.json
```

## Variable Fixtures

The simplest fixture type is a `.tfvars` file with known-good inputs.

```hcl
# tests/fixtures/default.tfvars
# Default test configuration - used by most tests

vpc_cidr           = "10.0.0.0/16"
environment        = "test"
availability_zones = ["us-east-1a", "us-east-1b"]
enable_nat_gateway = true
tags = {
  Environment = "test"
  Project     = "fixture-test"
  ManagedBy   = "terraform"
}
```

```hcl
# tests/fixtures/minimal.tfvars
# Minimum configuration for fast tests

vpc_cidr           = "10.0.0.0/16"
environment        = "test"
availability_zones = ["us-east-1a"]
enable_nat_gateway = false
tags = {
  Environment = "test"
}
```

```hcl
# tests/fixtures/production.tfvars
# Production-like configuration for realistic testing

vpc_cidr           = "10.0.0.0/16"
environment        = "production"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
enable_nat_gateway = true
enable_vpn_gateway = true
tags = {
  Environment = "production"
  Project     = "webapp"
  CostCenter  = "engineering"
  ManagedBy   = "terraform"
  Compliance  = "soc2"
}
```

Reference them in native tests:

```hcl
# tests/unit.tftest.hcl

# Use the default fixture
run "default_config" {
  command = plan
  variables {
    # Load from fixture file
  }

  # Or inline the variables
  variables {
    vpc_cidr           = "10.0.0.0/16"
    environment        = "test"
    availability_zones = ["us-east-1a", "us-east-1b"]
  }

  assert {
    condition     = length(output.private_subnet_ids) == 2
    error_message = "Default config should create 2 private subnets"
  }
}
```

Or with Terratest:

```go
// test/networking_test.go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestWithDefaultFixture(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        // Load variables from fixture file
        VarFiles: []string{"tests/fixtures/default.tfvars"},
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    subnets := terraform.OutputList(t, opts, "private_subnet_ids")
    assert.Len(t, subnets, 2)
}

func TestWithMinimalFixture(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        VarFiles:     []string{"tests/fixtures/minimal.tfvars"},
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    subnets := terraform.OutputList(t, opts, "private_subnet_ids")
    assert.Len(t, subnets, 1)
}
```

## Setup Modules as Fixtures

When your module depends on existing resources (like a VPC that must already exist), create a setup module that provisions those dependencies.

```hcl
# tests/fixtures/setup/main.tf
# Creates prerequisite resources for testing

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Unique suffix to avoid naming conflicts in parallel tests
resource "random_id" "suffix" {
  byte_length = 4
}

# Create the VPC our module will deploy into
resource "aws_vpc" "test" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "test-vpc-${random_id.suffix.hex}"
  }
}

# Create subnets the module needs
resource "aws_subnet" "test" {
  count             = 2
  vpc_id            = aws_vpc.test.id
  cidr_block        = cidrsubnet(aws_vpc.test.cidr_block, 8, count.index)
  availability_zone = element(["us-east-1a", "us-east-1b"], count.index)

  tags = {
    Name = "test-subnet-${count.index}-${random_id.suffix.hex}"
  }
}

# Outputs consumed by the module under test
output "vpc_id" {
  value = aws_vpc.test.id
}

output "subnet_ids" {
  value = aws_subnet.test[*].id
}

output "test_suffix" {
  value = random_id.suffix.hex
}
```

Use the setup module in native tests:

```hcl
# tests/integration.tftest.hcl

# Run the setup fixture first
run "setup" {
  module {
    source = "./tests/fixtures/setup"
  }
}

# Now test the actual module using setup outputs
run "deploy_into_existing_vpc" {
  variables {
    vpc_id     = run.setup.vpc_id
    subnet_ids = run.setup.subnet_ids
    name       = "test-${run.setup.test_suffix}"
  }

  assert {
    condition     = output.cluster_id != ""
    error_message = "Should create a cluster in the provided VPC"
  }
}
```

## Shared Fixtures Across Tests

When multiple test files need the same setup, use a shared module that all tests reference.

```hcl
# tests/fixtures/shared/main.tf
# Shared fixture used by multiple test suites

variable "test_name" {
  type        = string
  description = "Name of the test using this fixture"
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_vpc" "shared" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name    = "${var.test_name}-${random_id.suffix.hex}"
    Purpose = "testing"
  }
}

output "vpc_id" {
  value = aws_vpc.shared.id
}

output "suffix" {
  value = random_id.suffix.hex
}
```

## Fixture Cleanup

The most common source of test failures (and unexpected AWS bills) is fixtures that do not get cleaned up. Here are strategies for reliable cleanup.

### Defer Pattern in Terratest

```go
func TestWithFixtures(t *testing.T) {
    t.Parallel()

    // Setup fixture
    fixtureOpts := &terraform.Options{
        TerraformDir: "../tests/fixtures/setup",
    }

    // Always destroy fixture, even if test fails
    defer terraform.Destroy(t, fixtureOpts)
    terraform.InitAndApply(t, fixtureOpts)

    // Setup module under test
    moduleOpts := &terraform.Options{
        TerraformDir: "../modules/compute",
        Vars: map[string]interface{}{
            "vpc_id": terraform.Output(t, fixtureOpts, "vpc_id"),
        },
    }

    // Destroy module resources before fixture
    // Order matters - module depends on fixture
    defer terraform.Destroy(t, moduleOpts)
    terraform.InitAndApply(t, moduleOpts)

    // Test assertions here
}
```

### Tag-Based Cleanup

Tag all fixture resources so a cleanup script can find them:

```hcl
# tests/fixtures/setup/main.tf
locals {
  test_tags = {
    Purpose    = "terraform-testing"
    TestSuite  = var.test_name
    CreatedAt  = timestamp()
    TTL        = "2h"  # Auto-cleanup after 2 hours
  }
}

resource "aws_vpc" "test" {
  cidr_block = "10.0.0.0/16"
  tags       = merge(local.test_tags, { Name = "test-vpc" })
}
```

```bash
#!/bin/bash
# scripts/cleanup-test-fixtures.sh
# Find and destroy resources tagged as test fixtures older than TTL

# Find VPCs tagged as test fixtures
aws ec2 describe-vpcs \
  --filters "Name=tag:Purpose,Values=terraform-testing" \
  --query 'Vpcs[?Tags[?Key==`CreatedAt`]]' \
  --output json | \
  jq -r '.[] | select(
    (.Tags[] | select(.Key=="CreatedAt") | .Value | fromdateiso8601) <
    (now - 7200)
  ) | .VpcId' | while read vpc_id; do
    echo "Cleaning up test VPC: $vpc_id"
    # Delete VPC and dependencies
done
```

### Nightly Cleanup Job

```yaml
# .github/workflows/cleanup.yml
name: Test Fixture Cleanup

on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2 AM daily

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_CLEANUP_ROLE }}
          aws-region: us-east-1
      - name: Run Cleanup
        run: ./scripts/cleanup-test-fixtures.sh
```

## Fixture Best Practices

1. **Use random suffixes** to prevent naming conflicts when tests run in parallel
2. **Tag everything** with a test identifier for easy cleanup
3. **Use the smallest resources possible** to save costs (t3.nano, not m5.xlarge)
4. **Set TTLs** so orphaned fixtures get cleaned up automatically
5. **Isolate fixtures per test** to prevent test interference
6. **Version your fixtures** alongside the module they support

Good fixture management is what separates reliable tests from flaky ones. Invest in it early and you will spend less time debugging test failures and more time catching real issues.

For more on testing infrastructure, see [How to Handle Test Cleanup in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-test-cleanup-in-terraform/view) and [How to Use Test Helpers for Common Terraform Patterns](https://oneuptime.com/blog/post/2026-02-23-how-to-use-test-helpers-for-common-terraform-patterns/view).
