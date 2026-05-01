# How to Design a Security Group Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Security Group, AWS, Module, Networking, Security

Description: Learn how to design a reusable security group module for OpenTofu that accepts dynamic ingress and egress rules and supports both CIDR and security group source references.

## Introduction

A well-designed security group module abstracts away the verbose AWS security group rule syntax while remaining flexible enough to handle CIDR blocks, security group references, and both IPv4 and IPv6 sources.

## Module Structure

```text
modules/security-group/
├── main.tf
├── variables.tf
├── outputs.tf
└── versions.tf
```

## variables.tf

```hcl
variable "name"        { type = string }
variable "description" { type = string }
variable "vpc_id"      { type = string }
variable "environment" { type = string }

variable "ingress_rules" {
  description = "List of ingress rules"
  type = list(object({
    description              = string
    from_port                = number
    to_port                  = number
    protocol                 = string
    cidr_blocks              = optional(list(string), [])
    ipv6_cidr_blocks         = optional(list(string), [])
    source_security_group_id = optional(string)
    self                     = optional(bool, false)
  }))
  default = []
}

variable "egress_rules" {
  type = list(object({
    description      = string
    from_port        = number
    to_port          = number
    protocol         = string
    cidr_blocks      = optional(list(string), ["0.0.0.0/0"])
    ipv6_cidr_blocks = optional(list(string), [])
  }))
  default = [
    {
      description = "All outbound"
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

variable "tags" { type = map(string); default = {} }
```

## main.tf

```hcl
locals {
  tags = merge({
    Name        = var.name
    Environment = var.environment
    ManagedBy   = "OpenTofu"
  }, var.tags)

  ingress_ipv4_rules = {
    for rule in flatten([
      for rule_index, rule in var.ingress_rules : [
        for cidr in rule.cidr_blocks : {
          key         = "ingress-ipv4-${rule_index}-${md5(cidr)}"
          description = rule.description
          from_port   = rule.from_port
          to_port     = rule.to_port
          protocol    = rule.protocol
          cidr_ipv4   = cidr
        }
      ]
    ]) : rule.key => rule
  }

  ingress_ipv6_rules = {
    for rule in flatten([
      for rule_index, rule in var.ingress_rules : [
        for cidr in rule.ipv6_cidr_blocks : {
          key         = "ingress-ipv6-${rule_index}-${md5(cidr)}"
          description = rule.description
          from_port   = rule.from_port
          to_port     = rule.to_port
          protocol    = rule.protocol
          cidr_ipv6   = cidr
        }
      ]
    ]) : rule.key => rule
  }

  ingress_source_sg_rules = {
    for rule_index, rule in var.ingress_rules :
    "ingress-sg-${rule_index}" => rule
    if rule.source_security_group_id != null
  }

  ingress_self_rules = {
    for rule_index, rule in var.ingress_rules :
    "ingress-self-${rule_index}" => rule
    if rule.self
  }

  egress_ipv4_rules = {
    for rule in flatten([
      for rule_index, rule in var.egress_rules : [
        for cidr in rule.cidr_blocks : {
          key         = "egress-ipv4-${rule_index}-${md5(cidr)}"
          description = rule.description
          from_port   = rule.from_port
          to_port     = rule.to_port
          protocol    = rule.protocol
          cidr_ipv4   = cidr
        }
      ]
    ]) : rule.key => rule
  }

  egress_ipv6_rules = {
    for rule in flatten([
      for rule_index, rule in var.egress_rules : [
        for cidr in rule.ipv6_cidr_blocks : {
          key         = "egress-ipv6-${rule_index}-${md5(cidr)}"
          description = rule.description
          from_port   = rule.from_port
          to_port     = rule.to_port
          protocol    = rule.protocol
          cidr_ipv6   = cidr
        }
      ]
    ]) : rule.key => rule
  }
}

resource "aws_security_group" "main" {
  name        = var.name
  description = var.description
  vpc_id      = var.vpc_id

  tags = local.tags
}

resource "aws_vpc_security_group_ingress_rule" "ipv4" {
  for_each = local.ingress_ipv4_rules

  security_group_id = aws_security_group.main.id
  description       = each.value.description
  cidr_ipv4         = each.value.cidr_ipv4
  from_port         = each.value.protocol == "-1" ? null : each.value.from_port
  to_port           = each.value.protocol == "-1" ? null : each.value.to_port
  ip_protocol       = each.value.protocol
}

resource "aws_vpc_security_group_ingress_rule" "ipv6" {
  for_each = local.ingress_ipv6_rules

  security_group_id = aws_security_group.main.id
  description       = each.value.description
  cidr_ipv6         = each.value.cidr_ipv6
  from_port         = each.value.protocol == "-1" ? null : each.value.from_port
  to_port           = each.value.protocol == "-1" ? null : each.value.to_port
  ip_protocol       = each.value.protocol
}

resource "aws_vpc_security_group_ingress_rule" "source_sg" {
  for_each = local.ingress_source_sg_rules

  security_group_id            = aws_security_group.main.id
  description                  = each.value.description
  referenced_security_group_id = each.value.source_security_group_id
  from_port                    = each.value.protocol == "-1" ? null : each.value.from_port
  to_port                      = each.value.protocol == "-1" ? null : each.value.to_port
  ip_protocol                  = each.value.protocol
}

resource "aws_vpc_security_group_ingress_rule" "self" {
  for_each = local.ingress_self_rules

  security_group_id            = aws_security_group.main.id
  description                  = each.value.description
  referenced_security_group_id = aws_security_group.main.id
  from_port                    = each.value.protocol == "-1" ? null : each.value.from_port
  to_port                      = each.value.protocol == "-1" ? null : each.value.to_port
  ip_protocol                  = each.value.protocol
}

resource "aws_vpc_security_group_egress_rule" "ipv4" {
  for_each = local.egress_ipv4_rules

  security_group_id = aws_security_group.main.id
  description       = each.value.description
  cidr_ipv4         = each.value.cidr_ipv4
  from_port         = each.value.protocol == "-1" ? null : each.value.from_port
  to_port           = each.value.protocol == "-1" ? null : each.value.to_port
  ip_protocol       = each.value.protocol
}

resource "aws_vpc_security_group_egress_rule" "ipv6" {
  for_each = local.egress_ipv6_rules

  security_group_id = aws_security_group.main.id
  description       = each.value.description
  cidr_ipv6         = each.value.cidr_ipv6
  from_port         = each.value.protocol == "-1" ? null : each.value.from_port
  to_port           = each.value.protocol == "-1" ? null : each.value.to_port
  ip_protocol       = each.value.protocol
}
```

## Example Usage

```hcl
module "app_sg" {
  source      = "./modules/security-group"
  name        = "app-server-sg"
  description = "Security group for application servers"
  vpc_id      = module.vpc.vpc_id
  environment = var.environment

  ingress_rules = [
    {
      description = "HTTPS from internet"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description              = "App port from ALB"
      from_port                = 8080
      to_port                  = 8080
      protocol                 = "tcp"
      source_security_group_id = module.alb_sg.security_group_id
    }
  ]
}
```

## outputs.tf

```hcl
output "security_group_id"  { value = aws_security_group.main.id }
output "security_group_arn" { value = aws_security_group.main.arn }
output "security_group_name" { value = aws_security_group.main.name }
```

## Conclusion

This security group module expands each logical rule into dedicated security group rule resources, and the `optional()` type constraints provide sensible defaults so callers only specify what they need. Using `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` follows the provider's current best practice while still supporting CIDR ranges, security group references, and IPv4/IPv6 traffic sources.
