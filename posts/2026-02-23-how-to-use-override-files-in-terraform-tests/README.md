# How to Use Override Files in Terraform Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Override Files, Infrastructure as Code, DevOps

Description: Learn how to use Terraform override files in tests to replace provider configurations, swap backends, and modify resources for testing without changing production code.

---

Terraform override files let you replace parts of your configuration without modifying the original files. In the context of testing, this is incredibly useful. You can swap out production provider configurations, replace remote backends with local ones, and modify resource settings to make them testable. This guide covers how override files work and how to use them effectively in your Terraform testing workflow.

## What Are Override Files

Override files are Terraform configuration files named with an `_override` suffix (like `backend_override.tf`) or exactly named `override.tf`. When Terraform loads a directory, it merges override files on top of the regular configuration, replacing any blocks that match.

The key rule: override files replace blocks at the block level, not the attribute level. If you override a resource block, the entire resource definition is replaced.

```
my-module/
  main.tf              # Original configuration
  variables.tf         # Original variables
  override.tf          # Overrides anything in main.tf or variables.tf
  backend_override.tf  # Additional override file
```

## Override Files in Tests

The native Terraform test framework handles override files through the `override_resource`, `override_data`, and `override_module` blocks in `.tftest.hcl` files. These were introduced alongside mock providers to give you fine-grained control over test behavior.

### Overriding Resources

Use `override_resource` to replace specific resource behavior in tests:

```hcl
# tests/unit.tftest.hcl

mock_provider "aws" {}

# Override a specific resource instance
override_resource {
  target = aws_instance.app
  values = {
    id                = "i-test123"
    private_ip        = "10.0.1.100"
    availability_zone = "us-east-1a"
    instance_state    = "running"
  }
}

run "test_instance_outputs" {
  command = plan

  variables {
    environment   = "test"
    instance_type = "t3.micro"
  }

  assert {
    condition     = aws_instance.app.private_ip == "10.0.1.100"
    error_message = "Instance should have the overridden private IP"
  }
}
```

### Overriding Data Sources

Data sources often query external APIs, which complicates testing. Override them to return predictable values:

```hcl
# tests/data-overrides.tftest.hcl

mock_provider "aws" {}

# Override the AMI data source
override_data {
  target = data.aws_ami.ubuntu
  values = {
    id           = "ami-test12345"
    name         = "ubuntu-22.04-test"
    architecture = "x86_64"
    image_id     = "ami-test12345"
  }
}

# Override the availability zones data source
override_data {
  target = data.aws_availability_zones.available
  values = {
    names = ["us-east-1a", "us-east-1b", "us-east-1c"]
  }
}

run "test_ami_selection" {
  command = plan

  variables {
    ami_name_filter = "ubuntu-22.04-*"
  }

  assert {
    condition     = aws_instance.app.ami == "ami-test12345"
    error_message = "Instance should use the overridden AMI"
  }
}
```

### Overriding Modules

When your configuration calls child modules, you can override their outputs:

```hcl
# tests/module-overrides.tftest.hcl

mock_provider "aws" {}

# Override a child module's behavior
override_module {
  target = module.vpc
  outputs = {
    vpc_id             = "vpc-test123"
    private_subnet_ids = ["subnet-priv1", "subnet-priv2"]
    public_subnet_ids  = ["subnet-pub1", "subnet-pub2"]
  }
}

run "test_app_in_vpc" {
  command = plan

  variables {
    environment = "test"
  }

  # The module uses outputs from the VPC module
  assert {
    condition     = aws_instance.app.subnet_id == "subnet-priv1"
    error_message = "App instance should be in a private subnet from the VPC module"
  }
}
```

## Traditional Override Files for Backend Swapping

Outside of the test framework, the most common use of override files is swapping backends. Production might use S3, but tests need a local backend:

