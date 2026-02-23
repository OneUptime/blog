# How to Use Mock Providers in Terraform Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Mock Providers, Unit Tests, Infrastructure as Code

Description: Learn how to use mock providers in Terraform tests to run fast unit tests without cloud credentials, API calls, or real infrastructure costs.

---

One of the biggest barriers to testing Terraform is the need for cloud credentials and the cost of creating real resources. Mock providers solve this by replacing real cloud APIs with simulated responses. Your tests run in seconds, need no credentials, and cost nothing. Terraform 1.7 introduced built-in mock provider support in the test framework, making this dramatically easier than it used to be.

## Why Mock Providers Matter

Without mock providers, even a simple `command = plan` test needs valid provider credentials because Terraform contacts the provider API during the planning phase to read data sources, validate resource arguments, and compute default values. Mock providers intercept these calls and return synthetic data instead.

This means you can:
- Run tests in CI without configuring cloud credentials for unit tests
- Test locally without any cloud account
- Run tests much faster since there are no API calls
- Test error handling scenarios that are hard to reproduce with real providers

## Enabling Mock Providers

In your `.tftest.hcl` file, add a `mock_provider` block:

```hcl
# tests/unit.tftest.hcl
# Unit tests using mock providers

# Mock the AWS provider - no real API calls
mock_provider "aws" {}

run "test_vpc_configuration" {
  command = plan

  variables {
    vpc_cidr    = "10.0.0.0/16"
    environment = "test"
  }

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR should match input"
  }

  assert {
    condition     = aws_vpc.main.tags["Environment"] == "test"
    error_message = "VPC should be tagged with the environment"
  }
}
```

The empty `mock_provider "aws" {}` block tells Terraform to simulate all AWS resources and data sources. Resource attributes that you set in your configuration (like `cidr_block` and `tags`) are available in assertions. Computed attributes (like `id` and `arn`) get synthetic values.

## How Mock Providers Generate Values

When a resource attribute is computed by the provider (not set in your configuration), the mock provider generates a value based on the attribute's type:

- **string** - generates a placeholder string
- **number** - generates 0
- **bool** - generates false
- **list** - generates an empty list
- **map** - generates an empty map

This matters for assertions. If you try to assert on a computed attribute like `aws_vpc.main.id`, you will get a synthetic value, not a real VPC ID.

## Overriding Mock Data

You can control what values mock providers return using `mock_data` blocks:

```hcl
mock_provider "aws" {
  # Override data for a specific data source
  mock_data "aws_ami" {
    defaults = {
      id           = "ami-12345678"
      architecture = "x86_64"
      name         = "test-ami"
    }
  }

  # Override data for a specific resource type
  mock_data "aws_instance" {
    defaults = {
      id                = "i-0123456789abcdef0"
      private_ip        = "10.0.1.50"
      availability_zone = "us-east-1a"
    }
  }
}

run "test_instance_ami" {
  command = plan

  variables {
    ami_filter = "my-custom-ami-*"
  }

  # The data source returns our mock values
  assert {
    condition     = data.aws_ami.selected.id == "ami-12345678"
    error_message = "Should use the mocked AMI ID"
  }

  assert {
    condition     = data.aws_ami.selected.architecture == "x86_64"
    error_message = "AMI should have x86_64 architecture"
  }
}
```

## Mocking Multiple Providers

If your module uses multiple providers, mock each one:

```hcl
# Mock all providers used by the module
mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
      arn        = "arn:aws:iam::123456789012:root"
    }
  }
}

mock_provider "random" {}

mock_provider "tls" {}

run "test_multi_provider_module" {
  command = plan

  variables {
    environment = "test"
  }

  assert {
    condition     = aws_iam_role.app.name == "test-app-role"
    error_message = "IAM role name should include the environment"
  }
}
```

## Mocking Provider Aliases

If your module uses provider aliases, mock them with the `alias` attribute:

```hcl
# Mock the default AWS provider
mock_provider "aws" {}

# Mock an aliased provider for a different region
mock_provider "aws" {
  alias = "eu_west"
}

run "test_multi_region" {
  command = plan

  variables {
    primary_region   = "us-east-1"
    secondary_region = "eu-west-1"
  }

  assert {
    condition     = aws_s3_bucket.primary.bucket != ""
    error_message = "Primary bucket should be created"
  }

  assert {
    condition     = aws_s3_bucket.secondary.bucket != ""
    error_message = "Secondary bucket should be created"
  }
}
```

## Using Mock Providers with override_data

For data sources that your module reads, you often need to provide specific mock values. The `mock_data` block lets you do this per data source type:

