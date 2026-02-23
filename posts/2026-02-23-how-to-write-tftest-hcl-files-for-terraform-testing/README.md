# How to Write .tftest.hcl Files for Terraform Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, HCL, Infrastructure as Code, DevOps

Description: A detailed guide to the .tftest.hcl file format for Terraform testing, covering every block type, attribute, and pattern you need to write effective tests.

---

The `.tftest.hcl` file format is the foundation of Terraform's native test framework. Understanding every element of this format lets you write tests that are expressive, maintainable, and thorough. This guide breaks down the complete syntax and shows practical patterns for each feature.

## File Structure Overview

A `.tftest.hcl` file can contain these top-level blocks:

```hcl
# Provider configurations for tests
provider "aws" {
  region = "us-east-1"
}

# Global variables shared across all run blocks
variables {
  environment = "test"
}

# Individual test cases
run "test_name" {
  # Test configuration goes here
}
```

All three block types are optional. You can have a file with just `run` blocks, and it will inherit provider and variable configurations from the module being tested.

## The run Block

The `run` block is where tests happen. Each one defines a single test case:

```hcl
run "descriptive_test_name" {
  # What to execute: plan or apply
  command = plan

  # Input variables for this specific test
  variables {
    name = "test-resource"
  }

  # Conditions that must be true
  assert {
    condition     = output.name == "test-resource"
    error_message = "Name output should match input"
  }
}
```

### The command Attribute

Controls whether the test runs a plan or an apply:

```hcl
# Plan mode - validates without creating resources
run "unit_test" {
  command = plan
  # ...
}

# Apply mode (default) - creates real resources
run "integration_test" {
  command = apply
  # ...
}
```

If you omit `command`, it defaults to `apply`. Always set `command = plan` explicitly for unit tests so it is clear that no resources are created.

### The variables Block

Sets input variables for the test run. These override any global variables and any variable defaults in the module:

```hcl
run "custom_values" {
  command = plan

  variables {
    # Simple values
    name        = "my-resource"
    environment = "staging"

    # Complex values
    tags = {
      Team    = "platform"
      Project = "infrastructure"
    }

    # List values
    availability_zones = ["us-east-1a", "us-east-1b"]

    # Nested objects
    database_config = {
      engine         = "postgres"
      engine_version = "15.4"
      instance_class = "db.t3.micro"
    }
  }
}
```

### The assert Block

Each `run` block can contain multiple `assert` blocks. Every assertion must pass for the test to succeed:

```hcl
run "multiple_assertions" {
  command = plan

  variables {
    environment = "production"
    replicas    = 3
  }

  # Check resource configuration
  assert {
    condition     = aws_instance.app[0].instance_type == "t3.large"
    error_message = "Production instances should use t3.large"
  }

  # Check count
  assert {
    condition     = length(aws_instance.app) == 3
    error_message = "Should create 3 instances for 3 replicas"
  }

  # Check tags
  assert {
    condition     = aws_instance.app[0].tags["Environment"] == "production"
    error_message = "Instances should be tagged with the environment"
  }

  # Check outputs
  assert {
    condition     = output.instance_count == 3
    error_message = "Output should reflect the number of instances"
  }
}
```

The `condition` can be any expression that evaluates to a boolean. You have access to all resources, data sources, locals, and outputs defined in the module.

### The expect_failures Attribute

For negative testing - verifying that invalid inputs are correctly rejected:

```hcl
run "rejects_empty_name" {
  command = plan

  variables {
    name        = ""
    environment = "dev"
  }

  # This test passes if the specified items produce errors
  expect_failures = [
    var.name,
  ]
}

run "rejects_invalid_check" {
  command = plan

  variables {
    name        = "test"
    environment = "dev"
    enable_ssl  = false
  }

  # Expect a specific check block to fail
  expect_failures = [
    check.ssl_enabled,
  ]
}
```

The `expect_failures` list can reference:
- Variables (`var.name`) - expects validation to fail
- Resources (`aws_instance.main`) - expects a precondition or postcondition to fail
- Outputs (`output.url`) - expects a precondition to fail
- Check blocks (`check.health`) - expects the check to fail

### The module Block

By default, a run block tests the module in the current directory. You can test a different module:

```hcl
run "test_submodule" {
  command = plan

  # Test a different module
  module {
    source = "./modules/networking"
  }

  variables {
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = output.vpc_id != ""
    error_message = "Networking module should output a VPC ID"
  }
}
```

This is useful for:
- Testing submodules in isolation
- Using helper modules that generate test data
- Testing examples that consume your module

### The providers Block

Override which provider configuration a test run uses:

```hcl
# Define multiple provider configurations
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

# Test with a specific provider
run "test_in_eu" {
  command = plan

  providers = {
    aws = aws.eu_west
  }

  variables {
    name = "eu-resource"
  }
}
```

## Global variables Block

Variables defined at the file level apply to all run blocks in that file unless overridden:

```hcl
# These apply to all run blocks in this file
variables {
  environment = "test"
  region      = "us-east-1"
}

run "uses_global_vars" {
  command = plan
  # Uses environment = "test" and region = "us-east-1"
}

run "overrides_environment" {
  command = plan

  variables {
    # Override just the environment
    environment = "staging"
    # region is still "us-east-1" from the global block
  }
}
```