```hcl
# backend.tf - production configuration
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

```hcl
# backend_override.tf - local override for testing
# This file replaces the S3 backend with a local backend
terraform {
  backend "local" {
    path = "test.tfstate"
  }
}
```

Add `backend_override.tf` to `.gitignore` so it does not get committed:

```gitignore
# .gitignore
backend_override.tf
```

## Overriding Provider Configurations

You can override providers to use different credentials, regions, or endpoints for testing:

```hcl
# providers.tf - production configuration
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/production"
  }
}
```

```hcl
# provider_override.tf - testing configuration
# Use a different role and add tags for test resources
provider "aws" {
  region  = "us-east-1"
  profile = "testing"

  default_tags {
    tags = {
      TestRun   = "true"
      CreatedBy = "terraform-test"
    }
  }
}
```

## Override Files for LocalStack Testing

A practical use case is overriding providers to point at LocalStack for local testing:

```hcl
# provider_override.tf - point AWS provider at LocalStack
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3       = "http://localhost:4566"
    dynamodb = "http://localhost:4566"
    sqs      = "http://localhost:4566"
    sns      = "http://localhost:4566"
    iam      = "http://localhost:4566"
    lambda   = "http://localhost:4566"
    ec2      = "http://localhost:4566"
  }
}
```

This lets you run `terraform apply` against LocalStack, creating resources locally instead of in AWS.

## Using Override Files in CI Scripts

A CI pipeline might generate override files dynamically:

```bash
#!/bin/bash
# ci-test.sh
# Generate override files for the test environment

# Create a backend override for local state
cat > backend_override.tf << 'OVERRIDE'
terraform {
  backend "local" {
    path = "/tmp/test.tfstate"
  }
}
OVERRIDE

# Create a provider override for the test account
cat > provider_override.tf << OVERRIDE
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      TestRun   = "${CI_PIPELINE_ID}"
      CreatedBy = "ci-pipeline"
    }
  }
}
OVERRIDE

# Run tests
terraform init
terraform test -verbose

# Clean up
rm -f backend_override.tf provider_override.tf
```

## Override Merge Rules

Understanding how overrides merge is important:

1. **Top-level blocks are matched by type, name, and labels.** A `resource "aws_instance" "app"` override replaces the original `resource "aws_instance" "app"` block entirely.

2. **Nested blocks within a matched block are merged.** If both the original and override have a `tags` block, the override's tags replace the original's tags.

3. **Attributes within a matched block are replaced individually.** If the override sets `instance_type` but not `ami`, the original `ami` is preserved.

4. **Override files are processed in alphabetical order.** `a_override.tf` is applied before `b_override.tf`.

```hcl
# main.tf
resource "aws_instance" "app" {
  ami           = "ami-12345"
  instance_type = "t3.large"
  monitoring    = true

  tags = {
    Name        = "production-app"
    Environment = "production"
  }
}

# override.tf
resource "aws_instance" "app" {
  instance_type = "t3.micro"  # Only this attribute changes

  tags = {
    Name        = "test-app"      # Tags block is fully replaced
    Environment = "test"
    TestRun     = "true"
  }
}

# Result: ami = "ami-12345", instance_type = "t3.micro", monitoring = true
# Tags: Name = "test-app", Environment = "test", TestRun = "true"
```

## Best Practices

1. **Prefer the test framework overrides** (`override_resource`, `override_data`, `override_module`) over traditional override files when possible. They are scoped to test files and do not risk affecting production code.

2. **Always gitignore traditional override files.** They are meant to be local-only. If you need shared overrides, put them in the `.tftest.hcl` files instead.

3. **Document which attributes you are overriding and why.** Override files can be confusing if someone does not know they exist.

4. **Use overrides sparingly.** If you find yourself overriding most of your configuration, the module might need refactoring to be more testable.

5. **Be aware of the full replacement behavior.** If you override a resource block, make sure you include all required attributes, not just the ones you want to change.

Override files are a powerful tool in your Terraform testing toolkit. Combined with mock providers and the native test framework, they let you test your infrastructure code thoroughly without the cost and complexity of managing real cloud resources.

For related testing techniques, see [How to Use Mock Providers in Terraform Tests](https://oneuptime.com/blog/post/2026-02-23-how-to-use-mock-providers-in-terraform-tests/view) and [How to Test Terraform Modules in Isolation](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-modules-in-isolation/view).
