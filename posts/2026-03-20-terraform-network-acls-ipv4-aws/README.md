# How to Create Network ACLs for IPv4 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, Network ACLs, NACLs, IPv4, Security, Infrastructure as Code

Description: Create AWS Network ACLs for IPv4 using Terraform to add stateless subnet-level filtering as a second layer of defense beyond security groups.

## Introduction

AWS Network ACLs (NACLs) provide stateless subnet-level IPv4 filtering. Unlike security groups (stateful, instance-level), NACLs require explicit rules for both inbound and outbound directions for each connection.

## Public Subnet NACL

```hcl
# network_acls.tf

resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Inbound rules
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  ingress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow ephemeral ports (return traffic for outbound)
  ingress {
    rule_no    = 120
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  ingress {
    rule_no    = 200
    protocol   = "-1"
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  # Outbound rules
  egress {
    rule_no    = 100
    protocol   = "-1"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = { Name = "public-nacl" }
}
```

## Private Subnet NACL

```hcl
resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private[*].id

  # Allow traffic from VPC only
  ingress {
    rule_no    = 100
    protocol   = "-1"
    action     = "allow"
    cidr_block = aws_vpc.main.cidr_block
    from_port  = 0
    to_port    = 0
  }

  # Allow return traffic from internet (ephemeral ports)
  ingress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  ingress {
    rule_no    = 200
    protocol   = "-1"
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    rule_no    = 100
    protocol   = "-1"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = { Name = "private-nacl" }
}
```

## Block Specific IPs with NACL

```hcl
# Add this inside aws_network_acl.public when using inline rules.
ingress {
  rule_no    = 10   # Lower number = higher priority
  protocol   = "-1"
  action     = "deny"
  cidr_block = "203.0.113.0/24"
  from_port  = 0
  to_port    = 0
}
```

## Conclusion

NACLs in Terraform require explicit inbound and outbound rules because they are stateless. Allow the appropriate ephemeral port range for return traffic in the direction the response enters the subnet; 1024-65535 is a broad practical range for mixed clients and AWS-managed services. Use lower rule numbers for explicit denies than for broad allows (for example, 10-90 when allow rules start at 100). NACLs complement security groups; they are best used to block known-bad CIDRs at the subnet level.
