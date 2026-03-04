# How to Test Terraform Outputs and Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Outputs, Data Source, Infrastructure as Code

Description: Learn how to write tests for Terraform outputs and data sources to verify your modules return correct values and data lookups work as expected.

---

Terraform outputs and data sources are two of the most commonly used features in any module, yet they rarely get tested directly. Outputs pass information between modules, feed into other systems, and often become the contract your module exposes to the rest of your infrastructure. Data sources pull in external information that your configuration depends on. When either of these breaks, things go wrong in hard-to-debug ways.

This guide covers practical approaches to testing both.

## Why Test Outputs?

Outputs are your module's public API. When another team depends on your module's `vpc_id` output, and you accidentally rename it to `network_id`, their configuration breaks. Testing outputs catches these breaking changes early.

Consider a simple networking module:

```hcl
# modules/networking/outputs.tf

# The VPC ID for use by other modules
output "vpc_id" {
  description = "The ID of the created VPC"
  value       = aws_vpc.main.id
}

# CIDR block for network planning
output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# Subnet IDs for placing resources
output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

# Map of AZ to subnet ID for targeted placement
output "subnet_az_map" {
  description = "Map of availability zone to subnet ID"
  value       = { for s in aws_subnet.private : s.availability_zone => s.id }
}
```

Each of these outputs is a contract. Let's test them.

## Using Terraform's Native Test Framework

Terraform 1.6+ includes a built-in testing framework. Test files use the `.tftest.hcl` extension and live alongside your module.

```hcl
# modules/networking/outputs.tftest.hcl

# Test that outputs exist and have expected types
run "verify_outputs_exist" {
  command = plan

  # Verify the VPC ID output is not empty
  assert {
    condition     = output.vpc_id != ""
    error_message = "vpc_id output should not be empty"
  }

  # Verify private subnets returns a list
  assert {
    condition     = length(output.private_subnet_ids) > 0
    error_message = "private_subnet_ids should contain at least one subnet"
  }

  # Verify the CIDR output matches expected format
  assert {
    condition     = can(cidrhost(output.vpc_cidr, 0))
    error_message = "vpc_cidr should be a valid CIDR block"
  }
}
```

Run these tests with:

```bash
# Run all tests in the module directory
terraform test

# Run with verbose output to see details
terraform test -verbose
```

## Testing Output Types and Structure

When outputs have complex types - maps, lists of objects, nested structures - you need to verify the shape, not just the existence.

```hcl
# modules/networking/outputs.tftest.hcl

# Variables needed for the test run
variables {
  vpc_cidr           = "10.0.0.0/16"
  private_subnets    = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

run "verify_output_structure" {
  command = apply

  # Check that we get exactly 3 private subnets
  assert {
    condition     = length(output.private_subnet_ids) == 3
    error_message = "Expected 3 private subnets, got ${length(output.private_subnet_ids)}"
  }

  # Check that the AZ map has the right keys
  assert {
    condition     = contains(keys(output.subnet_az_map), "us-east-1a")
    error_message = "subnet_az_map should contain us-east-1a"
  }

  # Verify subnet IDs follow AWS format
  assert {
    condition     = alltrue([for id in output.private_subnet_ids : startswith(id, "subnet-")])
    error_message = "All subnet IDs should start with subnet-"
  }
}
```

## Testing Data Sources

Data sources are trickier to test because they depend on external state. You need real resources to exist for data sources to find them. There are several strategies for handling this.

### Strategy 1: Test Data Sources with Setup Modules

Create the resources in a setup step, then test the data source lookups.

```hcl
# tests/data_source_test.tftest.hcl

# First, create the resources the data source will look up
run "setup" {
  module {
    source = "./tests/fixtures/setup"
  }
}

# Now test the data source lookup
run "verify_data_source" {
  # Use variables from the setup run
  variables {
    lookup_name = run.setup.resource_name
  }

  # Verify the data source found the resource
  assert {
    condition     = data.aws_vpc.lookup.id != ""
    error_message = "Data source should find the VPC"
  }

  assert {
    condition     = data.aws_vpc.lookup.cidr_block == "10.0.0.0/16"
    error_message = "Data source should return correct CIDR block"
  }
}
```

The setup fixture creates what the data source needs:

```hcl
# tests/fixtures/setup/main.tf

resource "aws_vpc" "test" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "test-vpc-${random_id.suffix.hex}"
  }
}

resource "random_id" "suffix" {
  byte_length = 4
}

# Output the name so the data source test can look it up
output "resource_name" {
  value = aws_vpc.test.tags["Name"]
}
```

### Strategy 2: Mock Data Sources

For unit-level tests where you do not want to create real resources, you can use mock providers (available in Terraform 1.7+).

