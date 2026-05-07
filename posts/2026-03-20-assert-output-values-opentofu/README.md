# How to Assert Output Values in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to write assertions against module output values in OpenTofu tests to verify that your modules return the correct data.

## Introduction

Module outputs are the public API of your infrastructure modules. Testing them ensures that callers receive the correct values. In OpenTofu tests, you can assert output values using the `output.<name>` syntax inside `assert` blocks. Both plan-mode and apply-mode tests can check output values.

## Basic Output Assertion

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

```hcl
# tests/outputs.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id = "vpc-0abc123"
    }
  }

  mock_resource "aws_subnet" {
    defaults = {
      id = "subnet-0abc123"
    }
  }
}

variables {
  vpc_cidr        = "10.0.0.0/16"
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

run "vpc_id_is_output" {
  command = plan

  assert {
    condition     = output.vpc_id != ""
    error_message = "vpc_id output should not be empty"
  }
}

run "correct_number_of_subnets_output" {
  command = plan

  assert {
    condition     = length(output.private_subnet_ids) == 3
    error_message = "Should output 3 private subnet IDs, got: ${length(output.private_subnet_ids)}"
  }
}
```

## Testing Computed Output Values

```hcl
# modules/naming/outputs.tf
output "resource_name" {
  value = "${var.environment}-${var.service}-${var.region}"
}

output "bucket_name" {
  value = "${var.environment}-${var.organization}-state"
}
```

```hcl
# tests/naming.tftest.hcl

mock_provider "aws" {}

variables {
  environment  = "prod"
  service      = "api"
  region       = "us-east-1"
  organization = "acme"
}

run "resource_name_format_is_correct" {
  command = plan

  assert {
    condition     = output.resource_name == "prod-api-us-east-1"
    error_message = "Resource name '${output.resource_name}' does not match expected format"
  }
}

run "bucket_name_format_is_correct" {
  command = plan

  assert {
    condition     = output.bucket_name == "prod-acme-state"
    error_message = "Bucket name '${output.bucket_name}' does not match expected format"
  }
}
```

## Testing Output Types and Structures

```hcl
# modules/alb/outputs.tf
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "target_group_arns" {
  value = aws_lb_target_group.main[*].arn
}

output "connection_info" {
  value = {
    dns_name = aws_lb.main.dns_name
    port     = 443
    protocol = "HTTPS"
  }
}
```

```hcl
# tests/alb_outputs.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_lb" {
    defaults = {
      dns_name = "my-alb-123456789.us-east-1.elb.amazonaws.com"
      arn      = "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/1234"
    }
  }

  mock_resource "aws_lb_target_group" {
    defaults = {
      arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/1234"
    }
  }
}

run "dns_name_output_populated" {
  command = plan

  assert {
    condition     = output.alb_dns_name != ""
    error_message = "ALB DNS name output should not be empty"
  }
}

run "target_group_arns_is_list" {
  command = plan

  assert {
    condition     = length(output.target_group_arns) > 0
    error_message = "At least one target group ARN should be output"
  }
}

run "connection_info_has_correct_port" {
  command = plan

  assert {
    condition     = output.connection_info.port == 443
    error_message = "Connection info should specify port 443"
  }

  assert {
    condition     = output.connection_info.protocol == "HTTPS"
    error_message = "Connection info should specify HTTPS protocol"
  }
}
```

## Testing Sensitive Outputs

Sensitive outputs can be referenced in assertions, but `error_message` should not include the sensitive value itself:

```hcl
# modules/rds/outputs.tf
output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}
```

```hcl
# tests/sensitive_outputs.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_db_instance" {
    defaults = {
      endpoint = "mydb.abc123.us-east-1.rds.amazonaws.com:5432"
      address  = "mydb.abc123.us-east-1.rds.amazonaws.com"
    }
  }
}

run "db_endpoint_is_populated" {
  command = plan

  assert {
    condition     = output.db_endpoint != ""
    # Keep error_message static; referencing a sensitive value here suppresses the rendered message
    error_message = "Database endpoint should not be empty"
  }
}
```

## Conclusion

Asserting output values verifies that your module's public API returns the correct data to callers. Test output formats, computed values, list lengths, and object structures. Use mock providers to control the attribute values that feed into output calculations. For complex modules, output tests are often the most valuable unit tests because they validate the contract between the module and its consumers.
