# How to Use Provider Aliases in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Provider Aliases, Multi-Region, Infrastructure as Code

Description: Learn how to configure and mock provider aliases in OpenTofu tests to test multi-region and multi-account infrastructure modules.

## Introduction

Provider aliases allow a single module to deploy resources across multiple AWS regions, Azure subscriptions, or GCP projects. Testing these modules requires configuring aliases in your test files to match how the module expects providers to be passed in.

## How Provider Aliases Work in Modules

A module that deploys to two regions requires two provider configurations:

```hcl
# modules/multi-region/main.tf

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.primary, aws.secondary]
    }
  }
}

# Deploy in the primary region

resource "aws_s3_bucket" "primary" {
  provider = aws.primary
  bucket   = "${var.name}-primary"
}

# Replicate to the secondary region
resource "aws_s3_bucket" "secondary" {
  provider = aws.secondary
  bucket   = "${var.name}-secondary"
}
```

## Configuring Aliases in Real Provider Tests

In test files, use multiple `provider` blocks with the `alias` argument:

```hcl
# tests/multi_region_real.tftest.hcl

provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

provider "aws" {
  alias  = "secondary"
  region = "us-west-2"
}

run "both_buckets_created" {
  command = apply

  variables {
    name = "my-replicated-data"
  }

  assert {
    condition     = aws_s3_bucket.primary.region == "us-east-1"
    error_message = "Primary bucket should be in us-east-1"
  }

  assert {
    condition     = aws_s3_bucket.secondary.region == "us-west-2"
    error_message = "Secondary bucket should be in us-west-2"
  }
}
```

## Mocking Provider Aliases

Use `mock_provider` with the `alias` argument for credential-free testing:

```hcl
# tests/multi_region_mock.tftest.hcl

mock_provider "aws" {
  alias = "primary"

  mock_resource "aws_s3_bucket" {
    defaults = {
      region = "us-east-1"
    }
  }
}

mock_provider "aws" {
  alias = "secondary"

  mock_resource "aws_s3_bucket" {
    defaults = {
      region = "us-west-2"
    }
  }
}

run "primary_bucket_in_correct_region" {
  variables {
    name = "test-bucket"
  }

  assert {
    condition     = aws_s3_bucket.primary.region == "us-east-1"
    error_message = "Primary bucket region mismatch"
  }
}
```

## Multi-Account Testing Example

```hcl
# Module uses two AWS accounts
# provider "aws" { alias = "shared_services" }
# provider "aws" { alias = "workload" }

mock_provider "aws" {
  alias = "shared_services"

  mock_resource "aws_iam_role" {
    defaults = {
      arn  = "arn:aws:iam::111111111111:role/cross-account-role"
      name = "cross-account-role"
    }
  }
}

mock_provider "aws" {
  alias = "workload"

  mock_resource "aws_iam_role_policy_attachment" {
    defaults = {
      id = "attachment-mock-id"
    }
  }
}

run "cross_account_role_assumption" {
  assert {
    condition     = aws_iam_role.cross_account.arn != ""
    error_message = "Cross-account role should have an ARN"
  }
}
```

## Passing Aliased Providers to Modules in Tests

When the aliased module itself is the module under test, define test providers with the same alias names the module declares. If you wrap that module in a separate harness root, pass aliases there with the normal `providers` argument:

```hcl
# tests/child_module_aliased.tftest.hcl

mock_provider "aws" { alias = "primary" }
mock_provider "aws" { alias = "secondary" }

run "module_receives_provider_aliases" {
  module {
    source = "./modules/replication"
  }

  assert {
    condition     = output.replication_enabled == true
    error_message = "Replication should be enabled across both regions"
  }
}
```

## Conclusion

Provider aliases in test files mirror how real multi-region or multi-account modules are configured. By combining aliases with `mock_provider`, you can test complex cross-region architectures instantly without touching real cloud infrastructure.
