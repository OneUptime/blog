# How to Use Lifecycle Customizations with Data Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, Lifecycle, Preconditions, Postconditions, HCL, Infrastructure as Code

Description: Learn how to use lifecycle customizations with data sources in OpenTofu, including preconditions and postconditions to validate queried infrastructure.

---

Data sources support a subset of lifecycle customizations available to resources. While they don't support `create_before_destroy`, `prevent_destroy`, `ignore_changes`, or `replace_triggered_by`, they do support `enabled`, `precondition`, and `postcondition` for controlling whether a query runs and validating the data it returns.

---

## Preconditions on Data Sources

A `precondition` validates that something is true before the data source is evaluated. Use this to guard against configuration mistakes early in the plan.

```hcl
variable "environment" {
  type = string
}

data "aws_vpc" "target" {
  tags = {
    Environment = var.environment
    Name        = "${var.environment}-vpc"
  }

  lifecycle {
    precondition {
      condition     = contains(["staging", "production"], var.environment)
      error_message = "environment must be 'staging' or 'production'."
    }
  }
}
```

If the condition is false, the plan fails immediately with your custom error message before even querying AWS.

---

## Postconditions on Data Sources

A `postcondition` validates the data returned by the data source. Use this to enforce that the infrastructure you found meets your requirements.

```hcl
data "aws_vpc" "production" {
  tags = {
    Name = "production-vpc"
  }

  lifecycle {
    postcondition {
      # The VPC must have DNS support enabled
      condition     = self.enable_dns_support == true
      error_message = "The production VPC must have DNS support enabled."
    }

    postcondition {
      # The VPC CIDR must be in the expected range
      condition     = startswith(self.cidr_block, "10.")
      error_message = "Production VPC must use 10.0.0.0/8 CIDR space."
    }
  }
}
```

---

## Validating AMI Properties

```hcl
data "aws_ami" "approved" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:Approved"
    values = ["true"]
  }

  lifecycle {
    postcondition {
      # Ensure the AMI was built recently (within 90 days)
      condition = timecmp(self.creation_date, timeadd(timestamp(), "-2160h")) >= 0
      error_message = "The approved AMI is too old. Rebuild the base image."
    }

    postcondition {
      # Must be an EBS-backed AMI
      condition     = self.root_device_type == "ebs"
      error_message = "Only EBS-backed AMIs are approved for use."
    }
  }
}
```

---

## Validating SSL Certificates

```hcl
data "aws_acm_certificate" "api" {
  domain   = "api.example.com"
  statuses = ["ISSUED"]

  lifecycle {
    postcondition {
      condition     = self.status == "ISSUED"
      error_message = "ACM certificate for api.example.com must be in ISSUED state."
    }
  }
}
```

---

## Using self in Postconditions

Inside `postcondition`, use `self` to reference the data source's own attributes (just like in resource postconditions):

```hcl
data "aws_db_instance" "main" {
  db_instance_identifier = "production-db"

  lifecycle {
    postcondition {
      condition     = self.storage_encrypted == true
      error_message = "Production database must have storage encryption enabled."
    }

    postcondition {
      condition     = self.multi_az == true
      error_message = "Production database must have Multi-AZ enabled."
    }
  }
}
```

---

## Lifecycle Limitations on Data Sources

Data sources do NOT support:

- `create_before_destroy` - data sources are read-only, they have no creation lifecycle
- `prevent_destroy` - same reason
- `ignore_changes` - not applicable to data sources
- `replace_triggered_by` - data sources are re-read rather than replaced

Data sources DO support:

- `enabled` - conditionally include or skip the data source read
- `precondition` - validate before the query
- `postcondition` - validate the query result

---

## Summary

Use `precondition` blocks on data sources to validate input variables before querying, and `postcondition` blocks to validate that the discovered infrastructure meets your requirements. This surfaces misconfigurations as early as possible, often during planning, though conditions that depend on unknown values can be deferred until apply. Use `self` inside `postcondition` to reference the data source's attributes.
