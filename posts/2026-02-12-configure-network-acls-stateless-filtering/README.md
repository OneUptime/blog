# How to Configure Network ACLs for Stateless Filtering

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, Security

Description: A practical guide to configuring Network ACLs in AWS VPCs for stateless packet filtering, including rule ordering, ephemeral ports, and common configuration patterns.

---

Network ACLs (NACLs) are one of the two main firewall mechanisms in AWS VPCs, and they trip up a lot of people because they work differently from security groups. The key difference? NACLs are stateless. That means if you allow inbound traffic on port 80, the response traffic doesn't automatically get allowed - you need an explicit outbound rule too.

This catches people off guard because security groups are stateful. Once you internalize that NACLs evaluate every packet independently with zero memory of previous packets, everything else clicks into place.

## How NACL Rules Work

Each NACL has a numbered list of rules that get evaluated in order, starting from the lowest number. The first rule that matches wins - everything after it is ignored for that packet. Every NACL also has an implicit deny-all rule (rule number *) at the end that catches anything not matched by your explicit rules.

Here's the default NACL that comes with every VPC.

```
Rule #  Type         Protocol  Port Range  Source/Dest    Allow/Deny
100     All Traffic   All       All         0.0.0.0/0      ALLOW
*       All Traffic   All       All         0.0.0.0/0      DENY
```

The default NACL allows everything. Custom NACLs you create start with only the deny-all rule, so they block everything until you add allow rules.

## Creating a Custom NACL

Let's build a NACL that allows web traffic (HTTP/HTTPS) and SSH, which is a common pattern for a public-facing subnet.

```bash
# Create a new Network ACL in your VPC
aws ec2 create-network-acl \
  --vpc-id vpc-0abc123def456789 \
  --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=WebSubnet-NACL}]'
```

Now add inbound rules. Remember, you need to think about both the request traffic AND the response traffic since NACLs are stateless.

```bash
# Allow inbound HTTP (port 80)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 100 \
  --protocol tcp \
  --port-range From=80,To=80 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow \
  --ingress

# Allow inbound HTTPS (port 443)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 110 \
  --protocol tcp \
  --port-range From=443,To=443 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow \
  --ingress

# Allow inbound SSH (port 22) - restrict to your IP
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 120 \
  --protocol tcp \
  --port-range From=22,To=22 \
  --cidr-block 203.0.113.50/32 \
  --rule-action allow \
  --ingress

# Allow inbound ephemeral ports for return traffic from outbound connections
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 140 \
  --protocol tcp \
  --port-range From=1024,To=65535 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow \
  --ingress
```

That last rule is the one most people forget. When your instance makes an outbound connection (like downloading a package from the internet), the response comes back on an ephemeral port between 1024 and 65535. Without that rule, all your outbound connections would succeed on the outbound side but the responses would get dropped on the way back in.

## Outbound Rules

Now the outbound side. You need rules for the traffic your instances initiate AND for the responses to inbound connections.

```bash
# Allow outbound HTTP
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 100 \
  --protocol tcp \
  --port-range From=80,To=80 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow \
  --egress

# Allow outbound HTTPS
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 110 \
  --protocol tcp \
  --port-range From=443,To=443 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow \
  --egress

# Allow outbound ephemeral ports - responses to inbound HTTP/SSH/HTTPS
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 140 \
  --protocol tcp \
  --port-range From=1024,To=65535 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow \
  --egress
```

The outbound ephemeral port rule handles the responses to your inbound HTTP, HTTPS, and SSH connections. When a web server responds to a client, it sends the response from port 80 or 443 to the client's ephemeral port.

## Rule Numbering Strategy

I like to leave gaps between rule numbers so I can insert rules later without renumbering everything. A common convention:

- 100-199: Web traffic rules
- 200-299: Application-specific rules
- 300-399: Database traffic rules
- 400-499: Management traffic (SSH, RDP)
- 500-599: Explicit deny rules for specific IPs or ranges
- 32766: Catch-all rule (the implicit deny)

Leaving gaps of 10 between rules within each range gives you room to add rules between existing ones.

## Associating a NACL with a Subnet

A NACL doesn't do anything until it's associated with a subnet. Each subnet must be associated with exactly one NACL, and each NACL can be associated with multiple subnets.

```bash
# Associate the NACL with a subnet
aws ec2 replace-network-acl-association \
  --association-id aclassoc-0123456789abcdef0 \
  --network-acl-id acl-0123456789abcdef0
```

To find the current association ID, describe the NACL associations for your subnet.

```bash
# Find the current NACL association for a subnet
aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=subnet-0abc123" \
  --query 'NetworkAcls[].Associations[?SubnetId==`subnet-0abc123`].NetworkAclAssociationId' \
  --output text
```

## Using Deny Rules

One pattern that's unique to NACLs (security groups can't do this) is explicit deny rules. This lets you block specific IP addresses or ranges, which is useful for blocking known bad actors.

```bash
# Block a specific IP range - put this BEFORE your allow rules
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0123456789abcdef0 \
  --rule-number 50 \
  --protocol -1 \
  --cidr-block 198.51.100.0/24 \
  --rule-action deny \
  --ingress
```

Since rules are evaluated in order, a deny rule at number 50 will take effect before your allow rules at 100+. This is how you blacklist specific addresses while keeping the rest of your rules permissive.

## Terraform Configuration

If you're managing infrastructure as code (and you should be), here's the Terraform equivalent.

```hcl
# Create a Network ACL with rules for a web-facing subnet
resource "aws_network_acl" "web" {
  vpc_id = aws_vpc.main.id

  # Inbound HTTP
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Inbound HTTPS
  ingress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Inbound ephemeral ports for return traffic
  ingress {
    rule_no    = 140
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Outbound HTTP
  egress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Outbound HTTPS
  egress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Outbound ephemeral ports
  egress {
    rule_no    = 140
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  tags = {
    Name = "web-subnet-nacl"
  }
}

# Associate with subnet
resource "aws_network_acl_association" "web" {
  network_acl_id = aws_network_acl.web.id
  subnet_id      = aws_subnet.web.id
}
```

## Troubleshooting Tips

When traffic isn't flowing and you suspect the NACL, use VPC Flow Logs to confirm. Flow logs show you whether traffic was accepted or rejected, which helps narrow down whether it's the NACL or a security group causing the problem. Check out our guide on enabling flow logs at https://oneuptime.com/blog/post/2026-02-12-enable-and-analyze-vpc-flow-logs/view.

Common mistakes to watch for:

- Forgetting ephemeral port rules (both inbound and outbound)
- Using the wrong rule numbers, causing deny rules to not take effect before allow rules
- Not accounting for ICMP traffic if you need ping to work
- Applying NACLs to the wrong subnets

NACLs are a blunt instrument compared to security groups, but they're the right tool when you need subnet-level control or the ability to explicitly deny traffic. Use them as your first line of defense and layer security groups on top for instance-level precision.