```hcl
# tests/data_source_mock_test.tftest.hcl

# Define mock data for the AWS provider
mock_provider "aws" {
  mock_data "aws_ami" {
    defaults = {
      id            = "ami-12345678"
      name          = "my-golden-ami"
      creation_date = "2026-01-01T00:00:00Z"
    }
  }

  mock_data "aws_vpc" {
    defaults = {
      id         = "vpc-abcdef12"
      cidr_block = "10.0.0.0/16"
    }
  }
}

run "test_ami_lookup" {
  # With mock provider, data sources return mock values
  assert {
    condition     = data.aws_ami.latest.id == "ami-12345678"
    error_message = "AMI data source should return mocked ID"
  }
}
```

## Testing with Terratest (Go)

For teams that prefer Go-based testing, Terratest provides functions specifically for checking outputs.

```go
// test/outputs_test.go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestNetworkingOutputs(t *testing.T) {
    t.Parallel()

    // Configure the Terraform options
    terraformOptions := &terraform.Options{
        // Path to the module being tested
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "vpc_cidr":           "10.0.0.0/16",
            "private_subnets":    []string{"10.0.1.0/24", "10.0.2.0/24"},
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
        },
    }

    // Clean up resources after the test
    defer terraform.Destroy(t, terraformOptions)

    // Apply the Terraform configuration
    terraform.InitAndApply(t, terraformOptions)

    // Test string output
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.Regexp(t, `^vpc-[a-f0-9]+$`, vpcId, "VPC ID should match AWS format")

    // Test list output
    subnetIds := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
    assert.Len(t, subnetIds, 2, "Should have 2 private subnets")

    // Test map output
    azMap := terraform.OutputMap(t, terraformOptions, "subnet_az_map")
    assert.Contains(t, azMap, "us-east-1a", "AZ map should contain us-east-1a")

    // Test that CIDR output is correct
    vpcCidr := terraform.Output(t, terraformOptions, "vpc_cidr")
    assert.Equal(t, "10.0.0.0/16", vpcCidr, "VPC CIDR should match input")
}
```

## Testing Sensitive Outputs

Sensitive outputs need special handling. Terraform marks them as sensitive and will not display their values in plan output.

```hcl
# Module output definition
output "database_password" {
  description = "The database master password"
  value       = random_password.db.result
  sensitive   = true
}
```

In native Terraform tests, you can still access sensitive values:

```hcl
run "verify_sensitive_output" {
  command = apply

  # Sensitive outputs can be tested but won't appear in logs
  assert {
    condition     = length(output.database_password) >= 16
    error_message = "Database password should be at least 16 characters"
  }
}
```

In Terratest, use the specific function for sensitive outputs:

```go
// Retrieve sensitive output value
password := terraform.Output(t, terraformOptions, "database_password")
assert.GreaterOrEqual(t, len(password), 16, "Password should be at least 16 chars")
```

## Testing Output Dependencies

Sometimes outputs depend on conditional logic. Test each branch.

```hcl
# Module that conditionally creates resources
variable "create_nat_gateway" {
  type    = bool
  default = true
}

output "nat_gateway_ip" {
  description = "NAT Gateway public IP, empty if NAT not created"
  value       = var.create_nat_gateway ? aws_eip.nat[0].public_ip : ""
}
```

Test both paths:

```hcl
# Test with NAT gateway enabled
run "with_nat_gateway" {
  variables {
    create_nat_gateway = true
  }

  assert {
    condition     = output.nat_gateway_ip != ""
    error_message = "NAT gateway IP should be set when NAT is enabled"
  }
}

# Test without NAT gateway
run "without_nat_gateway" {
  variables {
    create_nat_gateway = false
  }

  assert {
    condition     = output.nat_gateway_ip == ""
    error_message = "NAT gateway IP should be empty when NAT is disabled"
  }
}
```

## Data Source Error Handling

Data sources can fail when the resource they are looking up does not exist. Test these failure cases to make sure your module handles them gracefully.

```hcl
# Module code with graceful data source handling
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = [var.ami_name_pattern]
  }
}

# Fallback if no AMI matches
locals {
  ami_id = try(data.aws_ami.app.id, var.fallback_ami_id)
}

output "resolved_ami_id" {
  value = local.ami_id
}
```

Testing data source error handling ensures your module does not crash when external lookups fail. This is particularly important for modules used across different accounts or regions where the expected resources might not exist.

## Putting It All Together

A well-tested module checks that outputs have correct types, expected values, proper sensitivity markings, and handle conditional logic correctly. Data source tests verify that lookups work with real resources and handle missing data gracefully.

Start with the native Terraform test framework for simple cases. Move to Terratest when you need more complex assertions or want to integrate with existing Go test suites. Either way, testing your outputs and data sources prevents the kind of silent breakage that is hardest to debug.

For related testing topics, see [How to Use Contract Tests for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-contract-tests-for-terraform-modules/view) and [How to Use Test Helpers for Common Terraform Patterns](https://oneuptime.com/blog/post/2026-02-23-how-to-use-test-helpers-for-common-terraform-patterns/view).
