# How to Use Contract Tests for Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Contract Tests, Modules, Infrastructure as Code

Description: Learn how to write contract tests for Terraform modules to verify that inputs and outputs meet expected interfaces, preventing breaking changes across teams.

---

When multiple teams depend on a shared Terraform module, changes to that module can break downstream consumers in ways that are hard to predict. A rename of an output, a new required variable, or a change in output type can cascade through dozens of configurations. Contract tests solve this by defining and verifying the interface between a module and its consumers.

## What Are Contract Tests?

Contract tests verify that a module meets an agreed-upon interface. They check:

- Required inputs are accepted with the right types
- Outputs exist with expected names and types
- Default values work correctly
- The module behaves as documented

Think of it like API testing. You are not testing the internal implementation. You are testing that the public surface area works as promised.

## Defining the Contract

Start by documenting the contract your module exposes. This can be a simple list of inputs and outputs with their types and constraints.

```hcl
# contracts/networking-module-contract.md
# Networking Module Contract v2.1
#
# Required Inputs:
#   - vpc_cidr (string): Valid CIDR block, /16 to /24
#   - environment (string): One of dev, staging, production
#   - availability_zones (list(string)): At least 2 AZs
#
# Optional Inputs:
#   - enable_nat_gateway (bool): Default true
#   - tags (map(string)): Default {}
#
# Guaranteed Outputs:
#   - vpc_id (string): AWS VPC ID
#   - private_subnet_ids (list(string)): At least one subnet
#   - public_subnet_ids (list(string)): At least one subnet
#   - nat_gateway_ids (list(string)): Empty if NAT disabled
```

## Writing Contract Tests with Terraform's Native Framework

The native test framework works well for contract testing because you can use `plan` mode to verify the interface without creating real resources.

```hcl
# tests/contract.tftest.hcl

# Define standard test inputs that satisfy the contract
variables {
  vpc_cidr           = "10.0.0.0/16"
  environment        = "dev"
  availability_zones = ["us-east-1a", "us-east-1b"]
}

# Contract: Module accepts required inputs and produces a valid plan
run "accepts_required_inputs" {
  command = plan

  assert {
    condition     = true
    error_message = "Module should accept valid required inputs"
  }
}

# Contract: vpc_id output exists and is a string
run "output_vpc_id_exists" {
  command = apply

  assert {
    condition     = output.vpc_id != null && output.vpc_id != ""
    error_message = "Contract violation: vpc_id output must be a non-empty string"
  }
}

# Contract: private_subnet_ids is a non-empty list
run "output_private_subnets_exist" {
  command = apply

  assert {
    condition     = length(output.private_subnet_ids) >= 1
    error_message = "Contract violation: private_subnet_ids must contain at least one ID"
  }

  # Subnet count should match availability zones
  assert {
    condition     = length(output.private_subnet_ids) == length(var.availability_zones)
    error_message = "Contract violation: should create one private subnet per AZ"
  }
}

# Contract: public_subnet_ids is a non-empty list
run "output_public_subnets_exist" {
  command = apply

  assert {
    condition     = length(output.public_subnet_ids) >= 1
    error_message = "Contract violation: public_subnet_ids must contain at least one ID"
  }
}
```

## Consumer-Driven Contract Tests

The most powerful form of contract testing is consumer-driven. Each team that depends on a module writes tests from their perspective, describing exactly what they need.

```hcl
# tests/consumer-webapp-contract.tftest.hcl
# Contract tests written by the web application team

variables {
  vpc_cidr           = "10.0.0.0/16"
  environment        = "dev"
  availability_zones = ["us-east-1a", "us-east-1b"]
  enable_nat_gateway = true
}

# The webapp team needs private subnets for ECS tasks
run "webapp_needs_private_subnets" {
  command = apply

  assert {
    condition     = length(output.private_subnet_ids) >= 2
    error_message = "Webapp requires at least 2 private subnets for HA"
  }
}

# The webapp team needs NAT gateway IPs for allowlisting
run "webapp_needs_nat_ips" {
  command = apply

  assert {
    condition     = length(output.nat_gateway_ids) >= 1
    error_message = "Webapp requires NAT gateway for outbound traffic"
  }
}

# The webapp team uses vpc_id to configure security groups
run "webapp_needs_vpc_id_format" {
  command = apply

  assert {
    condition     = startswith(output.vpc_id, "vpc-")
    error_message = "Webapp expects vpc_id to be an AWS VPC ID"
  }
}
```