```hcl
mock_provider "aws" {
  # Mock the VPC data source
  mock_data "aws_vpc" {
    defaults = {
      id         = "vpc-mock123"
      cidr_block = "10.0.0.0/16"
      tags = {
        Name = "mock-vpc"
      }
    }
  }

  # Mock subnet data source
  mock_data "aws_subnets" {
    defaults = {
      ids = ["subnet-aaa", "subnet-bbb", "subnet-ccc"]
    }
  }

  # Mock availability zones
  mock_data "aws_availability_zones" {
    defaults = {
      names = ["us-east-1a", "us-east-1b", "us-east-1c"]
      ids   = ["use1-az1", "use1-az2", "use1-az3"]
    }
  }
}

run "test_subnet_creation" {
  command = plan

  variables {
    vpc_id = "vpc-mock123"
  }

  # The module reads subnets from a data source
  # Mock data ensures it gets predictable values
  assert {
    condition     = length(aws_subnet.app) == 3
    error_message = "Should create a subnet in each availability zone"
  }
}
```

## Combining Mock and Real Providers

In some cases, you want to mock some providers and use real ones for others. For example, mock AWS but use the real `random` provider:

```hcl
# Mock AWS - no API calls
mock_provider "aws" {}

# Use the real random provider - it does not need credentials
# (Just don't include a mock_provider block for it)

run "test_with_random_names" {
  command = plan

  variables {
    environment = "test"
  }

  # random_id generates a real value even in plan mode
  assert {
    condition     = length(random_id.suffix.hex) > 0
    error_message = "Random suffix should be generated"
  }
}
```

## Practical Example - Testing an EKS Module

Here is a realistic example of mocking providers for a complex EKS module:

```hcl
# tests/eks-unit.tftest.hcl
# Unit tests for the EKS module

mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_data "aws_partition" {
    defaults = {
      partition = "aws"
    }
  }

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
}

mock_provider "kubernetes" {}
mock_provider "tls" {}

variables {
  cluster_name    = "test-cluster"
  cluster_version = "1.29"
  vpc_id          = "vpc-12345"
  subnet_ids      = ["subnet-aaa", "subnet-bbb"]
}

run "cluster_naming" {
  command = plan

  assert {
    condition     = aws_eks_cluster.this.name == "test-cluster"
    error_message = "Cluster name should match input"
  }

  assert {
    condition     = aws_eks_cluster.this.version == "1.29"
    error_message = "Cluster version should match input"
  }
}

run "cluster_iam_role" {
  command = plan

  assert {
    condition     = can(regex("test-cluster", aws_iam_role.cluster.name))
    error_message = "IAM role name should include the cluster name"
  }
}

run "node_group_configuration" {
  command = plan

  variables {
    node_groups = {
      default = {
        instance_types = ["t3.medium"]
        min_size       = 1
        max_size       = 5
        desired_size   = 2
      }
    }
  }

  assert {
    condition     = aws_eks_node_group.this["default"].scaling_config[0].min_size == 1
    error_message = "Node group min size should be 1"
  }

  assert {
    condition     = aws_eks_node_group.this["default"].scaling_config[0].max_size == 5
    error_message = "Node group max size should be 5"
  }
}
```

## Limitations of Mock Providers

Mock providers are powerful but have limits:

1. **No provider logic** - Mock providers do not execute any provider-side validation. If a real provider would reject a configuration, the mock will accept it.

2. **Computed values are synthetic** - You cannot rely on computed attributes having realistic values. An `aws_vpc.main.id` from a mock will not look like a real VPC ID unless you override it.

3. **No cross-resource references from providers** - If a provider normally populates attributes based on other resources (like a subnet's VPC ID), mocks will not do this automatically.

4. **Data source behavior differs** - Real data sources query APIs to find existing resources. Mocked data sources return whatever you configure in `mock_data`, or empty defaults.

Despite these limitations, mock providers are the right choice for unit tests that focus on configuration logic rather than provider behavior.

## When to Use Mocks vs Real Providers

Use mock providers when:
- Testing variable validation and conditional logic
- Verifying resource configuration attributes you set directly
- Testing module composition and output values
- Running in CI without cloud credentials

Use real providers when:
- Testing that resources actually deploy and function
- Verifying computed attributes and cross-resource references
- Testing data sources that query real infrastructure
- Validating IAM policies and security configurations

The best testing strategy uses both: mock providers for fast unit tests, real providers for thorough integration tests.

For more on the test framework, see [How to Write .tftest.hcl Files for Terraform Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-write-tftest-hcl-files-for-terraform-testing/view) and [How to Write Unit Tests for Terraform with the Built-in Test Framework](https://oneuptime.com/blog/post/2026-02-23-how-to-write-unit-tests-for-terraform-with-the-built-in-test-framework/view).
