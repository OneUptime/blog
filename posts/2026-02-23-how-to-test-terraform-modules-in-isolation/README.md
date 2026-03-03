# How to Test Terraform Modules in Isolation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Modules, Infrastructure as Code, DevOps

Description: Learn techniques for testing Terraform modules independently from the rest of your infrastructure, including test fixtures, mock dependencies, and module test patterns.

---

Terraform modules are reusable building blocks, but they often depend on other modules, data sources, and existing infrastructure. Testing a module in isolation means verifying its behavior without those dependencies. This gives you faster feedback, clearer test failures, and the confidence that each module works correctly on its own.

## Why Isolate Module Tests

When you test a module as part of a larger configuration, a failure could come from anywhere - the module itself, its dependencies, the provider, or the infrastructure state. Isolated tests narrow the scope so you know exactly what broke and why.

Isolated module tests also run faster because they do not need to create prerequisite infrastructure. You do not need a VPC before you can test a subnet module - you just need to provide the VPC ID as an input.

## Test Fixtures Pattern

The most common pattern for isolated module testing is the test fixture. A fixture is a minimal Terraform configuration that calls your module with test inputs:

```text
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf
    tests/
      unit.tftest.hcl
      fixtures/
        basic/
          main.tf
        complete/
          main.tf
```

The fixture calls the module with specific test values:

```hcl
# modules/vpc/tests/fixtures/basic/main.tf
# Minimal fixture for testing the VPC module

module "vpc" {
  source = "../../.."

  vpc_cidr    = "10.0.0.0/16"
  environment = "test"
  name        = "test-vpc"
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "cidr_block" {
  value = module.vpc.cidr_block
}
```

The test file references this fixture:

```hcl
# modules/vpc/tests/unit.tftest.hcl

mock_provider "aws" {}

run "basic_vpc" {
  command = plan

  module {
    source = "./tests/fixtures/basic"
  }

  assert {
    condition     = output.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR should match input"
  }
}
```

## Isolating Modules from Dependencies

Most modules depend on resources from other modules. For example, a database module might need a VPC ID and subnet IDs from a networking module. To test the database module in isolation, provide those values as inputs:

```hcl
# modules/database/variables.tf

variable "vpc_id" {
  type        = string
  description = "VPC ID where the database will be deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for the database subnet group"
}

variable "db_name" {
  type        = string
  description = "Name of the database"
}
```

```hcl
# modules/database/tests/unit.tftest.hcl

mock_provider "aws" {}

# Provide fake dependency values
run "test_database_configuration" {
  command = plan

  variables {
    vpc_id     = "vpc-fake12345"
    subnet_ids = ["subnet-aaa111", "subnet-bbb222"]
    db_name    = "testdb"
  }

  assert {
    condition     = aws_db_instance.main.db_name == "testdb"
    error_message = "Database name should match input"
  }

  assert {
    condition     = length(aws_db_subnet_group.main.subnet_ids) == 2
    error_message = "Subnet group should include both subnets"
  }
}
```

The database module does not care whether `vpc-fake12345` is a real VPC. In plan mode with a mock provider, these values are just strings. The test validates that the module correctly passes them through to the right resources.

## Using override_module for Child Dependencies

If your module calls child modules, use `override_module` to isolate it from those dependencies:

```hcl
# modules/application/main.tf

module "networking" {
  source = "../networking"
  # ... networking inputs
}

module "database" {
  source = "../database"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = module.networking.private_subnet_ids[0]

  tags = {
    Name = "${var.app_name}-server"
  }
}
```

Test the application module without running the networking or database modules:

```hcl
# modules/application/tests/isolated.tftest.hcl

mock_provider "aws" {}

# Replace child modules with static outputs
override_module {
  target = module.networking
  outputs = {
    vpc_id             = "vpc-isolated-test"
    private_subnet_ids = ["subnet-priv-a", "subnet-priv-b"]
    public_subnet_ids  = ["subnet-pub-a", "subnet-pub-b"]
  }
}

override_module {
  target = module.database
  outputs = {
    endpoint = "testdb.cluster-abc123.us-east-1.rds.amazonaws.com"
    port     = 5432
  }
}

run "app_instance_configuration" {
  command = plan

  variables {
    app_name      = "myapp"
    ami_id        = "ami-test123"
    instance_type = "t3.small"
  }

  assert {
    condition     = aws_instance.app.subnet_id == "subnet-priv-a"
    error_message = "App should be placed in the first private subnet"
  }

  assert {
    condition     = aws_instance.app.tags["Name"] == "myapp-server"
    error_message = "Instance should be tagged with the app name"
  }
}
```

## Testing Module Interface Contracts

A module's interface is defined by its variables and outputs. Test that the interface behaves as documented:

