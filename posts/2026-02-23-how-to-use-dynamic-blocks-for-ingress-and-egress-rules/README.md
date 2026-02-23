# How to Use Dynamic Blocks for Ingress and Egress Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Ingress, Egress, Networking, AWS, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to manage ingress and egress rules across security groups, NACLs, and load balancer listeners.

---

Ingress and egress rules show up in many Terraform resources - security groups, network ACLs, Kubernetes network policies, and load balancer configurations. Each of these has nested blocks that repeat with different values. Dynamic blocks let you generate these rules from lists or maps, keeping your networking configuration clean and variable-driven.

## Security Group Ingress and Egress

The most common use case is AWS security groups. Here is a complete pattern that handles both ingress and egress with full flexibility:

```hcl
# variables.tf
variable "ingress_rules" {
  description = "Ingress rules for the security group"
  type = list(object({
    from_port        = number
    to_port          = number
    protocol         = string
    cidr_blocks      = optional(list(string), [])
    ipv6_cidr_blocks = optional(list(string), [])
    security_groups  = optional(list(string), [])
    self             = optional(bool, false)
    prefix_list_ids  = optional(list(string), [])
    description      = string
  }))
}

variable "egress_rules" {
  description = "Egress rules for the security group"
  type = list(object({
    from_port        = number
    to_port          = number
    protocol         = string
    cidr_blocks      = optional(list(string), [])
    ipv6_cidr_blocks = optional(list(string), [])
    security_groups  = optional(list(string), [])
    prefix_list_ids  = optional(list(string), [])
    description      = string
  }))
}
```

```hcl
# security_group.tf
resource "aws_security_group" "main" {
  name        = "${terraform.workspace}-main-sg"
  description = "Main security group for ${terraform.workspace}"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port        = ingress.value.from_port
      to_port          = ingress.value.to_port
      protocol         = ingress.value.protocol
      cidr_blocks      = ingress.value.cidr_blocks
      ipv6_cidr_blocks = ingress.value.ipv6_cidr_blocks
      security_groups  = ingress.value.security_groups
      self             = ingress.value.self
      prefix_list_ids  = ingress.value.prefix_list_ids
      description      = ingress.value.description
    }
  }

  dynamic "egress" {
    for_each = var.egress_rules

    content {
      from_port        = egress.value.from_port
      to_port          = egress.value.to_port
      protocol         = egress.value.protocol
      cidr_blocks      = egress.value.cidr_blocks
      ipv6_cidr_blocks = egress.value.ipv6_cidr_blocks
      security_groups  = egress.value.security_groups
      prefix_list_ids  = egress.value.prefix_list_ids
      description      = egress.value.description
    }
  }

  tags = {
    Name        = "${terraform.workspace}-main-sg"
    Environment = terraform.workspace
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Simplified Port-Based Rules

For simpler use cases, you might not need every field. Define a shorthand format:

```hcl
# Simple port-based rules
variable "allowed_ports" {
  description = "Ports to allow inbound"
  type = map(object({
    port     = number
    protocol = string
    sources  = list(string)
  }))
  default = {
    http  = { port = 80, protocol = "tcp", sources = ["0.0.0.0/0"] }
    https = { port = 443, protocol = "tcp", sources = ["0.0.0.0/0"] }
    ssh   = { port = 22, protocol = "tcp", sources = ["10.0.0.0/8"] }
  }
}

resource "aws_security_group" "simple" {
  name   = "${terraform.workspace}-simple-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.allowed_ports

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.sources
      description = ingress.key  # The map key becomes the description
    }
  }

  # Default egress allows all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }
}
```

## Network ACL Rules

Network ACL rules have a different structure than security groups - they include rule numbers and explicit allow/deny actions:

```hcl
variable "nacl_ingress_rules" {
  description = "Ingress rules for the network ACL"
  type = list(object({
    rule_no    = number
    action     = string
    protocol   = string
    from_port  = number
    to_port    = number
    cidr_block = string
  }))
  default = [
    {
      rule_no    = 100
      action     = "allow"
      protocol   = "tcp"
      from_port  = 443
      to_port    = 443
      cidr_block = "0.0.0.0/0"
    },
    {
      rule_no    = 110
      action     = "allow"
      protocol   = "tcp"
      from_port  = 80
      to_port    = 80
      cidr_block = "0.0.0.0/0"
    },
    {
      rule_no    = 120
      action     = "allow"
      protocol   = "tcp"
      from_port  = 22
      to_port    = 22
      cidr_block = "10.0.0.0/8"
    },
    {
      rule_no    = 130
      action     = "allow"
      protocol   = "tcp"
      from_port  = 1024
      to_port    = 65535
      cidr_block = "0.0.0.0/0"
    },
    {
      rule_no    = 200
      action     = "deny"
      protocol   = "-1"
      from_port  = 0
      to_port    = 0
      cidr_block = "0.0.0.0/0"
    }
  ]
}

variable "nacl_egress_rules" {
  description = "Egress rules for the network ACL"
  type = list(object({
    rule_no    = number
    action     = string
    protocol   = string
    from_port  = number
    to_port    = number
    cidr_block = string
  }))
  default = [
    {
      rule_no    = 100
      action     = "allow"
      protocol   = "tcp"
      from_port  = 443
      to_port    = 443
      cidr_block = "0.0.0.0/0"
    },
    {
      rule_no    = 110
      action     = "allow"
      protocol   = "tcp"
      from_port  = 1024
      to_port    = 65535
      cidr_block = "0.0.0.0/0"
    },
    {
      rule_no    = 200
      action     = "deny"
      protocol   = "-1"
      from_port  = 0
      to_port    = 0
      cidr_block = "0.0.0.0/0"
    }
  ]
}

