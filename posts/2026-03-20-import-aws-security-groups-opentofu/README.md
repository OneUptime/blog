# How to Import AWS Security Groups into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, Security Group, Import, Networking

Description: Learn how to import existing AWS security groups and their rules into OpenTofu state, handling both inline rules and separate rule resources.

## Introduction

Security groups can be imported into OpenTofu as a single resource (with inline ingress/egress rules) or as separate rule resources. If you want to manage rules separately, current AWS provider best practice is to use `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources.

## Approach 1: Import as Single Resource with Inline Rules

```bash
# Get security group details and rules

SG_ID="sg-0123456789abcdef0"

aws ec2 describe-security-groups --group-ids "$SG_ID" \
  --query 'SecurityGroups[0]' --output json | jq '{
    group_name: .GroupName,
    description: .Description,
    vpc_id: .VpcId,
    ingress: [.IpPermissions[] | {
      from_port: .FromPort,
      to_port: .ToPort,
      protocol: .IpProtocol,
      cidr_blocks: [.IpRanges[].CidrIp],
      description: .IpRanges[0].Description
    }],
    egress: [.IpPermissionsEgress[] | {
      from_port: .FromPort,
      to_port: .ToPort,
      protocol: .IpProtocol,
      cidr_blocks: [.IpRanges[].CidrIp],
      description: .IpRanges[0].Description
    }]
  }'
```

```hcl
resource "aws_security_group" "app" {
  name        = "app-server-sg"
  description = "Security group for application servers"
  vpc_id      = "vpc-0123456789abcdef0"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "App port from internal network"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "app-server-sg", Environment = "prod" }
}

import {
  to = aws_security_group.app
  id = "sg-0123456789abcdef0"
}
```

## Approach 2: Import Separate Security Group Rule Resources

This approach is useful when rules are managed by different teams or configurations. For current AWS provider versions, prefer the dedicated ingress/egress rule resources over the older `aws_security_group_rule` resource:

```hcl
resource "aws_security_group" "app" {
  name        = "app-server-sg"
  description = "Security group for application servers"
  vpc_id      = "vpc-0123456789abcdef0"
  # No inline ingress/egress - managed as separate resources
  tags = { Name = "app-server-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "https_ingress" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
  description       = "HTTPS from internet"
}

resource "aws_vpc_security_group_egress_rule" "all_egress" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "All outbound"
}
```

Use `aws ec2 describe-security-group-rules --filters Name="group-id",Values="sg-0123456789abcdef0"` to look up the `sgr-...` rule IDs before importing.

```hcl
# Dedicated ingress/egress rule resources import by security group rule ID (`sgr-...`)
import {
  to = aws_security_group.app
  id = "sg-0123456789abcdef0"
}

import {
  to = aws_vpc_security_group_ingress_rule.https_ingress
  id = "sgr-0123456789abcdef0"
}

import {
  to = aws_vpc_security_group_egress_rule.all_egress
  id = "sgr-0fedcba9876543210"
}
```

## Handling Security Groups with Source SG References

```hcl
resource "aws_vpc_security_group_ingress_rule" "from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = "sg-0abc1234def567890"
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  description                  = "Traffic from ALB"
}

# Rules that reference another security group still import by security group rule ID
import {
  to = aws_vpc_security_group_ingress_rule.from_alb
  id = "sgr-0abc1234def567891"
}
```

## Conclusion

Choose the inline rules approach only if you want a single `aws_security_group` resource to manage the rules. Choose separate `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources when rules come from multiple sources. Note that you cannot mix inline rules in `aws_security_group` with separate rule resources - pick one approach per security group.
