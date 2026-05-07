# How to Configure AWS Network ACLs for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, Network ACLs, VPC, Security, Stateless Firewall

Description: Configure AWS Network ACLs (NACLs) with IPv6 rules, understand stateless behavior requiring explicit inbound and outbound rules, and create dual-stack NACL policies.

## Introduction

AWS Network ACLs (NACLs) are subnet-level stateless firewalls that apply rules to all traffic entering or leaving a subnet. Unlike security groups which are stateful, NACLs require explicit rules for both inbound and outbound traffic, including return traffic. For IPv6, NACLs need separate entries with IPv6 CIDR blocks. The default NACL adds allow-all IPv6 rules only when the VPC has an associated IPv6 CIDR block, and if you've already modified the default NACL you might need to add IPv6 rules yourself.

## Understanding NACL Stateless Behavior

```text
Stateless means: Each packet evaluated independently.
For a web server:
  - Inbound rule: Allow TCP port 443 from ::/0 (client requests)
  - Outbound rule: Allow TCP ephemeral ports 1024-65535 to ::/0 (server responses)
  - Both rules required - no automatic return traffic allowed
```

## Add IPv6 Rules to NACL

```bash
NACL_ID="acl-12345678"

# Allow IPv6 HTTPS inbound (rule 100)

aws ec2 create-network-acl-entry \
    --network-acl-id "$NACL_ID" \
    --rule-number 100 \
    --protocol "6" \
    --port-range "From=443,To=443" \
    --ipv6-cidr-block "::/0" \
    --rule-action allow \
    --ingress

# Allow IPv6 HTTP inbound (rule 110)
aws ec2 create-network-acl-entry \
    --network-acl-id "$NACL_ID" \
    --rule-number 110 \
    --protocol "6" \
    --port-range "From=80,To=80" \
    --ipv6-cidr-block "::/0" \
    --rule-action allow \
    --ingress

# Allow IPv6 ephemeral ports outbound (return traffic)
aws ec2 create-network-acl-entry \
    --network-acl-id "$NACL_ID" \
    --rule-number 100 \
    --protocol "6" \
    --port-range "From=1024,To=65535" \
    --ipv6-cidr-block "::/0" \
    --rule-action allow \
    --egress

# Optionally allow all IPv6 outbound for instances to initiate connections
aws ec2 create-network-acl-entry \
    --network-acl-id "$NACL_ID" \
    --rule-number 200 \
    --protocol "-1" \
    --ipv6-cidr-block "::/0" \
    --rule-action allow \
    --egress
```

## Terraform NACL with Dual-Stack Rules

```hcl
# nacl.tf

resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  # ============ INBOUND RULES ============

  # Allow IPv4 HTTPS
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow IPv6 HTTPS
  ingress {
    rule_no         = 101
    protocol        = "tcp"
    action          = "allow"
    ipv6_cidr_block = "::/0"
    from_port       = 443
    to_port         = 443
  }

  # Allow IPv4 HTTP
  ingress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Allow IPv6 HTTP
  ingress {
    rule_no         = 111
    protocol        = "tcp"
    action          = "allow"
    ipv6_cidr_block = "::/0"
    from_port       = 80
    to_port         = 80
  }

  # Allow return traffic (ephemeral ports) IPv4
  ingress {
    rule_no    = 200
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow return traffic (ephemeral ports) IPv6
  ingress {
    rule_no         = 201
    protocol        = "tcp"
    action          = "allow"
    ipv6_cidr_block = "::/0"
    from_port       = 1024
    to_port         = 65535
  }

  # Allow all ICMPv6 inbound
  ingress {
    rule_no         = 300
    protocol        = "58"
    action          = "allow"
    ipv6_cidr_block = "::/0"
    from_port       = 0
    to_port         = 0
    icmp_type       = -1
    icmp_code       = -1
  }

  # ============ OUTBOUND RULES ============

  # Allow all IPv4 outbound
  egress {
    rule_no    = 100
    protocol   = "-1"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  # Allow all IPv6 outbound
  egress {
    rule_no         = 101
    protocol        = "-1"
    action          = "allow"
    ipv6_cidr_block = "::/0"
    from_port       = 0
    to_port         = 0
  }

  tags = { Name = "public-nacl" }
}
```

## Default NACL Behavior

```bash
# Default NACL allows all IPv4 traffic, and adds IPv6 allow rules
# after the VPC has an associated IPv6 CIDR block
# When you create a custom NACL, it DENIES ALL by default

# Check default NACL rules
aws ec2 describe-network-acls \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query "NetworkAcls[?IsDefault==\`true\`].Entries[*].{Rule:RuleNumber,Egress:Egress,Protocol:Protocol,IPv4:CidrBlock,IPv6:Ipv6CidrBlock,Action:RuleAction}"

# Default rules (each exists separately for ingress and egress):
# Rule 100: ALLOW all IPv4
# Rule 101: ALLOW all IPv6 (only if the VPC has an associated IPv6 CIDR block)
# Rule 32767: DENY all IPv4
# Rule 32768: DENY all IPv6
```

## Conclusion

AWS NACLs are stateless, requiring explicit rules for both inbound and outbound traffic including ephemeral return ports. For dual-stack subnets, any rule you want to apply to IPv6 traffic needs a corresponding IPv6 entry with `ipv6_cidr_block`. If your workload needs ICMPv6 control traffic, include the appropriate ICMPv6 rules; for internet-reachable workloads, allow ICMPv6 Packet Too Big messages so Path MTU Discovery can work. Rule ordering matters - NACLs process rules from lowest to highest number and stop at the first match. Use paired rule numbers (100 for IPv4, 101 for IPv6) to keep corresponding rules adjacent and easy to audit.
