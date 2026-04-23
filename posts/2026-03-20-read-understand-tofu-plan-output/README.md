# How to Read and Understand tofu plan Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu plan, Plan Output, Infrastructure as Code, DevOps

Description: A guide to interpreting OpenTofu plan output to understand infrastructure changes before applying them.

## Introduction

Reading and understanding the `tofu plan` output is a critical skill for safely managing infrastructure. The plan output shows what changes OpenTofu plans to make to your infrastructure. This guide explains each part of the plan output in detail.

## Plan Output Structure

A typical plan output has these sections:

1. Provider refresh output
2. Change summary with symbols
3. Resource change details
4. Final plan summary

## Understanding Change Symbols

```text
+ Resource will be CREATED (new resource)
- Resource will be DESTROYED (removed)
~ Resource will be UPDATED IN-PLACE (modified without recreation)
-/+ Resource will be DESTROYED then RECREATED (replacement)
<= Data source will be READ DURING APPLY

# Specific attribute symbols within a resource block:

+ attribute will be added
- attribute will be removed
~ attribute will be changed
(known after apply) = value not known until after create
(forces replacement) = changing this attribute causes recreation
```

## Reading a Create Action

```hcl
# aws_instance.web_server will be created
+ resource "aws_instance" "web_server" {
    + ami                          = "ami-0c55b159cbfafe1f0"
    + arn                          = (known after apply)
    + id                           = (known after apply)
    + instance_type                = "t2.micro"
    + public_ip                    = (known after apply)
    + tags                         = {
        + "Environment" = "dev"
        + "Name"        = "web-server"
      }
    # ... more attributes
  }
```

Key things to check:
- What is being created? (`aws_instance.web_server`)
- What are the known values? (`ami`, `instance_type`)
- What values are unknown until after creation? (`(known after apply)`)

## Reading an Update Action

```hcl
# aws_instance.web_server will be updated in-place
~ resource "aws_instance" "web_server" {
      id            = "i-0abc123def456"
    ~ instance_type = "t2.micro" -> "t2.small"  # <-- changing from -> to
      # (all other attributes unchanged)
  }
```

## Reading a Replace Action (Destroy + Create)

```hcl
# aws_instance.web_server must be replaced
-/+ resource "aws_instance" "web_server" {
    ~ id  = "i-0abc123def456" -> (known after apply)  # Will change
    ~ ami = "ami-old" -> "ami-new"  # (forces replacement)
    # ... other attributes
  }
```

The `(forces replacement)` indicator means changing that attribute requires destroying the resource and creating a new one.

## Reading a Destroy Action

```hcl
# aws_instance.web_server will be destroyed
- resource "aws_instance" "web_server" {
    - ami           = "ami-0c55b159cbfafe1f0" -> null
    - id            = "i-0abc123def456" -> null
    - instance_type = "t2.micro" -> null
    - tags          = {
        - "Name" = "web-server" -> null
      }
  }
```

## Reading Data Source Reads

```text
# data.aws_ami.ubuntu will be read during apply
<= data "aws_ami" "ubuntu" {
    + id   = (known after apply)
    + name = (known after apply)
  }
```

## The Plan Summary Line

```text
Plan: 3 to add, 1 to change, 0 to destroy.
```

This quick summary tells you:
- **3 to add**: 3 new resources will be created
- **1 to change**: 1 existing resource will be modified
- **0 to destroy**: No resources will be deleted

## Interpreting a Complex Plan

```hcl
# A more complex configuration
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id  # Depends on VPC

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

```hcl
# Example plan output for this:
# aws_vpc.main will be created
+ resource "aws_vpc" "main" {
    + cidr_block = "10.0.0.0/16"
    + id         = (known after apply)
  }

# aws_security_group.web will be created
+ resource "aws_security_group" "web" {
    + id     = (known after apply)
    + vpc_id = (known after apply)  # <-- Unknown because VPC isn't created yet
  }
```

## Using `tofu show -json` for Machine-Readable Plans

```bash
# Save plan and convert to JSON
tofu plan -out=plan.tfplan
tofu show -json -plan=plan.tfplan | jq '.resource_changes[] | {address: .address, action: .change.actions}'

# Example output:
# [{"address": "aws_vpc.main", "action": ["create"]},
#  {"address": "aws_security_group.web", "action": ["create"]}]
```

## Conclusion

Mastering plan output reading is essential for safe infrastructure management. Always review plans carefully before applying, paying special attention to destroy and replace actions as these are irreversible. The `-detailed-exitcode` flag is useful in CI/CD to detect when changes are present, and `tofu show -json` enables automated plan analysis for complex infrastructure changes.
