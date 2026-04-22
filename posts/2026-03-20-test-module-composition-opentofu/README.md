# How to Test Module Composition in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to test composed OpenTofu modules where multiple child modules are combined, validating that modules integrate correctly with each other.

## Introduction

Module composition is the practice of combining multiple child modules to build complex infrastructure. Testing composed modules verifies that the wiring between modules is correct - that outputs from one module correctly feed into another, and that the overall system behaves as expected. OpenTofu's testing framework supports this with setup modules, run block references, and multi-step test scenarios.

## What is Module Composition?

```hcl
# root/main.tf - composition of child modules

module "vpc" {
  source      = "./modules/vpc"
  cidr_block  = var.vpc_cidr
  environment = var.environment
}

module "database" {
  source     = "./modules/rds"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids  # VPC outputs fed to RDS
}

module "compute" {
  source     = "./modules/ec2"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids
  db_endpoint = module.database.endpoint  # RDS output fed to EC2
}
```

## Testing the Composed Root Module

```hcl
# tests/integration.tftest.hcl - test the full composition

mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id = "vpc-mock123"
    }
  }

  mock_resource "aws_subnet" {
    defaults = {
      id = "subnet-mock123"
    }
  }

  mock_resource "aws_db_instance" {
    defaults = {
      endpoint = "mock-db.rds.amazonaws.com:5432"
      address  = "mock-db.rds.amazonaws.com"
    }
  }

  mock_resource "aws_instance" {
    defaults = {
      id        = "i-mock123"
      public_ip = "54.1.2.3"
    }
  }
}

variables {
  environment = "test"
  vpc_cidr    = "10.0.0.0/16"
}

run "modules_compose_correctly" {
  command = plan

  assert {
    # VPC ID is threaded through to the database module
    condition     = module.database.vpc_id == module.vpc.vpc_id
    error_message = "Database module should use the VPC from the VPC module"
  }

  assert {
    # EC2 receives the database endpoint
    condition     = module.compute.db_endpoint != ""
    error_message = "Compute module should receive database endpoint"
  }
}
```

## Multi-Step Integration Test

Use multiple run blocks to test the composition incrementally:

```hcl
# tests/integration.tftest.hcl

run "networking_layer" {
  command = apply

  # Test only the networking module
  module {
    source = "./modules/vpc"
  }

  variables {
    cidr_block  = "10.0.0.0/16"
    environment = "test"
  }

  assert {
    condition     = output.vpc_id != ""
    error_message = "VPC should be created"
  }

  assert {
    condition     = length(output.private_subnet_ids) == 3
    error_message = "Should create 3 private subnets"
  }
}

run "database_layer" {
  command = apply

  module {
    source = "./modules/rds"
  }

  variables {
    vpc_id     = run.networking_layer.vpc_id
    subnet_ids = run.networking_layer.private_subnet_ids
  }

  assert {
    condition     = output.db_endpoint != ""
    error_message = "Database should be created with an endpoint"
  }
}

run "compute_layer" {
  command = apply

  module {
    source = "./modules/ec2"
  }

  variables {
    vpc_id      = run.networking_layer.vpc_id
    subnet_ids  = run.networking_layer.public_subnet_ids
    db_endpoint = run.database_layer.db_endpoint
  }

  assert {
    condition     = length(output.instance_ids) > 0
    error_message = "Compute instances should be created"
  }
}
```

## Testing Interface Contracts Between Modules

```hcl
# Verify that VPC module outputs what downstream modules need
run "vpc_outputs_required_values" {
  command = plan

  module {
    source = "./modules/vpc"
  }

  variables {
    cidr_block  = "10.0.0.0/16"
    environment = "test"
  }

  assert {
    condition     = output.vpc_id != ""
    error_message = "VPC module must output vpc_id"
  }

  assert {
    condition     = length(output.private_subnet_ids) >= 2
    error_message = "VPC module must output at least 2 private subnet IDs"
  }

  assert {
    condition     = length(output.public_subnet_ids) >= 2
    error_message = "VPC module must output at least 2 public subnet IDs"
  }
}
```

## Testing Configuration Propagation

Verify that settings flow through the module chain:

```hcl
mock_provider "aws" {}

variables {
  environment = "production"
  vpc_cidr    = "10.0.0.0/16"
}

run "environment_tag_propagates" {
  command = plan

  assert {
    # Verify the environment tag flows from root variable through all modules
    condition     = module.vpc.tags["Environment"] == "production"
    error_message = "VPC module should inherit environment tag"
  }

  assert {
    condition     = module.database.tags["Environment"] == "production"
    error_message = "Database module should inherit environment tag"
  }
}
```

## Conclusion

Testing module composition ensures the wiring between child modules is correct. Use mock providers for fast plan-mode composition tests, and multi-step run blocks with `command = apply` for integration tests that validate the full deployment sequence. Test the interface contracts between modules - verifying that each module outputs the values its downstream consumers need. This prevents subtle integration bugs that only surface when modules are combined.
