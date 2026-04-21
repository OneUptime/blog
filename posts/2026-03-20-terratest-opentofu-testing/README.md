# How to Use OpenTofu with Terratest for Integration Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terratest, Testing, Infrastructure as Code, IaC, Integration Testing

Description: Learn how to write Terratest integration tests for OpenTofu modules using Go to validate infrastructure deployments.

## Introduction

Learn how to write Terratest integration tests for OpenTofu modules using Go to validate infrastructure deployments. Terratest can run the OpenTofu CLI, deploy real infrastructure, validate the result with provider APIs, and clean up the test resources afterward.

## Prerequisites

- OpenTofu v1.9+ installed
- Go 1.21.1 or later installed
- Basic knowledge of OpenTofu concepts
- Relevant AWS credentials configured

## Step 1: Set Up the Environment

```bash
# Verify OpenTofu and Go installation
tofu version
go version

# Create a Go test module
mkdir -p test
cd test
go mod init github.com/mycompany/infrastructure/test

# Add Terratest dependencies
go get github.com/gruntwork-io/terratest/modules/terraform
go get github.com/gruntwork-io/terratest/modules/aws
go get github.com/gruntwork-io/terratest/modules/random
go get github.com/stretchr/testify/require

# Set up required environment variables
export TF_INPUT=false  # Disable interactive input
export TF_IN_AUTOMATION=true  # Tell OpenTofu it is running in automation

# Configure AWS credentials for the VPC test
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
```

## Step 2: Configure Your OpenTofu Project

```hcl
# examples/vpc/main.tf
terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "aws_region" {
  description = "AWS region for the test deployment"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the test VPC"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr must be a valid IPv4 CIDR block."
  }
}

variable "name_prefix" {
  description = "Unique name prefix for test resources"
  type        = string
}

locals {
  common_tags = {
    Name        = var.name_prefix
    ManagedBy   = "OpenTofu"
    Environment = "test"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "vpc_cidr" {
  value = aws_vpc.main.cidr_block
}
```

## Step 3: Implement the Core Feature

```go
// test/vpc_test.go
package test

import (
    "fmt"
    "strings"
    "testing"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/require"
)

func TestVpcModule(t *testing.T) {
    t.Parallel()

    awsRegion := "us-east-1"
    vpcCidr := "10.99.0.0/16"
    namePrefix := fmt.Sprintf("terratest-%s", strings.ToLower(random.UniqueId()))

    tofuOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformBinary: "tofu",
        TerraformDir:    "../examples/vpc",

        Vars: map[string]interface{}{
            "aws_region":  awsRegion,
            "vpc_cidr":    vpcCidr,
            "name_prefix": namePrefix,
        },

        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    })

    defer terraform.Destroy(t, tofuOptions)

    terraform.InitAndApply(t, tofuOptions)

    vpcID := terraform.Output(t, tofuOptions, "vpc_id")
    require.NotEmpty(t, vpcID)

    vpc := aws.GetVpcById(t, vpcID, awsRegion)
    require.NotNil(t, vpc.CidrBlock)
    require.Equal(t, vpcCidr, *vpc.CidrBlock)
    require.Equal(t, namePrefix, vpc.Tags["Name"])
}
```

```bash
# Download any transitive Go dependencies
cd test
go mod tidy

# Run the integration test
go test -v -run TestVpcModule -timeout 30m -count=1
```

## Step 4: Set Up Automation

```yaml
# .github/workflows/infrastructure-tests.yml
name: OpenTofu Terratest

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  terratest:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v6

      - name: Setup Go
        uses: actions/setup-go@v6
        with:
          go-version: "stable"
          cache-dependency-path: test/go.sum

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.11.6"
          tofu_wrapper: false

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6.1.0
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Run Terratest
        working-directory: test
        env:
          TF_INPUT: "false"
          TF_IN_AUTOMATION: "true"
        run: go test -v -timeout 30m -count=1 ./...
```

## Step 5: Monitor and Verify

```bash
# Run all Terratest tests with verbose output
cd test
go test -v -timeout 30m -count=1 ./...

# Run a specific test
go test -v -run TestVpcModule -timeout 30m -count=1

# Enable OpenTofu debug logging for a failing test
TF_LOG=DEBUG go test -v -run TestVpcModule -timeout 30m -count=1

# Inspect state if a debug run is interrupted before cleanup
tofu -chdir=../examples/vpc state list
```

## Step 6: Implement Best Practices

```bash
# Keep integration tests uncached and bounded
go test -v -count=1 -timeout 30m ./...

# Run tests with a dedicated test account or profile
AWS_PROFILE=testing go test -v -count=1 -timeout 30m ./...
```

## Troubleshooting

If you encounter issues:

1. Enable debug logging: `TF_LOG=DEBUG go test -v -run TestVpcModule -timeout 30m -count=1`
2. Check provider credentials: Verify environment variables or run `aws sts get-caller-identity`
3. Review state consistency: Run `tofu -chdir=examples/vpc plan -refresh-only` before making manual cleanup changes
4. Consult provider documentation for service-specific errors

## Conclusion

You have successfully implemented OpenTofu integration testing with Terratest. This approach provides a repeatable, auditable, and collaborative infrastructure testing workflow. Combine with code review processes, automated testing, and proper access controls for a production-ready setup.