## Provider Blocks in Test Files

Test files can define their own provider configurations. These override the module's provider configuration during testing:

```hcl
# Override the AWS provider for testing
provider "aws" {
  region = "us-west-2"

  # Use a specific profile for tests
  profile = "terraform-testing"

  # Add default tags to all test resources
  default_tags {
    tags = {
      TestSuite = "vpc-module"
      ManagedBy = "terraform-test"
    }
  }
}
```

## Referencing Values Between Run Blocks

Run blocks within the same file execute sequentially, and later blocks can reference values from earlier ones:

```hcl
run "create_vpc" {
  module {
    source = "./modules/vpc"
  }

  variables {
    cidr = "10.0.0.0/16"
  }
}

run "create_subnet" {
  module {
    source = "./modules/subnet"
  }

  variables {
    # Reference the VPC ID from the previous run
    vpc_id = run.create_vpc.vpc_id
    cidr   = "10.0.1.0/24"
  }

  assert {
    condition     = output.subnet_id != ""
    error_message = "Subnet should be created in the VPC"
  }
}
```

## Assertion Patterns

Here are common patterns for writing effective assertions.

### Checking string patterns

```hcl
assert {
  condition     = can(regex("^arn:aws:s3:::", aws_s3_bucket.this.arn))
  error_message = "Bucket ARN should be a valid S3 ARN"
}
```

### Checking that a value is in a set

```hcl
assert {
  condition     = contains(["t3.micro", "t3.small", "t3.medium"], aws_instance.this.instance_type)
  error_message = "Instance type should be one of the allowed types"
}
```

### Checking map contents

```hcl
assert {
  condition     = lookup(aws_instance.this.tags, "Environment", "") == "production"
  error_message = "Instance should have an Environment tag set to production"
}
```

### Checking list length

```hcl
assert {
  condition     = length(aws_subnet.private) >= 2
  error_message = "Should create at least 2 private subnets for high availability"
}
```

### Checking that a value is not empty

```hcl
assert {
  condition     = aws_vpc.main.id != ""
  error_message = "VPC ID should not be empty"
}
```

### Checking numeric ranges

```hcl
assert {
  condition     = aws_autoscaling_group.this.min_size >= 1 && aws_autoscaling_group.this.max_size <= 20
  error_message = "ASG should have min_size >= 1 and max_size <= 20"
}
```

## Complete Example

Here is a full test file that demonstrates most features:

```hcl
# tests/complete.tftest.hcl
# Complete test suite for the web-app module

# Test provider configuration
provider "aws" {
  region = "us-east-1"
}

# Shared variables
variables {
  app_name    = "test-app"
  environment = "test"
}

# Unit test - validate defaults
run "default_configuration" {
  command = plan

  assert {
    condition     = aws_instance.app.instance_type == "t3.micro"
    error_message = "Default instance type should be t3.micro"
  }

  assert {
    condition     = aws_instance.app.monitoring == false
    error_message = "Monitoring should be off by default"
  }
}

# Unit test - validate production settings
run "production_overrides" {
  command = plan

  variables {
    environment   = "production"
    instance_type = "t3.large"
    monitoring    = true
  }

  assert {
    condition     = aws_instance.app.instance_type == "t3.large"
    error_message = "Production should use t3.large"
  }

  assert {
    condition     = aws_instance.app.monitoring == true
    error_message = "Production should have monitoring enabled"
  }
}

# Negative test - invalid instance type
run "rejects_invalid_instance_type" {
  command = plan

  variables {
    instance_type = "t1.micro"
  }

  expect_failures = [
    var.instance_type,
  ]
}

# Integration test - full deployment
run "full_deployment" {
  # command = apply is the default

  variables {
    environment   = "test"
    instance_type = "t3.micro"
  }

  assert {
    condition     = aws_instance.app.id != ""
    error_message = "Instance should be created"
  }

  assert {
    condition     = output.public_ip != ""
    error_message = "Public IP should be assigned"
  }
}
```

## File Organization Tips

Structure your test files by purpose:

```
tests/
  unit-defaults.tftest.hcl      # Test default variable values
  unit-validation.tftest.hcl    # Test variable validation rules
  unit-conditionals.tftest.hcl  # Test conditional logic
  integration-aws.tftest.hcl    # Integration tests for AWS
  integration-full.tftest.hcl   # End-to-end integration tests
```

This lets you run subsets easily:

```bash
# Run only unit tests
terraform test -filter=tests/unit-defaults.tftest.hcl
terraform test -filter=tests/unit-validation.tftest.hcl

# Run only integration tests
terraform test -filter=tests/integration-aws.tftest.hcl
```

The `.tftest.hcl` format is simple but expressive enough to cover the full range of testing needs, from quick validation checks to comprehensive integration tests.

For more on running these tests, see [How to Use the terraform test Command](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-terraform-test-command/view). For testing without real providers, see [How to Use Mock Providers in Terraform Tests](https://oneuptime.com/blog/post/2026-02-23-how-to-use-mock-providers-in-terraform-tests/view).
