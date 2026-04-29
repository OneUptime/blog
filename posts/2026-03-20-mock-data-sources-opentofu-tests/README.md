# How to Mock Data Sources in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to use mock_data blocks in OpenTofu tests to provide fake data source results for unit testing modules that query external infrastructure.

## Introduction

Data sources in OpenTofu query external APIs to fetch information about existing infrastructure. In unit tests, these queries would require real credentials and real infrastructure. The `mock_data` block within `mock_provider` lets you define fake return values for data sources, enabling complete unit testing without any cloud access.

## Basic mock_data Syntax

```hcl
mock_provider "aws" {
  mock_data "aws_ami" {
    defaults = {
      id           = "ami-mock12345678"
      name         = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-20240101"
      architecture = "x86_64"
      owner_id     = "099720109477"
    }
  }
}
```

## Common Data Source Mocks

### AMI Lookup

```hcl
mock_provider "aws" {
  mock_data "aws_ami" {
    defaults = {
      id              = "ami-0abcdef1234567890"
      name            = "ubuntu-22.04-lts"
      architecture    = "x86_64"
      virtualization_type = "hvm"
      root_device_type    = "ebs"
      state           = "available"
      owner_id        = "099720109477"
      image_type      = "machine"
    }
  }
}
```

### VPC Data Source

```hcl
mock_provider "aws" {
  mock_data "aws_vpc" {
    defaults = {
      id         = "vpc-0abc123def456789a"
      cidr_block = "10.0.0.0/16"
      state      = "available"
      owner_id   = "123456789012"
    }
  }
}
```

### Subnets Lookup

```hcl
mock_provider "aws" {
  mock_data "aws_subnets" {
    defaults = {
      ids = ["subnet-aaa111", "subnet-bbb222", "subnet-ccc333"]
    }
  }

  mock_data "aws_subnet" {
    defaults = {
      id                = "subnet-aaa111"
      vpc_id            = "vpc-0abc123"
      availability_zone = "us-east-1a"
      cidr_block        = "10.0.1.0/24"
    }
  }
}
```

### IAM Policy Document

```hcl
mock_provider "aws" {
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = jsonencode({
        Version = "2012-10-17"
        Statement = [{
          Effect    = "Allow"
          Principal = { Service = "ec2.amazonaws.com" }
          Action    = "sts:AssumeRole"
        }]
      })
    }
  }
}
```

### ACM Certificate

```hcl
mock_provider "aws" {
  mock_data "aws_acm_certificate" {
    defaults = {
      id     = "arn:aws:acm:us-east-1:123456789012:certificate/mock-cert-id"
      arn    = "arn:aws:acm:us-east-1:123456789012:certificate/mock-cert-id"
      status = "ISSUED"
    }
  }
}
```

### Caller Identity

```hcl
mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
      arn        = "arn:aws:iam::123456789012:user/test-user"
      user_id    = "AIDATEST123456789012"
    }
  }
}
```

## Full Test Example with Multiple Data Sources

```hcl
# tests/unit.tftest.hcl

mock_provider "aws" {
  # Mock data sources
  mock_data "aws_ami" {
    defaults = {
      id           = "ami-mock1234"
      architecture = "x86_64"
    }
  }

  mock_data "aws_vpc" {
    defaults = {
      id         = "vpc-mock1234"
      cidr_block = "10.0.0.0/16"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "111222333444"
    }
  }

  # Mock resources
  mock_resource "aws_instance" {
    defaults = {
      id        = "i-mock12345"
      public_ip = "203.0.113.1"
    }
  }
}

variables {
  instance_type = "t3.micro"
  environment   = "test"
}

run "data_sources_resolve_correctly" {
  command = plan

  assert {
    # The module uses data.aws_ami.ubuntu.id as the AMI
    condition     = aws_instance.web.ami == "ami-mock1234"
    error_message = "Instance should use the AMI from data source"
  }
}

run "iam_policy_references_correct_account" {
  command = plan

  assert {
    # Module constructs ARN using data.aws_caller_identity.current.account_id
    condition     = can(regex("111222333444", aws_iam_role.app.assume_role_policy))
    error_message = "IAM role policy should reference the mocked account ID"
  }
}
```

## Conclusion

Mock data sources with `mock_data` blocks eliminate the need for real cloud infrastructure in unit tests. Define realistic default values for the attributes your module reads from data sources. This approach ensures your module's logic-which depends on data source results-is tested without making any API calls, enabling fast and credential-free unit testing.
