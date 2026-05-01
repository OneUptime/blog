# How to Use Dynamic Blocks for AWS Security Group Rules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, Security Group, Dynamic Blocks, HCL

Description: Learn how to use dynamic blocks in OpenTofu to generate AWS security group ingress and egress rules from variable lists, eliminating repetitive rule definitions.

## Introduction

AWS security groups often require many ingress and egress rules. If you manage rules inline on `aws_security_group`, defining each rule as a static block leads to verbose, repetitive HCL. Dynamic blocks let you generate these rules programmatically from a list or map, keeping your configuration concise and maintainable. For new configurations, the AWS provider recommends dedicated `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources, but dynamic blocks remain useful when you intentionally manage inline rules.

## Basic Dynamic Ingress Rules

Use a `dynamic` block to iterate over a list of port definitions and generate one ingress rule per entry.

```hcl
variable "allowed_ingress_rules" {
  description = "List of ingress rules for the application security group"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS from internet"
    },
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP for redirect"
    },
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "SSH from corporate network"
    }
  ]
}

resource "aws_security_group" "app" {
  name        = "app-security-group"
  description = "Security group for application servers"
  vpc_id      = var.vpc_id

  # Generate one ingress block per rule in the variable
  dynamic "ingress" {
    for_each = var.allowed_ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  # Static egress rule allowing all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "app-security-group"
  }
}
```

## Dynamic Rules with Security Group Sources

Mix CIDR-based and security group source rules using a conditional inside the dynamic block.

```hcl
variable "sg_ingress_rules" {
  type = list(object({
    from_port              = number
    to_port                = number
    protocol               = string
    cidr_blocks            = optional(list(string), [])
    source_security_group  = optional(string, "")
    description            = string
  }))
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.sg_ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      description = ingress.value.description

      # Use CIDR blocks if provided, otherwise use security group reference
      cidr_blocks     = length(ingress.value.cidr_blocks) > 0 ? ingress.value.cidr_blocks : null
      security_groups = ingress.value.source_security_group != "" ? [ingress.value.source_security_group] : null
    }
  }
}
```

## Separate Ingress and Egress Variables

For more granular control, define ingress and egress rules independently.

```hcl
variable "ingress_rules" {
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
}

locals {
  # Default egress rules applied to all security groups
  default_egress_rules = [
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS outbound"
    },
    {
      from_port   = 53
      to_port     = 53
      protocol    = "udp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "DNS resolution"
    }
  ]
}

resource "aws_security_group" "restricted" {
  name   = "restricted-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  dynamic "egress" {
    for_each = local.default_egress_rules
    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }
}
```

## Conclusion

Dynamic blocks for inline AWS security group rules eliminate copy-paste rule definitions and make your security policies data-driven. Store the rule lists in variables or YAML files, and the same `aws_security_group` resource definition can handle any number of inline rules cleanly. This pattern also makes it straightforward to add or remove rules through variable changes rather than HCL edits. If you are starting fresh, prefer the dedicated `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources that the AWS provider now recommends.
