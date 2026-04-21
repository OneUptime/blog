# How to Test Module Output Values in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to write OpenTofu tests that verify module output values, ensuring your modules return the correct data to their callers.

## Introduction

Module outputs define the public API of your infrastructure modules - what data callers can use. Testing output values ensures your module returns correct, well-formed data. OpenTofu tests can assert against output values directly using `output.<name>` in assert conditions, for both plan-mode and apply-mode tests.

## Module with Outputs to Test

```hcl
# modules/network/outputs.tf

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "nat_gateway_ips" {
  description = "Elastic IPs of NAT gateways"
  value       = aws_eip.nat[*].public_ip
}
```

## Testing Output Values with Mock Provider

```hcl
# tests/outputs.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id         = "vpc-mock12345"
      cidr_block = "10.0.0.0/16"
    }
  }

  mock_resource "aws_subnet" {
    defaults = {
      id         = "subnet-mock12345"
      cidr_block = "10.0.1.0/24"
    }
  }

  mock_resource "aws_eip" {
    defaults = {
      public_ip = "54.10.20.30"
    }
  }

  mock_data "aws_availability_zones" {
    defaults = {
      names = ["us-east-1a", "us-east-1b", "us-east-1c"]
    }
  }
}

variables {
  environment          = "test"
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

run "vpc_id_output_is_populated" {
  command = plan

  assert {
    condition     = output.vpc_id != ""
    error_message = "vpc_id output must be populated"
  }
}

run "public_subnets_output_has_correct_count" {
  command = plan

  assert {
    condition     = length(output.public_subnet_ids) == 3
    error_message = "Should output 3 public subnet IDs, got: ${length(output.public_subnet_ids)}"
  }
}

run "private_subnets_output_has_correct_count" {
  command = plan

  assert {
    condition     = length(output.private_subnet_ids) == 3
    error_message = "Should output 3 private subnet IDs, got: ${length(output.private_subnet_ids)}"
  }
}

run "vpc_cidr_output_matches_input" {
  command = plan

  assert {
    condition     = output.vpc_cidr == var.vpc_cidr
    error_message = "vpc_cidr output should match input variable, got: ${output.vpc_cidr}"
  }
}

run "nat_gateway_ips_has_one_per_az" {
  command = plan

  assert {
    condition     = length(output.nat_gateway_ips) == 3
    error_message = "Should have one NAT gateway per AZ, got: ${length(output.nat_gateway_ips)}"
  }
}
```

## Testing Computed Output Values

When outputs are derived from computations:

```hcl
# modules/naming/outputs.tf
output "bucket_name" {
  value = "${lower(var.organization)}-${lower(var.environment)}-${lower(var.service)}"
}

output "function_name" {
  value = "${var.environment}-${var.service}-handler"
}
```

```hcl
# tests/naming_outputs.tftest.hcl

mock_provider "aws" {}

variables {
  organization = "ACME"
  environment  = "production"
  service      = "Orders"
}

run "bucket_name_is_lowercase" {
  command = plan

  assert {
    condition     = output.bucket_name == lower(output.bucket_name)
    error_message = "Bucket name must be lowercase, got: ${output.bucket_name}"
  }
}

run "bucket_name_includes_all_parts" {
  command = plan

  assert {
    condition     = can(regex("acme", output.bucket_name)) && can(regex("production", output.bucket_name)) && can(regex("orders", output.bucket_name))
    error_message = "Bucket name should contain organization, environment, and service: ${output.bucket_name}"
  }
}
```

## Testing Sensitive Outputs

```hcl
# modules/database/outputs.tf
output "connection_string" {
  value     = "postgresql://${var.username}:${var.password}@${aws_db_instance.main.address}/${var.db_name}"
  sensitive = true
}
```

```hcl
# tests/db_outputs.tftest.hcl
mock_provider "aws" {
  mock_resource "aws_db_instance" {
    defaults = {
      address = "mock-db.rds.amazonaws.com"
    }
  }
}

variables {
  username = "test_user"
  password = "test_password"
  db_name  = "app"
}

run "connection_string_is_not_empty" {
  command = plan

  assert {
    # Check emptiness without including the sensitive value in the failure message
    condition     = output.connection_string != ""
    error_message = "connection_string output should not be empty"
  }
}
```

## Integration Tests for Output Values

```hcl
# tests/integration_outputs.tftest.hcl

run "apply_module" {
  command = apply

  assert {
    condition     = output.vpc_id != ""
    error_message = "VPC should be created with a real ID"
  }
}

run "verify_output_matches_reality" {
  command = apply

  assert {
    # After apply, output should match the actual AWS resource
    condition     = aws_vpc.main.id == output.vpc_id
    error_message = "Output vpc_id should match the created VPC ID"
  }
}
```

## Conclusion

Testing module output values ensures your module's public API is correct. Use mock providers with explicit `defaults` for provider-computed values that feed into output calculations. Test output format (lowercase, non-empty), output counts (for list outputs), and that computed outputs match their expected formulas. For sensitive outputs, assert on non-secret properties like emptiness or length, and avoid including exact values in failure messages. Output tests are particularly valuable for library modules used across many configurations.
