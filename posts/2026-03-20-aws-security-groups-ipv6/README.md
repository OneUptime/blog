# How to Configure AWS Security Groups for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, Security Group, VPC, Firewall, Cloud Security

Description: Add IPv6 rules to AWS security groups, understand that IPv4 and IPv6 rules are independent, and create security groups that properly allow IPv6 traffic alongside IPv4.

## Introduction

AWS security groups have separate rules for IPv4 (`cidr_blocks`) and IPv6 (`ipv6_cidr_blocks`). Adding a rule for `0.0.0.0/0` does NOT automatically allow IPv6 - you must add a separate rule for `::/0` or specific IPv6 CIDR blocks. This is a common source of IPv6 connectivity failures in AWS.

## Add IPv6 Rules via AWS CLI

```bash
SECURITY_GROUP_ID="sg-12345678"

# Allow HTTP from all IPv6 (inbound)

aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --ip-permissions '[{
        "IpProtocol": "tcp",
        "FromPort": 80,
        "ToPort": 80,
        "Ipv6Ranges": [{"CidrIpv6": "::/0", "Description": "HTTP from anywhere IPv6"}]
    }]'

# Allow HTTPS from all IPv6
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --ip-permissions '[{
        "IpProtocol": "tcp",
        "FromPort": 443,
        "ToPort": 443,
        "Ipv6Ranges": [{"CidrIpv6": "::/0", "Description": "HTTPS from anywhere IPv6"}]
    }]'

# Allow SSH from specific IPv6 prefix
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --ip-permissions '[{
        "IpProtocol": "tcp",
        "FromPort": 22,
        "ToPort": 22,
        "Ipv6Ranges": [{"CidrIpv6": "2001:db8::/32", "Description": "SSH from office IPv6"}]
    }]'

# Allow all IPv6 outbound
aws ec2 authorize-security-group-egress \
    --group-id "$SECURITY_GROUP_ID" \
    --ip-permissions '[{
        "IpProtocol": "-1",
        "Ipv6Ranges": [{"CidrIpv6": "::/0", "Description": "All IPv6 outbound"}]
    }]'
```

## Terraform Security Group with Dual-Stack Rules

```hcl
# security_groups.tf

resource "aws_security_group" "web" {
  vpc_id      = aws_vpc.main.id
  name        = "web-dual-stack"
  description = "Web server security group with IPv4 and IPv6"

  # HTTP - allow from both IPv4 and IPv6
  ingress {
    description      = "HTTP from anywhere"
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # HTTPS - allow from both
  ingress {
    description      = "HTTPS from anywhere"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # SSH - IPv4 from specific CIDR, IPv6 from specific prefix
  ingress {
    description = "SSH from admin IPv4"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["192.168.1.0/24"]
  }

  ingress {
    description      = "SSH from admin IPv6"
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    ipv6_cidr_blocks = ["2001:db8:1234::/48"]
  }

  # ICMPv6 - useful for ping6 testing
  ingress {
    description      = "ICMPv6 for ping6 testing"
    from_port        = -1
    to_port          = -1
    protocol         = "58"  # ICMPv6
    ipv6_cidr_blocks = ["::/0"]
  }

  # All outbound (IPv4 + IPv6)
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = { Name = "web-dual-stack-sg" }
}
```

## Common Mistakes with IPv6 Security Groups

```bash
# MISTAKE 1: Only adding IPv4 rule, expecting it to cover IPv6
# This allows IPv4 HTTP but NOT IPv6 HTTP:
aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp --port 80 --cidr "0.0.0.0/0"
# IPv6 clients CANNOT reach this instance on port 80!

# FIX: Must add separate IPv6 rule:
aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --ip-permissions '[{"IpProtocol":"tcp","FromPort":80,"ToPort":80,"Ipv6Ranges":[{"CidrIpv6":"::/0"}]}]'

# MISTAKE 2: Forgetting ICMPv6 for ping6 testing
# Add ICMPv6 to allow ping6 to reach instances
aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --ip-permissions '[{"IpProtocol":"58","FromPort":-1,"ToPort":-1,"Ipv6Ranges":[{"CidrIpv6":"::/0"}]}]'
```

## View IPv6 Rules in a Security Group

```bash
# List all IPv6 ingress rules
aws ec2 describe-security-groups \
    --group-ids sg-12345678 \
    --query 'SecurityGroups[0].IpPermissions[?length(Ipv6Ranges) > `0`].{Protocol:IpProtocol, FromPort:FromPort, ToPort:ToPort, IPv6:Ipv6Ranges[*].CidrIpv6}'
```

## Conclusion

AWS security groups treat IPv4 and IPv6 as completely independent protocols - adding `0.0.0.0/0` rules does not enable IPv6. Every service that should be reachable over IPv6 needs explicit IPv6 rules with `ipv6_cidr_blocks` in Terraform or `Ipv6Ranges` in the AWS CLI. The most common mistake is enabling a web service on IPv6 at the routing level but forgetting to add `::/0` rules to the security group. Also add ICMPv6 (`protocol = "58"`) rules to enable `ping6` for connectivity testing.
