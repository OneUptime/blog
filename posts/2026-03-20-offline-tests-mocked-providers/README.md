# How to Write Offline Tests with Mocked Providers in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Mock Providers, Unit Testing, Infrastructure as Code

Description: Learn how to use OpenTofu's mock provider feature to write offline tests that don't require real cloud credentials or infrastructure, enabling fast unit testing of modules.

## Introduction

OpenTofu's native testing framework supports mock providers that return predefined responses instead of calling real cloud APIs. This enables fast, offline unit tests that validate your module logic, variable handling, and resource configurations without needing cloud credentials or incurring costs.

## When to Use Mock Providers

Use mock providers when:
- Testing logic and configuration correctness without cloud access.
- Running tests in CI environments without cloud credentials.
- Writing unit tests that should complete in seconds.
- Testing edge cases that are hard to reproduce with real infrastructure.

## Defining a Mock Provider

```hcl
# tests/unit.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      id               = "i-1234567890abcdef0"
      arn              = "arn:aws:ec2:us-east-1:123456789:instance/i-1234567890abcdef0"
      public_ip        = "203.0.113.10"
      private_ip       = "10.0.1.10"
      availability_zone = "us-east-1a"
      instance_state   = "running"
    }
  }

  mock_data "aws_ami" {
    defaults = {
      id           = "ami-0abcdef1234567890"
      name         = "ubuntu-22.04-test"
      architecture = "x86_64"
      owner_id     = "123456789012"
    }
  }
}
```

## Basic Mock Provider Test

```hcl
# modules/ec2/main.tf

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "environment" {
  type = string
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = {
    Environment = var.environment
    Name        = "web-${var.environment}"
  }
}

output "public_ip" {
  value = aws_instance.web.public_ip
}
```

Test file:

```hcl
# modules/ec2/tests/unit.tftest.hcl

mock_provider "aws" {
  mock_data "aws_ami" {
    defaults = {
      id = "ami-mock"
    }
  }

  mock_resource "aws_instance" {
    defaults = {
      id        = "i-mock"
      public_ip = "10.0.0.1"
    }
  }
}

run "correct_tags_applied" {
  command = plan

  variables {
    instance_type = "t3.micro"
    environment   = "testing"
  }

  assert {
    condition     = aws_instance.web.tags["Environment"] == "testing"
    error_message = "Environment tag should be 'testing'"
  }

  assert {
    condition     = aws_instance.web.tags["Name"] == "web-testing"
    error_message = "Name tag should be 'web-testing'"
  }
}

run "output_uses_instance_ip" {
  command = apply

  variables {
    instance_type = "t3.micro"
    environment   = "testing"
  }

  assert {
    condition     = output.public_ip == "10.0.0.1"
    error_message = "Public IP output should match mock instance IP"
  }
}
```

## Overriding Specific Resources

Use `override_resource` to change behavior for a single test run:

```hcl
run "large_instance_type" {
  command = plan

  variables {
    instance_type = "m5.large"
    environment   = "prod"
  }

  override_resource {
    target = aws_instance.web
    values = {
      id = "i-prod-mock"
    }
  }

  assert {
    condition     = aws_instance.web.instance_type == "m5.large"
    error_message = "Should use m5.large in prod"
  }
}
```

## Mocking Multiple Providers

```hcl
mock_provider "aws" {
  mock_resource "aws_s3_bucket" {
    defaults = {
      id     = "my-test-bucket"
      arn    = "arn:aws:s3:::my-test-bucket"
      region = "us-east-1"
    }
  }
}

mock_provider "cloudflare" {
  mock_resource "cloudflare_record" {
    defaults = {
      id   = "mock-dns-record"
      name = "www"
    }
  }
}
```

## Running Offline Tests

```bash
# Run all tests (no real credentials needed with mock providers)

tofu test

# Run a specific test file
tofu test -filter=tests/unit.tftest.hcl

# Run with verbose output
tofu test -verbose
```

Tests complete in seconds without any cloud API calls.

## Combining Mock and Real Providers

You can mix mock and real providers in different test files:

```hcl
# tests/unit.tftest.hcl - uses mock provider
mock_provider "aws" { ... }

# tests/integration.tftest.hcl - uses real provider
provider "aws" {
  region = "us-east-1"
}
```

Run only offline tests:

```bash
tofu test -filter=tests/unit.tftest.hcl
```

## Best Practices

- Use mock providers for all pure logic tests - checking tags, naming conventions, and output calculations.
- Use real providers only for integration tests that verify actual cloud behavior.
- Mock all external data sources to prevent network calls in unit tests.
- Set realistic mock values to catch type and attribute errors.
- Run mock tests in CI on every pull request; run integration tests nightly or on merge.

## Conclusion

OpenTofu's mock provider support enables a true unit testing workflow for infrastructure code. By mocking cloud providers, you can validate module logic offline in seconds, catching errors before they ever reach real cloud infrastructure.
