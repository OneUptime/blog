# How to Use Provider Mocking in Tests Introduced in OpenTofu 1.8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Provider Mocking, OpenTofu 1.8, Infrastructure as Code

Description: Learn how to use provider mocking in OpenTofu 1.8 tests to test module logic without making real cloud API calls.

## Introduction

OpenTofu 1.8 enhanced the testing framework with provider mocking. Mocked providers return synthetic responses for resource and data source operations, allowing you to test module logic thoroughly without incurring cloud costs or requiring credentials.

## Basic Provider Mock

```hcl
# tests/main.tftest.hcl

# Mock the AWS provider to avoid real API calls

mock_provider "aws" {
  # Override resource behavior for tests
  mock_resource "aws_s3_bucket" {
    defaults = {
      id                          = "mock-bucket-id"
      arn                         = "arn:aws:s3:::mock-bucket"
      bucket_domain_name          = "mock-bucket.s3.amazonaws.com"
      bucket_regional_domain_name = "mock-bucket.s3.us-east-1.amazonaws.com"
      region                      = "us-east-1"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
      arn        = "arn:aws:iam::123456789012:user/test-user"
      user_id    = "AIDACKCEVSQ6C2EXAMPLE"
    }
  }
}

run "creates_bucket_with_correct_name" {
  command = plan

  assert {
    condition     = aws_s3_bucket.main.bucket == "my-app-dev-123456789012"
    error_message = "Bucket name should include account ID suffix"
  }
}
```

## Testing a Module with Mocks

```text
modules/s3-website/
├── main.tf
├── variables.tf
├── outputs.tf
└── tests/
    ├── basic.tftest.hcl
    └── advanced.tftest.hcl
```

```hcl
# modules/s3-website/tests/basic.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_s3_bucket" {
    defaults = {
      id     = "mock-website-bucket"
      arn    = "arn:aws:s3:::mock-website-bucket"
      region = "us-east-1"
    }
  }

  mock_resource "aws_cloudfront_distribution" {
    defaults = {
      id          = "EXXXXXXXXXX"
      arn         = "arn:aws:cloudfront::123456789012:distribution/EXXXXXXXXXX"
      domain_name = "d1234abcd.cloudfront.net"
      status      = "Deployed"
    }
  }

  mock_resource "aws_s3_bucket_policy" {
    defaults = {}
  }
}

variables {
  app_name    = "test-app"
  environment = "test"
  account_id  = "123456789012"
}

run "bucket_name_format" {
  command = plan

  assert {
    condition     = aws_s3_bucket.website.bucket == "test-app-website-test-123456789012"
    error_message = "Bucket name format is incorrect"
  }
}

run "cloudfront_points_to_bucket" {
  command = plan

  assert {
    condition     = aws_cloudfront_distribution.website.origin[0].domain_name == aws_s3_bucket.website.bucket_regional_domain_name
    error_message = "CloudFront origin should point to the S3 bucket"
  }
}
```

## Mocking with Custom Default Values

```hcl
mock_provider "aws" {
  # Set explicit defaults for computed attributes
  mock_resource "aws_db_instance" {
    defaults = {
      id       = "mock-db-test"
      address  = "mock-db.test.example.com"
      endpoint = "mock-db.test.example.com:5432"
    }
  }
}
```

## Running Tests

```bash
# Run all tests in the current module
tofu test

# Run a specific test file
tofu test -filter=tests/basic.tftest.hcl

# Run with verbose output
tofu test -verbose

# Run multiple specific test files
tofu test -filter=tests/basic.tftest.hcl -filter=tests/advanced.tftest.hcl
```

## Testing with Real and Mocked Providers Together

```hcl
# Use real provider for some resources, mock for others
provider "aws" {}

mock_provider "github" {
  mock_resource "github_repository" {
    defaults = {
      full_name  = "my-org/my-repo"
      html_url   = "https://github.com/my-org/my-repo"
      clone_url  = "https://github.com/my-org/my-repo.git"
    }
  }
}
```

## Summary

Provider mocking in OpenTofu 1.8 tests enables thorough module testing without cloud API calls or costs. By defining mock resources and data sources with synthetic responses, you can test naming conventions, resource relationships, and conditional logic quickly in CI/CD pipelines. Combine mocked providers for external dependencies with real providers for integrations that need actual cloud resources.
