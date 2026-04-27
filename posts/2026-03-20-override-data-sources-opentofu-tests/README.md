# How to Override Data Sources in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Override Data Sources, Mock, Infrastructure as Code

Description: Learn how to use `override_data` in OpenTofu tests to provide controlled return values for data sources without making real cloud API calls.

## Introduction

Data sources in OpenTofu modules look up existing infrastructure-finding the latest AMI, reading a secret from AWS Secrets Manager, or resolving a VPC ID. During tests, these lookups either fail (no credentials) or return unpredictable results. The `override_data` block solves this by substituting a fixed return value for any data source.

## Basic `override_data` Syntax

```hcl
# tests/ami.tftest.hcl

mock_provider "aws" {}

run "instance_uses_latest_ubuntu_ami" {
  # Override the data source to return a controlled AMI ID
  override_data {
    target = data.aws_ami.ubuntu_latest

    values = {
      id           = "ami-0abc123456789def"
      name         = "ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-20260101"
      owner_id     = "099720109477"
      architecture = "x86_64"
    }
  }

  assert {
    condition     = aws_instance.web.ami == "ami-0abc123456789def"
    error_message = "Instance should use the AMI from the data source"
  }
}
```

## File-Level Data Source Overrides

Apply an override to every `run` block in the file by placing it at the top level:

```hcl
# Override the account identity data source for all runs

override_data {
  target = data.aws_caller_identity.current

  values = {
    account_id = "123456789012"
    arn        = "arn:aws:iam::123456789012:user/ci-user"
    user_id    = "AIDATEST1234567890AB"
  }
}

run "bucket_policy_uses_account_id" {
  assert {
    condition     = strcontains(aws_s3_bucket_policy.this.policy, "123456789012")
    error_message = "Bucket policy should reference the current account ID"
  }
}
```

## Overriding Secret Data Sources

A common pattern is mocking AWS Secrets Manager lookups:

```hcl
# In the module:
# data "aws_secretsmanager_secret_version" "db_password" {
#   secret_id = var.db_secret_arn
# }

mock_provider "aws" {}

run "rds_uses_password_from_secrets_manager" {
  override_data {
    target = data.aws_secretsmanager_secret_version.db_password

    values = {
      secret_string = "{\"password\":\"test-password-123\"}"
      version_id    = "abc-def-123"
    }
  }

  assert {
    condition     = aws_db_instance.this.password == jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string).password
    error_message = "RDS instance should use the password from Secrets Manager"
  }
}
```

## Overriding Multiple Data Sources

Complex modules may read several data sources. Override all of them:

```hcl
mock_provider "aws" {}

run "full_network_configuration" {
  # Override VPC lookup
  override_data {
    target = data.aws_vpc.selected

    values = {
      id         = "vpc-0abc123def456789"
      cidr_block = "10.0.0.0/16"
    }
  }

  # Override subnet lookup
  override_data {
    target = data.aws_subnets.private

    values = {
      ids = ["subnet-0aaa", "subnet-0bbb", "subnet-0ccc"]
    }
  }

  # Override security group lookup
  override_data {
    target = data.aws_security_group.default

    values = {
      id   = "sg-0abc123"
      name = "default"
    }
  }

  assert {
    condition     = aws_eks_cluster.this.vpc_config[0].vpc_id == "vpc-0abc123def456789"
    error_message = "EKS cluster should use the selected VPC"
  }
}
```

## When Data Overrides Are Not Needed

If you are using a `mock_provider`, data sources automatically return generated mock values. Use `override_data` only when you need a specific value that your assertions depend on-otherwise the auto-generated mock values are sufficient.

## Conclusion

`override_data` removes the last barrier to credential-free unit testing: data source dependencies. By providing controlled values for every data source, your tests become deterministic, fast, and safe to run in any environment.
