# How to Test Variable Validation Rules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Variable Validation, Input Validation, Test Framework

Description: Learn how to comprehensively test OpenTofu variable validation rules, ensuring they reject invalid inputs and accept valid ones, covering edge cases and boundary conditions.

## Introduction

Variable validation rules in OpenTofu are a critical defensive layer that prevents misconfigured infrastructure from being planned. Testing them thoroughly - both that they accept valid values and reject invalid ones - ensures your module boundaries hold as configurations evolve.

## Variables with Validation Rules to Test

```hcl
# modules/vpc/variables.tf

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC (e.g., 10.0.0.0/16)"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }

  validation {
    condition = (
      split("/", var.vpc_cidr)[1] >= 16 &&
      split("/", var.vpc_cidr)[1] <= 24
    )
    error_message = "VPC CIDR prefix must be between /16 and /24"
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of AZs to use (minimum 2)"

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones are required for HA"
  }

  validation {
    condition     = length(var.availability_zones) <= 3
    error_message = "Maximum 3 availability zones supported"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}
```

## Comprehensive Validation Tests

```hcl
# tests/variable_validation.tftest.hcl

mock_provider "aws" {}

# ===== vpc_cidr tests =====

run "valid_cidr_16" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/16"
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
  # Should succeed
}

run "valid_cidr_24" {
  command = plan
  variables {
    vpc_cidr           = "172.16.0.0/24"
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
  # Should succeed
}

run "invalid_cidr_not_cidr" {
  command = plan
  variables {
    vpc_cidr           = "not-a-cidr"
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
  expect_failures = [var.vpc_cidr]
}

run "invalid_cidr_prefix_too_short" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/8"  # /8 is shorter than the /16 minimum
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
  expect_failures = [var.vpc_cidr]
}

run "invalid_cidr_prefix_too_long" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/28"  # /28 is longer than the /24 maximum
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
  expect_failures = [var.vpc_cidr]
}

# Boundary: exactly /16 (lower bound)
run "boundary_cidr_exactly_16" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/16"
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
  # Should succeed - exactly at boundary
}

# Boundary: exactly /24 (upper bound)
run "boundary_cidr_exactly_24" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/24"
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
  # Should succeed - exactly at boundary
}

# ===== availability_zones tests =====

run "valid_two_azs" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/16"
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
}

run "valid_three_azs" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/16"
    availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
    environment        = "dev"
  }
}

run "invalid_one_az" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/16"
    availability_zones = ["us-east-1a"]  # Only 1, minimum is 2
    environment        = "dev"
  }
  expect_failures = [var.availability_zones]
}

run "invalid_four_azs" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/16"
    availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"]
    environment        = "dev"
  }
  expect_failures = [var.availability_zones]
}

# ===== environment tests =====

run "valid_environment_dev" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/16"
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "dev"
  }
}

run "invalid_environment_uppercase" {
  command = plan
  variables {
    vpc_cidr           = "10.0.0.0/16"
    availability_zones = ["us-east-1a", "us-east-1b"]
    environment        = "PROD"  # Case-sensitive - must be lowercase
  }
  expect_failures = [var.environment]
}
```

## Running Validation Tests

```bash
# Run all validation tests
tofu test -filter=tests/variable_validation.tftest.hcl -verbose

# Expected output:
# run "valid_cidr_16"... pass
# run "invalid_cidr_not_cidr"... pass (failure expected and received)
# run "invalid_one_az"... pass (failure expected and received)
```

## Conclusion

Comprehensive variable validation testing requires testing both the happy path (valid values pass) and multiple invalid inputs, including boundary conditions. Use descriptive test names that document what's being tested and why it should fail. Boundary condition tests (testing exactly at the minimum/maximum allowed value) are particularly important and often reveal off-by-one errors in validation conditions.
