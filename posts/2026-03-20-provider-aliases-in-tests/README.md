# Provider Aliases in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Provider, Multi-Region, Infrastructure as Code

Description: Learn how to configure and use provider aliases in OpenTofu test files to test multi-region, multi-account, and multi-provider infrastructure configurations.

## What are Provider Aliases?

Provider aliases allow you to use the same provider with different configurations within a single OpenTofu configuration. In tests, this is particularly useful for:

- Testing multi-region deployments (e.g., primary + DR regions)
- Testing cross-account resource access
- Mocking different provider configurations per test

## Defining Provider Aliases in Test Files

Provider configurations can be defined directly in `.tftest.hcl` files:

```hcl
# tests/multi_region.tftest.hcl

provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

run "deploy_primary" {
  command = apply

  providers = {
    aws      = aws
    aws.west = aws.west
  }

  assert {
    condition     = aws_vpc.primary.id != ""
    error_message = "Primary VPC not created"
  }
}
```

## Passing Providers to Module Tests

When testing a module that requires an aliased provider:

```hcl
# modules/replication/main.tf

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.source, aws.destination]
    }
  }
}

data "aws_region" "source" {
  provider = aws.source
}

data "aws_region" "destination" {
  provider = aws.destination
}
```

In your test:

```hcl
provider "aws" {
  alias  = "source"
  region = "us-east-1"
}

provider "aws" {
  alias  = "destination"
  region = "eu-west-1"
}

run "test_replication" {
  command = apply

  providers = {
    aws.source      = aws.source
    aws.destination = aws.destination
  }
}
```

## Mock Provider Aliases

For fast unit tests, use mock providers with aliases:

```hcl
mock_provider "aws" {
  alias = "primary"
}

mock_provider "aws" {
  alias = "secondary"
}

run "plan_multi_region" {
  command = plan

  providers = {
    aws.primary   = aws.primary
    aws.secondary = aws.secondary
  }

  assert {
    condition     = aws_s3_bucket.primary.bucket != ""
    error_message = "Primary bucket should be planned"
  }
}
```

## Override Provider in Specific Run Blocks

You can override the provider for a specific `run` block without affecting others:

```hcl
# Default provider for all runs
provider "aws" {
  region = "us-east-1"
}

run "us_east_deployment" {
  command = plan
  # Uses default provider (us-east-1)
}

run "eu_west_deployment" {
  command = plan

  # Override provider configuration for this run only
  providers = {
    aws = aws.eu
  }
}

provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}
```

## Testing Cross-Account Access

```hcl
provider "aws" {
  alias  = "prod"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::PROD-ACCOUNT-ID:role/DeployRole"
  }
}

provider "aws" {
  alias  = "shared"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::SHARED-ACCOUNT-ID:role/ReadRole"
  }
}

run "cross_account_test" {
  command = plan

  providers = {
    aws.prod   = aws.prod
    aws.shared = aws.shared
  }
}
```

## Verifying Provider Configuration

```hcl
# main.tf

data "aws_region" "current" {}

# main.tftest.hcl

run "check_region" {
  command = plan

  assert {
    condition     = data.aws_region.current.name == "us-east-1"
    error_message = "Expected us-east-1 region"
  }
}
```

## Best Practices

1. **Define all provider aliases at the file level** for clarity
2. **Use mock providers** for unit tests to avoid real cloud calls
3. **Use explicit `providers` blocks** in `run` blocks to be clear about which provider each test uses
4. **Test each provider configuration independently** before combining them
5. **Document the purpose of each alias** with comments in the test file

## Conclusion

Provider aliases in OpenTofu test files enable comprehensive testing of multi-region, multi-account, and multi-provider configurations. By combining real and mock providers strategically, you can test complex infrastructure patterns efficiently without excessive cloud costs.
