# How to Configure AWS Security Groups for IPv6 with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Terraform, IPv6, Security Group, Networking, Firewall

Description: A guide to writing AWS Security Group rules that cover IPv6 traffic in Terraform, including common dual-stack patterns.

AWS Security Groups control traffic at the instance level. IPv4 and IPv6 rules are specified separately - an IPv4 CIDR rule does not automatically apply to IPv6. This means dual-stack security groups must explicitly include equivalent IPv4 and IPv6 rules.

## Key Difference: IPv4 vs IPv6 Rules

In Terraform's `aws_security_group` and `aws_security_group_rule` resources:
- `cidr_blocks` - list of IPv4 CIDR ranges
- `ipv6_cidr_blocks` - list of IPv6 CIDR ranges
- Add both IPv4 and IPv6 rules for dual-stack coverage

## Step 1: Create a Dual-Stack Web Security Group

```hcl
# sg-web.tf - Security group allowing HTTP/HTTPS from both IPv4 and IPv6

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow HTTP and HTTPS from internet (IPv4 and IPv6)"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "web-sg"
  }
}

resource "aws_security_group_rule" "http_ipv4" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "HTTP from IPv4 internet"
}

resource "aws_security_group_rule" "http_ipv6" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 80
  to_port           = 80
  ipv6_cidr_blocks  = ["::/0"]
  description       = "HTTP from IPv6 internet"
}

resource "aws_security_group_rule" "https_ipv4" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "HTTPS from IPv4 internet"
}

resource "aws_security_group_rule" "https_ipv6" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  ipv6_cidr_blocks  = ["::/0"]
  description       = "HTTPS from IPv6 internet"
}

resource "aws_security_group_rule" "egress_all_ipv4" {
  security_group_id = aws_security_group.web.id
  type              = "egress"
  protocol          = "-1"
  from_port         = 0
  to_port           = 0
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "All outbound IPv4"
}

resource "aws_security_group_rule" "egress_all_ipv6" {
  security_group_id = aws_security_group.web.id
  type              = "egress"
  protocol          = "-1"
  from_port         = 0
  to_port           = 0
  ipv6_cidr_blocks  = ["::/0"]
  description       = "All outbound IPv6"
}
```

## Step 2: Allow ICMPv6 for Diagnostics and PMTUD

ICMPv6 is used for core IPv6 functions such as Path MTU Discovery. If you want to allow `ping6` and avoid blocking ICMPv6 control traffic, add an explicit IPv6 ICMP rule:

```hcl
# sg-icmpv6.tf - Allow ICMPv6
resource "aws_security_group_rule" "allow_icmpv6_ingress" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  protocol          = "icmpv6"
  from_port         = -1
  to_port           = -1
  ipv6_cidr_blocks  = ["::/0"]
  description       = "Allow ICMPv6 for ping6 and PMTUD"
}
```

## Step 3: Restrict SSH to a Specific IPv6 Prefix

```hcl
# sg-ssh.tf - Allow SSH from a specific IPv6 management prefix
resource "aws_security_group_rule" "ssh_ipv6" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 22
  to_port           = 22
  # Replace with your management IPv6 prefix
  ipv6_cidr_blocks  = ["2001:db8:1234::/48"]
  description       = "SSH from management IPv6 prefix"
}
```

## Step 4: Use Variables for Reusable Rules

```hcl
# variables.tf
variable "allowed_ipv6_cidrs" {
  type        = list(string)
  description = "IPv6 CIDR blocks allowed to access the application"
  default     = ["::/0"]
}

# Use the variable in a security group rule
resource "aws_security_group_rule" "app_ipv6" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 8080
  to_port           = 8080
  ipv6_cidr_blocks  = var.allowed_ipv6_cidrs
  description       = "App port from allowed IPv6 ranges"
}
```

## Step 5: Apply and Verify

```hcl
# outputs.tf
output "web_sg_id" {
  value = aws_security_group.web.id
}
```

```bash
terraform apply

# Confirm IPv6 rules are present in the security group
aws ec2 describe-security-groups \
  --group-ids "$(terraform output -raw web_sg_id)" \
  --query 'SecurityGroups[0].{Ingress:IpPermissions[*].Ipv6Ranges,Egress:IpPermissionsEgress[*].Ipv6Ranges}'
```

Always pair every IPv4 rule with an equivalent IPv6 rule in dual-stack deployments - missing IPv6 rules are the most common cause of asymmetric connectivity in AWS dual-stack architectures.