resource "aws_network_acl" "main" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private[*].id

  dynamic "ingress" {
    for_each = var.nacl_ingress_rules

    content {
      rule_no    = ingress.value.rule_no
      action     = ingress.value.action
      protocol   = ingress.value.protocol
      from_port  = ingress.value.from_port
      to_port    = ingress.value.to_port
      cidr_block = ingress.value.cidr_block
    }
  }

  dynamic "egress" {
    for_each = var.nacl_egress_rules

    content {
      rule_no    = egress.value.rule_no
      action     = egress.value.action
      protocol   = egress.value.protocol
      from_port  = egress.value.from_port
      to_port    = egress.value.to_port
      cidr_block = egress.value.cidr_block
    }
  }

  tags = {
    Name        = "${terraform.workspace}-main-nacl"
    Environment = terraform.workspace
  }
}
```

## Building Rules from Multiple Sources

In real environments, rules come from different teams and sources. Merge them together:

```hcl
locals {
  # Security team's baseline rules
  security_baseline_ingress = [
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS - security baseline"
    }
  ]

  # Network team's internal access rules
  network_internal_ingress = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "icmp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "ICMP from internal - network team"
    },
    {
      from_port   = 161
      to_port     = 161
      protocol    = "udp"
      cidr_blocks = ["10.0.1.0/24"]
      description = "SNMP from monitoring subnet"
    }
  ]

  # Application team's service-specific rules
  app_service_ingress = [
    {
      from_port   = 8080
      to_port     = 8080
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "App service port"
    },
    {
      from_port   = 9090
      to_port     = 9090
      protocol    = "tcp"
      cidr_blocks = ["10.0.1.0/24"]
      description = "Metrics endpoint"
    }
  ]

  # Merge all sources
  all_ingress_rules = concat(
    local.security_baseline_ingress,
    local.network_internal_ingress,
    local.app_service_ingress,
    var.additional_ingress_rules  # Allow callers to add more
  )
}

variable "additional_ingress_rules" {
  description = "Additional ingress rules to merge"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}

resource "aws_security_group" "merged" {
  name   = "${terraform.workspace}-merged-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.all_ingress_rules

    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }
}
```

## Bi-Directional Rules

Some situations need matching ingress and egress rules. Generate both from a single source:

```hcl
variable "bidirectional_rules" {
  description = "Rules that need both ingress and egress"
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      port        = 5432
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "PostgreSQL"
    },
    {
      port        = 6379
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "Redis"
    }
  ]
}

resource "aws_security_group" "bidirectional" {
  name   = "${terraform.workspace}-bidirectional-sg"
  vpc_id = aws_vpc.main.id

  # Ingress rules from the shared data
  dynamic "ingress" {
    for_each = var.bidirectional_rules

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = "${ingress.value.description} inbound"
    }
  }

  # Matching egress rules from the same data
  dynamic "egress" {
    for_each = var.bidirectional_rules

    content {
      from_port   = egress.value.port
      to_port     = egress.value.port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = "${egress.value.description} outbound"
    }
  }

  # Always allow ephemeral port responses
  egress {
    from_port   = 1024
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Ephemeral ports"
  }
}
```

## Conditional Ingress Rules Based on Environment

Environment-specific rules are a common requirement:

```hcl
locals {
  # Debug ports only in non-production environments
  debug_rules = terraform.workspace != "prod" ? [
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "SSH for debugging"
    },
    {
      from_port   = 5005
      to_port     = 5005
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/8"]
      description = "Java debug port"
    }
  ] : []

  # Production gets stricter source restrictions
  web_sources = terraform.workspace == "prod" ? [
    "203.0.113.0/24",   # Office IP range
    "198.51.100.0/24"   # CDN IP range
  ] : ["0.0.0.0/0"]    # Dev and staging allow all

  web_rules = [
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = local.web_sources
      description = "HTTPS"
    }
  ]

  combined_rules = concat(local.web_rules, local.debug_rules)
}
```

## Using Separate Resources Instead of Inline Rules

For larger deployments, you might prefer `aws_security_group_rule` resources instead of inline rules. Dynamic blocks are not needed here - use `for_each` directly:

```hcl
variable "rules" {
  type = map(object({
    type        = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
}

resource "aws_security_group" "main" {
  name   = "${terraform.workspace}-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group_rule" "rules" {
  for_each = var.rules

  security_group_id = aws_security_group.main.id
  type              = each.value.type
  from_port         = each.value.from_port
  to_port           = each.value.to_port
  protocol          = each.value.protocol
  cidr_blocks       = each.value.cidr_blocks
  description       = each.value.description
}
```

This approach can be better for large rule sets because Terraform can add and remove individual rules without replacing the entire security group.

## Summary

Dynamic blocks bring order to ingress and egress rule management in Terraform. Whether you are working with security groups, network ACLs, or load balancer configurations, the pattern is the same: define your rules as structured data, then let dynamic blocks generate the nested configuration. This makes rules auditable, environment-specific, and easy to maintain. For more dynamic block patterns, see our posts on [security group rules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-security-group-rules/view) and [repeating nested blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-repeating-nested-blocks/view).
