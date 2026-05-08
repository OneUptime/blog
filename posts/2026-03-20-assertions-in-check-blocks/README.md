# How to Write Assertions in Check Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Testing

Description: Learn how to write effective assertion expressions in OpenTofu check blocks, including condition patterns, error messages, and multi-assertion strategies.

## Introduction

Assertions are the heart of check blocks. Each `assert` block contains a `condition` expression that must evaluate to `true` for the check to pass, and an `error_message` that explains what went wrong when it fails. Writing clear, specific assertions makes your infrastructure self-documenting and easier to debug.

## Assert Block Structure

```hcl
check "check_name" {
  assert {
    condition     = <boolean expression>
    error_message = "What went wrong and what the expected value should be"
  }
}
```

## Assertion Patterns

### Simple Equality Check

```hcl
check "correct_region" {
  assert {
    condition     = aws_instance.web.availability_zone == "us-east-1a"
    error_message = "Instance should be in us-east-1a, got: ${aws_instance.web.availability_zone}"
  }
}
```

### Membership Check

```hcl
check "valid_instance_type" {
  assert {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], aws_instance.web.instance_type)
    error_message = "Instance type '${aws_instance.web.instance_type}' is not in the approved list"
  }
}
```

### Minimum/Maximum Values

```hcl
check "backup_retention_adequate" {
  assert {
    condition     = aws_db_instance.main.backup_retention_period >= 7
    error_message = "Backup retention must be at least 7 days, current: ${aws_db_instance.main.backup_retention_period}"
  }
}
```

### Boolean Checks

```hcl
check "encryption_enabled" {
  assert {
    condition     = aws_ebs_volume.data.encrypted == true
    error_message = "EBS volume must be encrypted"
  }
}
```

### String Pattern Matching

```hcl
check "naming_convention" {
  assert {
    condition     = can(regex("^prod-[a-z]+-[0-9]{3}$", aws_instance.web.tags["Name"]))
    error_message = "Resource name '${aws_instance.web.tags["Name"]}' does not match naming convention 'prod-<service>-<num>'"
  }
}
```

### Non-Empty Collection Check

```hcl
check "has_security_groups" {
  assert {
    condition     = length(aws_instance.web.vpc_security_group_ids) > 0
    error_message = "Instance must have at least one security group assigned"
  }
}
```

### Cross-Resource Consistency

```hcl
check "vpc_region_consistency" {
  assert {
    condition = aws_vpc.main.id == aws_subnet.public.vpc_id
    error_message = "Subnet ${aws_subnet.public.id} is not in the expected VPC ${aws_vpc.main.id}"
  }
}
```

## Writing Informative Error Messages

Error messages should include:
1. What the expected value/state was
2. What the actual value/state is

```hcl
check "tag_compliance" {
  assert {
    # Include actual value in the message
    condition = contains(["development", "staging", "production"], aws_instance.web.tags["Environment"])
    error_message = <<-EOT
      Invalid Environment tag value: '${aws_instance.web.tags["Environment"]}'
      Expected one of: development, staging, production
    EOT
  }
}
```

## Multiple Assertions Per Check Block

```hcl
check "complete_tagging" {
  assert {
    condition     = can(aws_instance.web.tags["Environment"])
    error_message = "Missing required tag: Environment"
  }

  assert {
    condition     = can(aws_instance.web.tags["Owner"])
    error_message = "Missing required tag: Owner"
  }

  assert {
    condition     = can(aws_instance.web.tags["CostCenter"])
    error_message = "Missing required tag: CostCenter"
  }

  assert {
    condition     = can(aws_instance.web.tags["Project"])
    error_message = "Missing required tag: Project"
  }
}
```

## Using try() for Safe Attribute Access

When an attribute might not exist:

```hcl
check "optional_tag_value" {
  assert {
    condition     = try(aws_instance.web.tags["Environment"], "unset") != "unset"
    error_message = "Instance is missing the Environment tag"
  }
}
```

## Conclusion

Well-written assertions make your infrastructure self-documenting and failures self-diagnosing. Always include the actual value in error messages using string interpolation, use `try()` or `can()` for safe optional attribute checks, and group related assertions in a single check block. Multiple assertions in one check block run independently - all failures are reported even if the first one fails.
