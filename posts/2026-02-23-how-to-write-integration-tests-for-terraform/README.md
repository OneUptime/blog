# How to Write Integration Tests for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Integration Tests, Infrastructure as Code, DevOps

Description: Learn how to write integration tests for Terraform that deploy real infrastructure, validate it works correctly, and clean up afterward.

---

Unit tests verify that your Terraform logic is correct on paper. Integration tests go further - they actually deploy infrastructure, run checks against it, and tear it down. This is where you catch the issues that only surface when resources interact with each other and with real cloud APIs.

## Unit Tests vs Integration Tests in Terraform

The difference is simple:

- **Unit tests** use `command = plan`. They validate configuration logic without creating anything. They run in seconds.
- **Integration tests** use `command = apply` (the default). They create real resources, verify their behavior, and destroy them when done. They take minutes.

Both use the same `.tftest.hcl` file format. The only difference is the `command` setting.

## When to Write Integration Tests

You need integration tests when:

- Your module creates resources that depend on each other (VPC with subnets, security groups, and route tables)
- You need to verify that a resource is actually reachable (HTTP endpoint, database connection)
- Provider-specific behavior matters (IAM policy propagation delays, DNS resolution)
- You are testing data sources that query real APIs

Integration tests cost money and time, so use them strategically. Cover the critical paths and interactions that unit tests cannot catch.

## Basic Integration Test

Here is an integration test for a module that creates an S3 bucket with versioning:

```hcl
# tests/integration.tftest.hcl
# Integration tests - these create real AWS resources

# Provider configuration for testing
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      TestRun = "terraform-test"
    }
  }
}

# Test that a versioned bucket is created correctly
run "creates_versioned_bucket" {
  # command = apply is the default, so we do not need to specify it

  variables {
    bucket_name       = "test-bucket-integration-${timestamp()}"
    enable_versioning = true
    environment       = "test"
  }

  # Verify the bucket exists and has the right configuration
  assert {
    condition     = aws_s3_bucket.this.bucket != ""
    error_message = "Bucket should be created"
  }

  assert {
    condition     = aws_s3_bucket_versioning.this.versioning_configuration[0].status == "Enabled"
    error_message = "Versioning should be enabled"
  }

  assert {
    condition     = aws_s3_bucket.this.tags["Environment"] == "test"
    error_message = "Bucket should be tagged with the test environment"
  }
}
```

When you run `terraform test`, this will:
1. Initialize the providers
2. Apply the configuration (create the real S3 bucket)
3. Check all assertions against the actual created resources
4. Destroy all resources created during the test

## Testing Resource Interactions

Integration tests shine when you need to verify that resources work together:

```hcl
# tests/networking.tftest.hcl
# Tests for the networking module - creates real VPC resources

provider "aws" {
  region = "us-east-1"
}

run "vpc_with_subnets" {
  variables {
    vpc_cidr           = "10.99.0.0/16"
    environment        = "integration-test"
    availability_zones = ["us-east-1a", "us-east-1b"]
    private_subnets    = ["10.99.1.0/24", "10.99.2.0/24"]
    public_subnets     = ["10.99.101.0/24", "10.99.102.0/24"]
  }

  # Verify the VPC was created
  assert {
    condition     = aws_vpc.main.cidr_block == "10.99.0.0/16"
    error_message = "VPC should have the correct CIDR block"
  }

  # Verify subnets are in the right VPC
  assert {
    condition     = aws_subnet.private[0].vpc_id == aws_vpc.main.id
    error_message = "Private subnets should belong to the created VPC"
  }

  # Verify public subnets have public IP mapping
  assert {
    condition     = aws_subnet.public[0].map_public_ip_on_launch == true
    error_message = "Public subnets should map public IPs on launch"
  }

  # Verify the right number of subnets
  assert {
    condition     = length(aws_subnet.private) == 2
    error_message = "Should create 2 private subnets"
  }

  assert {
    condition     = length(aws_subnet.public) == 2
    error_message = "Should create 2 public subnets"
  }
}

# This run block uses the state from the previous run
run "nat_gateway_routing" {
  variables {
    vpc_cidr           = "10.99.0.0/16"
    environment        = "integration-test"
    availability_zones = ["us-east-1a", "us-east-1b"]
    private_subnets    = ["10.99.1.0/24", "10.99.2.0/24"]
    public_subnets     = ["10.99.101.0/24", "10.99.102.0/24"]
    enable_nat_gateway = true
  }

  assert {
    condition     = length(aws_nat_gateway.this) > 0
    error_message = "NAT gateway should be created"
  }

  assert {
    condition     = aws_nat_gateway.this[0].subnet_id == aws_subnet.public[0].id
    error_message = "NAT gateway should be in a public subnet"
  }
}
```

## Chaining Test Runs

Test runs execute in sequence. You can reference outputs from earlier runs in later ones:

```hcl
# tests/chained.tftest.hcl
# Tests that build on each other

provider "aws" {
  region = "us-east-1"
}

# First, create the base networking
run "create_vpc" {
  module {
    source = "./modules/vpc"
  }

  variables {
    vpc_cidr    = "10.50.0.0/16"
    environment = "test"
  }

  assert {
    condition     = output.vpc_id != ""
    error_message = "VPC module should output a VPC ID"
  }
}

# Then, create resources that depend on the VPC
run "create_database" {
  module {
    source = "./modules/database"
  }

  variables {
    vpc_id      = run.create_vpc.vpc_id
    subnet_ids  = run.create_vpc.private_subnet_ids
    db_name     = "testdb"
    environment = "test"
  }

  assert {
    condition     = output.endpoint != ""
    error_message = "Database module should output an endpoint"
  }
}
```

## Testing with External Checks

Sometimes you need to validate behavior from outside Terraform. You can use `check` blocks to run HTTP requests or other verifications:

```hcl
# tests/external.tftest.hcl
# Tests that verify external behavior

provider "aws" {
  region = "us-east-1"
}

run "deploy_static_site" {
  variables {
    domain_name = "test-site-integration.example.com"
    index_file  = "index.html"
  }

  # Verify the CloudFront distribution is deployed
  assert {
    condition     = aws_cloudfront_distribution.site.status == "Deployed"
    error_message = "CloudFront distribution should be deployed"
  }

  # Verify the S3 bucket has website configuration
  assert {
    condition     = aws_s3_bucket_website_configuration.site.index_document[0].suffix == "index.html"
    error_message = "S3 bucket should serve index.html as the default document"
  }
}
```

## Handling Test Isolation

Integration tests create real resources, so you need to avoid name collisions:

```hcl
# tests/isolated.tftest.hcl
# Tests with unique resource naming

# Generate a unique suffix for this test run
variables {
  test_id = "t${substr(timestamp(), 11, 8)}"
}

run "isolated_resources" {
  variables {
    # Use the test ID to create unique resource names
    bucket_name    = "my-app-${var.test_id}"
    environment    = "test"
    resource_prefix = "test-${var.test_id}"
  }

  assert {
    condition     = can(regex("^my-app-t", aws_s3_bucket.this.bucket))
    error_message = "Bucket name should include the test ID prefix"
  }
}
```

## Configuring Test Timeouts

Some resources take a long time to create (RDS instances, EKS clusters). You might need to increase the test timeout:

```bash
# Default timeout is 5 minutes per run block
# Set a longer timeout for slow resources
terraform test -timeout=30m
```

## Test Cleanup and Failure Handling

Terraform's test framework automatically destroys resources after tests complete, even if assertions fail. However, if the test process is killed (e.g., CI timeout), resources might be left behind. Protect against this with:

1. **Unique naming** - Include a timestamp or random ID in resource names so orphaned resources are identifiable
2. **Tag everything** - Add a `TestRun` tag so you can find and clean up orphaned resources
3. **Scheduled cleanup** - Run a periodic job that destroys resources tagged as test resources that are older than a few hours

```bash
# Cleanup script for orphaned test resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters "Key=TestRun,Values=terraform-test" \
  --query 'ResourceTagMappingList[].ResourceARN' \
  --output text
```

## CI Pipeline for Integration Tests

Integration tests need cloud credentials and take longer to run. Set them up on a separate CI schedule:

```yaml
# .github/workflows/integration-tests.yml
name: Terraform Integration Tests

on:
  # Run on demand
  workflow_dispatch:
  # Run nightly
  schedule:
    - cron: '0 2 * * *'
  # Run on PRs that modify infrastructure
  pull_request:
    paths:
      - 'modules/**'

jobs:
  integration-test:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      # Use OIDC for AWS authentication
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-test-role
          aws-region: us-east-1

      - name: Run Integration Tests
        run: |
          terraform init
          terraform test -verbose
        timeout-minutes: 45
```

## Reducing Integration Test Costs

Integration tests create real resources that cost money. Some strategies to keep costs down:

- Use the smallest resource sizes possible (t3.micro, db.t3.micro)
- Test in the cheapest region
- Run integration tests only on merge or on a schedule, not on every commit
- Use `command = plan` for everything that does not strictly need real resources
- Set aggressive timeouts so failed tests do not run up bills

## Summary

Integration tests for Terraform provide confidence that your infrastructure actually works when deployed. They catch the bugs that unit tests miss - API errors, permission issues, resource interaction failures, and provider quirks. Use them for critical modules and paths, keep them fast with good naming and small resources, and run them in CI with proper cleanup.

For the foundations of Terraform testing, see [How to Write Unit Tests for Terraform with the Built-in Test Framework](https://oneuptime.com/blog/post/2026-02-23-how-to-write-unit-tests-for-terraform-with-the-built-in-test-framework/view) and [How to Use the terraform test Command](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-terraform-test-command/view).