```hcl
# tests/consumer-database-contract.tftest.hcl
# Contract tests written by the database team

variables {
  vpc_cidr           = "10.0.0.0/16"
  environment        = "dev"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# The database team needs subnets in at least 3 AZs for RDS
run "database_needs_three_az_subnets" {
  command = apply

  assert {
    condition     = length(output.private_subnet_ids) >= 3
    error_message = "Database team requires subnets in at least 3 AZs for RDS multi-AZ"
  }
}

# The database team needs the CIDR for security group rules
run "database_needs_vpc_cidr" {
  command = apply

  assert {
    condition     = can(cidrhost(output.vpc_cidr, 0))
    error_message = "Database team needs a valid CIDR block from vpc_cidr output"
  }
}
```

## Contract Tests with Terratest

For Go-based contract testing, create a dedicated contract test file that other teams can run.

```go
// test/contract_test.go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// ContractTestNetworkingModule verifies the networking module
// meets its documented contract.
func TestNetworkingModuleContract(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "vpc_cidr":           "10.0.0.0/16",
            "environment":        "dev",
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Contract: vpc_id output exists and is valid
    t.Run("contract_vpc_id", func(t *testing.T) {
        vpcId := terraform.Output(t, opts, "vpc_id")
        require.NotEmpty(t, vpcId, "vpc_id must not be empty")
        assert.Regexp(t, `^vpc-[a-f0-9]+$`, vpcId)
    })

    // Contract: private subnets match AZ count
    t.Run("contract_private_subnets", func(t *testing.T) {
        subnets := terraform.OutputList(t, opts, "private_subnet_ids")
        assert.Len(t, subnets, 2, "Should have one subnet per AZ")
        for _, s := range subnets {
            assert.Regexp(t, `^subnet-[a-f0-9]+$`, s)
        }
    })

    // Contract: public subnets exist
    t.Run("contract_public_subnets", func(t *testing.T) {
        subnets := terraform.OutputList(t, opts, "public_subnet_ids")
        assert.NotEmpty(t, subnets, "Must have at least one public subnet")
    })
}
```

## Version Pinning and Contract Evolution

Contracts evolve over time. When you need to add a new output or change a type, follow a process that does not break consumers.

```hcl
# Version your module and document contract changes
# modules/networking/versions.tf

terraform {
  required_version = ">= 1.6.0"
}

# In your module README or contract doc:
# v2.0 - Breaking: removed deprecated network_id output, use vpc_id
# v2.1 - Added: nat_gateway_ids output
# v2.2 - Added: vpc_cidr output
```

Write contract tests that cover backward compatibility:

```hcl
# tests/backward-compat.tftest.hcl

# Ensure deprecated outputs still work during transition period
run "deprecated_outputs_still_work" {
  command = apply

  variables {
    vpc_cidr           = "10.0.0.0/16"
    environment        = "dev"
    availability_zones = ["us-east-1a", "us-east-1b"]
  }

  # Old output name should still work during deprecation period
  assert {
    condition     = output.vpc_id != ""
    error_message = "vpc_id must still be available"
  }
}
```

## Automating Contract Tests in CI

Run contract tests whenever the module changes and whenever consumer configurations change.

```yaml
# .github/workflows/contract-tests.yml
name: Module Contract Tests

on:
  pull_request:
    paths:
      - 'modules/networking/**'

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        # Run each consumer's contract tests
        consumer: [webapp, database, monitoring]

    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Run contract tests
        working-directory: modules/networking
        run: |
          terraform init
          terraform test -filter="tests/consumer-${{ matrix.consumer }}-contract.tftest.hcl"
```

## When to Use Contract Tests vs Other Tests

Contract tests fill a specific gap:

- **Unit tests** verify internal logic of a module
- **Integration tests** verify modules work together with real resources
- **Contract tests** verify the interface between modules is stable

Use contract tests when:
- Multiple teams consume a shared module
- You are publishing modules to a registry
- You need to refactor a module's internals without breaking consumers
- You want to catch interface changes before they hit production

Contract tests are lightweight. They often run in `plan` mode, which means no real resources, fast execution, and no cloud costs. Adding them to shared modules pays for itself quickly in reduced breakage and faster, more confident releases.

For more on Terraform testing, check out [How to Test Terraform Outputs and Data](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-outputs-and-data/view) and [How to Measure Terraform Test Coverage](https://oneuptime.com/blog/post/2026-02-23-how-to-measure-terraform-test-coverage/view).
