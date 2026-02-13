# How to Use Security Groups for Stateful Filtering

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Security, Networking

Description: Learn how to configure AWS security groups for stateful traffic filtering, including best practices for inbound and outbound rules, security group chaining, and common patterns.

---

Security groups are the most commonly used firewall mechanism in AWS. They act as virtual firewalls for your EC2 instances, RDS databases, Lambda functions running in a VPC, and pretty much every other resource that has a network interface. The big thing that makes them easier to work with than Network ACLs is that they're stateful - if you allow inbound traffic on a port, the response traffic is automatically allowed without any additional rules.

That single characteristic eliminates an entire category of mistakes. You don't need to think about ephemeral ports or worry about return traffic. Allow inbound on port 443, and responses go out automatically.

## Security Group Basics

Every security group starts with zero inbound rules (deny all inbound) and an allow-all outbound rule. This default configuration means your instances can reach the internet but nothing can reach them until you open specific ports.

A few things to keep in mind:
- Security groups are associated with network interfaces, not subnets
- You can assign up to 5 security groups to a single network interface
- Rules are always allow rules - you can't create deny rules in a security group
- All rules are evaluated before making a decision (there's no rule ordering)

## Creating a Security Group

Here's how to create a security group for a web server that needs HTTP, HTTPS, and SSH access.

```bash
# Create a security group in your VPC
aws ec2 create-security-group \
  --group-name web-server-sg \
  --description "Security group for web servers" \
  --vpc-id vpc-0abc123def456789

# Allow inbound HTTP from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow inbound HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow SSH only from a specific IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.50/32
```

Notice you don't need any outbound rules for the responses to this inbound traffic. That's the stateful part doing its job.

## Security Group References - The Killer Feature

The most powerful feature of security groups isn't the stateful filtering - it's the ability to reference other security groups in your rules. Instead of specifying IP ranges, you can say "allow traffic from any instance that belongs to security group X."

This is incredibly useful for multi-tier architectures. Here's a typical setup.

```bash
# Create a security group for the application tier
aws ec2 create-security-group \
  --group-name app-tier-sg \
  --description "Security group for application servers" \
  --vpc-id vpc-0abc123def456789

# Create a security group for the database tier
aws ec2 create-security-group \
  --group-name db-tier-sg \
  --description "Security group for database servers" \
  --vpc-id vpc-0abc123def456789

# Allow the app tier to connect to the database on port 5432
aws ec2 authorize-security-group-ingress \
  --group-id sg-db-tier-id \
  --protocol tcp \
  --port 5432 \
  --source-group sg-app-tier-id

# Allow the web tier to connect to the app tier on port 8080
aws ec2 authorize-security-group-ingress \
  --group-id sg-app-tier-id \
  --protocol tcp \
  --port 8080 \
  --source-group sg-web-server-id
```

The beauty of this approach is that when you add or remove instances from a tier, you don't need to update any firewall rules. As long as the instance has the right security group, it automatically gets the right network access.

## Terraform Configuration

In practice, most teams manage security groups with Terraform. Here's the same three-tier setup.

```hcl
# Web tier security group
resource "aws_security_group" "web" {
  name        = "web-tier-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-tier-sg"
  }
}

# App tier security group - only accepts from web tier
resource "aws_security_group" "app" {
  name        = "app-tier-sg"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "App port from web tier"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "app-tier-sg"
  }
}

# Database tier security group - only accepts from app tier
resource "aws_security_group" "db" {
  name        = "db-tier-sg"
  description = "Security group for databases"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app tier"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "db-tier-sg"
  }
}
```

## Self-Referencing Security Groups

Sometimes instances within the same tier need to talk to each other - for example, nodes in a cluster. You can create a self-referencing rule.

```bash
# Allow instances in the same security group to communicate on all ports
aws ec2 authorize-security-group-ingress \
  --group-id sg-cluster-id \
  --protocol -1 \
  --source-group sg-cluster-id
```

This is common for Elasticsearch clusters, Kafka brokers, or any other distributed system where nodes need to discover and communicate with each other.

## Restricting Outbound Traffic

Most people leave the default allow-all outbound rule in place, but tightening outbound rules is a solid security practice, especially for sensitive workloads.

```bash
# Remove the default allow-all outbound rule
aws ec2 revoke-security-group-egress \
  --group-id sg-0123456789abcdef0 \
  --protocol -1 \
  --cidr 0.0.0.0/0

# Only allow outbound HTTPS (for API calls and package updates)
aws ec2 authorize-security-group-egress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow outbound to the database security group
aws ec2 authorize-security-group-egress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-db-tier-id
```

Restricted outbound rules help limit the blast radius if an instance gets compromised. An attacker won't be able to easily exfiltrate data or establish C2 channels on unexpected ports.

## Limits and Workarounds

Security groups have limits you should be aware of:
- 60 inbound and 60 outbound rules per security group (can be increased)
- 5 security groups per network interface (can be increased to 16)
- You can't create deny rules
- Rules only support allow - for explicit deny, you need Network ACLs

If you hit the rule limit, the best approach is to use prefix lists for grouping CIDR ranges.

```bash
# Create a prefix list to group multiple CIDR ranges
aws ec2 create-managed-prefix-list \
  --prefix-list-name "trusted-networks" \
  --max-entries 20 \
  --address-family IPv4 \
  --entries "Cidr=10.0.0.0/8,Description=Internal" "Cidr=172.16.0.0/12,Description=VPN"

# Use the prefix list in a security group rule
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --ip-permissions "IpProtocol=tcp,FromPort=443,ToPort=443,PrefixListIds=[{PrefixListId=pl-0123456789abcdef0}]"
```

## Monitoring Security Group Changes

Any change to a security group is a potential security event. Use CloudTrail to track changes and set up alerts for modifications. For a comparison of how security groups differ from NACLs, see https://oneuptime.com/blog/post/2026-02-12-security-groups-vs-network-acls/view.

Security groups are your bread and butter for AWS network security. Use security group references over CIDR blocks whenever possible, keep rules minimal, and layer them with NACLs for defense in depth. And don't forget to monitor for unauthorized changes - a single overly permissive rule can undo all your careful planning.
