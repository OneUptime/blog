# How to Override Data Sources in OpenTofu Tests - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Data Source, Mock, Infrastructure as Code

Description: Learn how to override data source responses in OpenTofu tests using override_data to control test inputs without making real cloud API calls.

## Introduction

OpenTofu configurations often depend on data sources that query cloud APIs for AMI IDs, VPC details, or account information. In tests, you want to control what these data sources return without making real API calls. The `override_data` directive in OpenTofu tests lets you specify exactly what a data source should return.

## Why Override Data Sources

Data sources can be problematic in tests because:
- They make real API calls, requiring credentials
- Results can change over time (e.g., latest AMI ID changes)
- They may return region-specific data that varies
- API calls slow down the test suite

## Basic Data Source Override

Given this configuration:

```hcl
# main.tf

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}

data "aws_subnet" "selected" {
  tags = {
    Environment = var.environment
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = data.aws_subnet.selected.id
}
```

Override the data sources in tests:

```hcl
# tests/data_override.tftest.hcl

run "override_ami_and_vpc" {
  command = plan

  override_data {
    target = data.aws_ami.ubuntu
    values = {
      id           = "ami-mock-ubuntu-22"
      name         = "ubuntu-22.04-test"
      architecture = "x86_64"
      owner_id     = "099720109477"
    }
  }

  override_data {
    target = data.aws_subnet.selected
    values = {
      id         = "subnet-mock12345"
      cidr_block = "10.0.1.0/24"
    }
  }

  variables {
    instance_type = "t3.micro"
    environment   = "testing"
  }

  assert {
    condition     = aws_instance.app.ami == "ami-mock-ubuntu-22"
    error_message = "Instance should use the mocked AMI"
  }
}
```

## Overriding Account and Region Data Sources

```hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  bucket_name = "${local.account_id}-${local.region}-state"
}
```

Test with overridden account data:

```hcl
run "bucket_name_uses_account_and_region" {
  command = plan

  override_data {
    target = data.aws_caller_identity.current
    values = {
      account_id = "123456789012"
      arn        = "arn:aws:iam::123456789012:user/test"
      user_id    = "AIDATEST"
    }
  }

  override_data {
    target = data.aws_region.current
    values = {
      name        = "us-east-1"
      description = "US East (N. Virginia)"
    }
  }

  assert {
    condition     = local.bucket_name == "123456789012-us-east-1-state"
    error_message = "Bucket name should include account ID and region"
  }
}
```

## Overriding Data Sources with Complex Results

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  availability_zone = data.aws_availability_zones.available.names[count.index]
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
}
```

```hcl
run "subnets_use_three_azs" {
  command = plan

  override_data {
    target = data.aws_availability_zones.available
    values = {
      names    = ["us-east-1a", "us-east-1b", "us-east-1c"]
      zone_ids = ["use1-az1", "use1-az2", "use1-az3"]
    }
  }

  assert {
    condition     = aws_subnet.public[0].availability_zone == "us-east-1a"
    error_message = "First subnet should be in us-east-1a"
  }

  assert {
    condition     = length(aws_subnet.public) == 3
    error_message = "Should create 3 subnets"
  }
}
```

## Combining override_data with mock_provider

For complete offline testing, combine data source overrides with a mock provider:

```hcl
mock_provider "aws" {
  mock_resource "aws_instance" {
    defaults = {
      id = "i-mock"
    }
  }
}

run "full_offline_test" {
  command = plan

  override_data {
    target = data.aws_ami.ubuntu
    values = {
      id           = "ami-mock"
      architecture = "x86_64"
    }
  }

  override_data {
    target = data.aws_subnet.selected
    values = {
      id = "subnet-mock"
    }
  }

  assert {
    condition     = aws_instance.app.ami == "ami-mock"
    error_message = "Should use mocked AMI"
  }
}
```

## Best Practices

- Always override data sources that make external API calls in unit tests.
- Use realistic values in overrides to catch type mismatches.
- Combine `override_data` with `expect_failures` to test what happens with bad data source values.
- Document which data sources are being overridden and why in test file comments.
- Run tests with real data sources in separate integration test files.

## Conclusion

The `override_data` directive in OpenTofu tests gives you complete control over data source responses, enabling fast, offline, and deterministic tests. By overriding AMIs, VPC IDs, and account data, you can test configuration logic without cloud credentials or API calls.
