# How to Use Custom Conditions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use custom conditions including validation rules, preconditions, and postconditions in OpenTofu to enforce business logic and catch errors early.

## Introduction

Custom conditions in OpenTofu allow you to enforce rules and constraints directly in your infrastructure code. They help catch configuration errors early, validate inputs, and ensure outputs meet expectations before resources are created or after they are provisioned.

OpenTofu supports three types of custom conditions:
- **Variable validation** - validate input variable values
- **Preconditions** - assert conditions before a resource or data source is created
- **Postconditions** - assert conditions after a resource or data source is created

## Variable Validation

Variable validation lets you reject invalid inputs before any planning occurs.

```hcl
# variables.tf

variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    # Ensure only allowed environments are used
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "instance_count" {
  type        = number
  description = "Number of EC2 instances to launch"

  validation {
    # Prevent zero or negative instance counts
    condition     = var.instance_count > 0
    error_message = "instance_count must be a positive integer."
  }

  validation {
    # Cap instance count for cost control
    condition     = var.instance_count <= 20
    error_message = "instance_count must not exceed 20."
  }
}
```

Multiple `validation` blocks are allowed per variable. Each runs independently.

## Preconditions

Preconditions are placed inside a `lifecycle` block on a resource or data source. They run before the resource is created or updated.

```hcl
# main.tf

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }

  lifecycle {
    precondition {
      # Restrict AMI lookups to regions we have validated
      condition     = contains(["us-east-1", "us-west-2", "eu-west-1"], var.aws_region)
      error_message = "AMI lookup is only supported in us-east-1, us-west-2, and eu-west-1."
    }
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  lifecycle {
    precondition {
      # Enforce t3 family instances only
      condition     = startswith(var.instance_type, "t3.")
      error_message = "Only t3.* instance types are permitted in this configuration."
    }
  }
}
```

## Postconditions

Postconditions validate the state of a resource after it has been created. Use them to verify that resource attributes match expectations.

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-company-data-${var.environment}"

  lifecycle {
    postcondition {
      # Verify the bucket was created in the correct region
      condition     = self.region == var.aws_region
      error_message = "S3 bucket was created in ${self.region} but expected ${var.aws_region}."
    }
  }
}

resource "aws_lb" "main" {
  name               = "app-lb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids

  lifecycle {
    postcondition {
      # Ensure a DNS name was assigned
      condition     = self.dns_name != ""
      error_message = "Load balancer did not receive a DNS name."
    }
  }
}
```

## Combining Conditions with Output Validation

You can also add preconditions to output blocks.

```hcl
output "db_endpoint" {
  value = aws_db_instance.main.endpoint

  precondition {
    # Only expose the endpoint when the DB is available
    condition     = aws_db_instance.main.status == "available"
    error_message = "Database is not in available state: ${aws_db_instance.main.status}."
  }
}
```

## Step-by-Step Usage

1. **Identify the rule** - decide whether the rule is about input (variable validation), resource precondition, or output postcondition.
2. **Write the condition expression** - use any OpenTofu expression that evaluates to `true` or `false`.
3. **Write a clear error message** - include dynamic values using `${...}` to help diagnose failures.
4. **Run `tofu validate`** - catches syntax errors before applying.
5. **Run `tofu plan`** - conditions are evaluated during the plan phase.

## Best Practices

- Keep conditions simple and focused on a single assertion.
- Always include actionable error messages.
- Use variable validation for user-facing inputs.
- Use preconditions to guard against bad data source results.
- Use postconditions to verify cloud-side behavior that OpenTofu cannot predict.

## Conclusion

Custom conditions are a powerful feature in OpenTofu that shift error detection left, reducing the chance of broken infrastructure reaching production. By combining variable validation, preconditions, and postconditions, you can build self-documenting, self-enforcing modules that are robust and easy to debug.
