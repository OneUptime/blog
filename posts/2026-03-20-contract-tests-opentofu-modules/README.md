# How to Set Up Contract Tests for OpenTofu Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Contract Tests, Module Interface, API Testing

Description: Learn how to write contract tests for OpenTofu modules that verify module interfaces - inputs, outputs, and behavior - remain stable as modules evolve, preventing breaking changes for consumers.

## Introduction

Contract tests verify the interface of an OpenTofu module: the inputs it accepts, the outputs it produces, and the behavioral guarantees it makes. They protect consumers from breaking changes when modules are updated and serve as executable documentation of the module's public API.

## What Contract Tests Verify

- Required variables accept valid values
- Optional variables have sensible defaults
- All documented outputs are produced and non-empty
- Output types match expectations (string, list, map)
- Behavioral contracts (e.g., "when `enable_nat_gateway = false`, no NAT gateway is created")

## Basic Contract Test

```hcl
# tests/contract.tftest.hcl

# This file is the "contract" - what consumers can rely on

mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id         = "vpc-contract-test"
      cidr_block = "10.0.0.0/16"
    }
  }
  mock_resource "aws_subnet" {
    defaults = {
      id                = "subnet-contract-test"
      availability_zone = "us-east-1a"
    }
  }
  mock_resource "aws_internet_gateway" {
    defaults = { id = "igw-contract-test" }
  }
  mock_resource "aws_nat_gateway" {
    defaults = { id = "nat-contract-test" }
  }
  mock_resource "aws_route_table" {
    defaults = { id = "rt-contract-test" }
  }
  mock_resource "aws_eip" {
    defaults = { id = "eip-contract-test", public_ip = "1.2.3.4" }
  }
}

# CONTRACT: The module accepts these required inputs
run "contract_accepts_required_inputs" {
  command = plan

  variables {
    # These are the required inputs the contract guarantees to accept
    vpc_cidr    = "10.0.0.0/16"
    environment = "prod"
    name_prefix = "myapp"
  }

  # Should succeed without error
}

# CONTRACT: The module produces these outputs
run "contract_produces_required_outputs" {
  command = plan

  variables {
    vpc_cidr    = "10.0.0.0/16"
    environment = "test"
    name_prefix = "test"
    azs         = ["us-east-1a", "us-east-1b"]
    private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
    public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]
  }

  assert {
    condition     = output.vpc_id != null && output.vpc_id != ""
    error_message = "CONTRACT VIOLATION: output 'vpc_id' must be a non-empty string"
  }

  assert {
    condition     = output.vpc_cidr != null
    error_message = "CONTRACT VIOLATION: output 'vpc_cidr' must be present"
  }

  assert {
    condition     = length(output.private_subnet_ids) > 0
    error_message = "CONTRACT VIOLATION: output 'private_subnet_ids' must be a non-empty list"
  }

  assert {
    condition     = length(output.public_subnet_ids) > 0
    error_message = "CONTRACT VIOLATION: output 'public_subnet_ids' must be a non-empty list"
  }
}

# CONTRACT: NAT gateway behavior
run "contract_nat_gateway_disabled" {
  command = plan

  variables {
    vpc_cidr           = "10.0.0.0/16"
    environment        = "test"
    enable_nat_gateway = false
    azs                = ["us-east-1a"]
    private_subnet_cidrs = ["10.0.1.0/24"]
    public_subnet_cidrs  = ["10.0.101.0/24"]
  }

  assert {
    condition     = length(aws_nat_gateway.this) == 0
    error_message = "CONTRACT VIOLATION: when enable_nat_gateway=false, no NAT gateways must be created"
  }
}

# CONTRACT: Environment tag propagation
run "contract_environment_tag_propagated" {
  command = plan

  variables {
    vpc_cidr    = "10.0.0.0/16"
    environment = "staging"
    name_prefix = "myapp"
    azs         = ["us-east-1a"]
    private_subnet_cidrs = ["10.0.1.0/24"]
    public_subnet_cidrs  = ["10.0.101.0/24"]
  }

  assert {
    condition     = aws_vpc.main.tags["Environment"] == "staging"
    error_message = "CONTRACT VIOLATION: Environment tag must be propagated to the VPC"
  }
}
```

## Versioning Contract Tests

When releasing a new major version, add new contract tests before removing old guarantees:

```hcl
# tests/contract_v2.tftest.hcl
# New contracts added in v2.0.0

mock_provider "aws" {}

# CONTRACT (v2.0.0+): Module now supports multiple CIDRs
run "contract_v2_supports_secondary_cidrs" {
  command = plan

  variables {
    vpc_cidr          = "10.0.0.0/16"
    secondary_cidrs   = ["100.64.0.0/16"]  # New in v2
    environment       = "test"
  }

  assert {
    condition     = length(aws_vpc_ipv4_cidr_block_association.secondary) == 1
    error_message = "CONTRACT VIOLATION (v2.0): secondary_cidrs must create CIDR associations"
  }
}
```

## Documenting Breaking Changes

```hcl
# In the module's CHANGELOG.md:
# v2.0.0 BREAKING CHANGES:
# - Renamed output 'subnet_ids' to 'private_subnet_ids'
# - Removed input 'enable_private_subnets' (always enabled now)
# - Changed input 'azs' from list(string) to set(string)
```

## CI Integration

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  pull_request:
    paths: ['modules/**']

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
      - name: Run contract tests
        run: |
          for module in modules/*/; do
            if [ -f "$module/tests/contract.tftest.hcl" ]; then
              echo "Testing $module"
              tofu -chdir="$module" test -verbose
            fi
          done
```

## Conclusion

Contract tests serve as executable documentation and change detection for module interfaces. Run them in CI on every pull request to catch breaking changes before they reach consumers. When you need to make a breaking change, update the contract tests to reflect the new interface, increment the major version, and document the migration path clearly in the changelog.