```hcl
# modules/s3-bucket/tests/interface.tftest.hcl

mock_provider "aws" {}

# Test that all required variables are actually required
run "fails_without_bucket_name" {
  command = plan

  variables {
    # Intentionally omit bucket_name
    environment = "test"
  }

  expect_failures = [
    var.bucket_name,
  ]
}

# Test that defaults work correctly
run "uses_default_values" {
  command = plan

  variables {
    bucket_name = "test-bucket"
    # Do not set optional variables - they should have defaults
  }

  assert {
    condition     = aws_s3_bucket.this.tags["Environment"] == "dev"
    error_message = "Default environment should be dev"
  }
}

# Test that outputs expose the right information
run "outputs_bucket_details" {
  command = plan

  variables {
    bucket_name = "test-bucket"
    environment = "staging"
  }

  assert {
    condition     = output.bucket_name != ""
    error_message = "Module should output the bucket name"
  }

  assert {
    condition     = output.bucket_arn != ""
    error_message = "Module should output the bucket ARN"
  }
}
```

## Testing Modules with for_each and count

Modules that create dynamic numbers of resources need tests that verify the correct number is created:

```hcl
# modules/security-groups/tests/dynamic.tftest.hcl

mock_provider "aws" {}

run "creates_one_sg_per_rule_set" {
  command = plan

  variables {
    vpc_id = "vpc-test123"
    security_groups = {
      web = {
        description = "Web traffic"
        ingress_rules = [
          { from_port = 80, to_port = 80, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
          { from_port = 443, to_port = 443, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
        ]
      }
      app = {
        description = "Application traffic"
        ingress_rules = [
          { from_port = 8080, to_port = 8080, protocol = "tcp", cidr_blocks = ["10.0.0.0/16"] },
        ]
      }
    }
  }

  assert {
    condition     = length(aws_security_group.this) == 2
    error_message = "Should create exactly 2 security groups"
  }

  assert {
    condition     = aws_security_group.this["web"].description == "Web traffic"
    error_message = "Web SG should have the correct description"
  }
}

run "creates_no_sgs_when_empty" {
  command = plan

  variables {
    vpc_id          = "vpc-test123"
    security_groups = {}
  }

  assert {
    condition     = length(aws_security_group.this) == 0
    error_message = "Should create no security groups when input is empty"
  }
}
```

## Integration Test in Isolation

For modules that need integration tests but should not depend on other modules, create dedicated test infrastructure:

```hcl
# modules/lambda/tests/integration.tftest.hcl

provider "aws" {
  region = "us-east-1"
}

# Create minimal dependencies within the test
run "setup_dependencies" {
  module {
    source = "./tests/fixtures/lambda-deps"
  }

  # This fixture creates just the IAM role needed by the lambda module
}

run "deploy_lambda" {
  variables {
    function_name = "test-isolated-lambda"
    handler       = "index.handler"
    runtime       = "python3.12"
    role_arn      = run.setup_dependencies.role_arn
    source_dir    = "./tests/fixtures/lambda-code"
  }

  assert {
    condition     = aws_lambda_function.this.function_name == "test-isolated-lambda"
    error_message = "Lambda should be created with the test name"
  }

  assert {
    condition     = aws_lambda_function.this.runtime == "python3.12"
    error_message = "Lambda should use the specified runtime"
  }
}
```

## Module Isolation Checklist

When setting up isolated tests for a module, go through this checklist:

1. **Identify all external dependencies** - What does this module need from outside? VPC IDs, subnet IDs, IAM roles, etc.
2. **Make dependencies injectable** - Every external dependency should be a variable, not a hardcoded value or data source.
3. **Provide mock values for unit tests** - Use fake IDs and mock providers for plan-mode tests.
4. **Create minimal fixtures for integration tests** - Build only the dependencies you need, not the entire infrastructure stack.
5. **Test the interface** - Verify that required variables are required, optional variables have sensible defaults, and outputs are populated.
6. **Test dynamic behavior** - If the module uses `count` or `for_each`, test with zero, one, and many items.

## Making Modules More Testable

If you find a module hard to test in isolation, that is a design signal. Modules that are hard to isolate usually have one of these problems:

- **Hardcoded data sources** - Instead of looking up a VPC by name, accept the VPC ID as a variable.
- **Too many responsibilities** - A module that creates networking, compute, and storage is hard to test. Split it into focused modules.
- **Tight coupling** - If module A directly references module B's internal resources, they cannot be tested separately. Use outputs as the interface.
- **Missing variables** - If a value is computed internally when it should be configurable, testing becomes harder.

Good module design and good testability go hand in hand. If your module is easy to test in isolation, it is probably well-designed.

For related testing approaches, see [How to Use Override Files in Terraform Tests](https://oneuptime.com/blog/post/2026-02-23-how-to-use-override-files-in-terraform-tests/view) and [How to Use Mock Providers in Terraform Tests](https://oneuptime.com/blog/post/2026-02-23-how-to-use-mock-providers-in-terraform-tests/view).
