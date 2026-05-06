# How to Deploy a Bastion Host with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Bastion Host, AWS, Security, SSH, Infrastructure as Code

Description: Learn how to deploy a secure bastion host with OpenTofu - configuring a hardened EC2 instance, restrictive security groups, Session Manager as a bastion alternative, and audit logging for all...

## Introduction

A bastion host (jump server) provides controlled SSH access to private EC2 instances without exposing them to the internet. OpenTofu manages the bastion instance, security group rules that restrict SSH access to specific CIDRs, CloudWatch logging, and optionally AWS Systems Manager Session Manager as a no-SSH alternative.

## Bastion Security Group

```hcl
# Security group for bastion - allow SSH from trusted CIDRs and only required egress

resource "aws_security_group" "bastion" {
  name        = "${var.environment}-bastion-sg"
  description = "Security group for bastion host - restricted SSH access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from allowed CIDRs"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs  # e.g., ["203.0.113.0/24"]
  }

  egress {
    description = "SSH to private instances in the VPC"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    description = "HTTPS for package installs and AWS APIs"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-bastion-sg"
    Environment = var.environment
  }
}

# Allow bastion to SSH into private instances
resource "aws_security_group_rule" "private_ssh_from_bastion" {
  type                     = "ingress"
  from_port                = 22
  to_port                  = 22
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.bastion.id
  security_group_id        = aws_security_group.private_instances.id
  description              = "SSH from bastion host"
}
```

## Bastion EC2 Instance

```hcl
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public[0].id  # Must be in public subnet

  vpc_security_group_ids      = [aws_security_group.bastion.id]
  associate_public_ip_address = true
  key_name                    = aws_key_pair.bastion.key_name
  iam_instance_profile        = aws_iam_instance_profile.bastion.name

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    # Harden SSH configuration
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    echo "AllowTcpForwarding yes" >> /etc/ssh/sshd_config
    echo "X11Forwarding no" >> /etc/ssh/sshd_config
    echo "MaxAuthTries 3" >> /etc/ssh/sshd_config
    systemctl restart sshd

    # Install CloudWatch agent for connection logging
    yum install -y amazon-cloudwatch-agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config -m ec2 -c ssm:AmazonCloudWatch-${var.environment} -s
  EOF

  tags = {
    Name        = "${var.environment}-bastion"
    Environment = var.environment
    Purpose     = "bastion"
  }
}

# Elastic IP for consistent bastion address
resource "aws_eip" "bastion" {
  instance = aws_instance.bastion.id
  domain   = "vpc"

  tags = { Name = "${var.environment}-bastion-eip" }
}
```

## IAM Role for Session Manager (No-SSH Alternative)

```hcl
resource "aws_iam_role" "bastion" {
  name = "${var.environment}-bastion-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Session Manager - replaces SSH bastion entirely
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.bastion.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Required for the CloudWatch agent to publish logs and read its SSM-stored config
resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.bastion.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Allows Session Manager sessions on private instances
resource "aws_iam_role_policy_attachment" "ssm_private" {
  role       = aws_iam_role.private_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "bastion" {
  name = "${var.environment}-bastion-profile"
  role = aws_iam_role.bastion.name
}
```

## Session Manager VPC Endpoints (for Private Instances)

```hcl
# Allows Systems Manager traffic to reach private instances without internet
resource "aws_vpc_endpoint" "ssm" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ssm_messages" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true
}

# In AWS Regions launched before 2024, older SSM Agent setups may also use ec2messages.
# Current SSM Agent prefers ssmmessages, and Regions launched in 2024 or later support only ssmmessages.
```

## Outputs

```hcl
output "bastion_public_ip" {
  value       = aws_eip.bastion.public_ip
  description = "Bastion host public IP - add to SSH config as ProxyJump"
}

output "bastion_ssh_command" {
  value       = "ssh -J ec2-user@${aws_eip.bastion.public_ip} ec2-user@<private-ip>"
  description = "SSH ProxyJump command to reach private instances"
}
```

## Conclusion

Bastion hosts with OpenTofu restrict private instance SSH access to a single hardened entry point. For higher security, replace the SSH bastion with AWS Systems Manager Session Manager - no inbound ports required, Session Manager API activity logged to CloudTrail, and shell session data sent to CloudWatch Logs or Amazon S3 when session logging is enabled, with no key management. Use VPC endpoints for Session Manager to keep Systems Manager traffic within the VPC. The `ProxyJump` SSH pattern (`ssh -J bastion private-instance`) avoids copying private keys to the bastion host.
