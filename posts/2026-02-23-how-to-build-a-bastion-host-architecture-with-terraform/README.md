# How to Build a Bastion Host Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Bastion Host, Security, SSH, AWS, Infrastructure Patterns

Description: Learn how to build a secure bastion host architecture with Terraform including hardened EC2 instances, Session Manager alternatives, and audit logging.

---

A bastion host (sometimes called a jump box) is a hardened server that acts as the single entry point for SSH access to your private infrastructure. Instead of exposing every server to the internet, you funnel all administrative access through one tightly controlled machine.

While AWS Systems Manager Session Manager has reduced the need for traditional bastion hosts, many organizations still require them for compliance, legacy tooling, or specific network access patterns. In this guide, we will build both approaches with Terraform: a traditional bastion host and a modern Session Manager-based alternative.

## Traditional Bastion Host

Let us start with the classic approach: an EC2 instance in a public subnet with locked-down security groups.

### Security Group

The security group is the most important piece. Only allow SSH from known IP ranges:

```hcl
resource "aws_security_group" "bastion" {
  name_prefix = "${var.project_name}-bastion-"
  vpc_id      = var.vpc_id
  description = "Security group for bastion host"

  # SSH access only from corporate IP ranges
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
    description = "SSH from allowed networks"
  }

  # Allow all outbound traffic to reach private instances
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "${var.project_name}-bastion-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Security group for private instances that accept SSH from the bastion
resource "aws_security_group" "private_ssh" {
  name_prefix = "${var.project_name}-private-ssh-"
  vpc_id      = var.vpc_id
  description = "Allow SSH from bastion host"

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
    description     = "SSH from bastion host only"
  }

  tags = {
    Name = "${var.project_name}-private-ssh-sg"
  }
}
```

### EC2 Instance

Use a hardened AMI and keep the instance minimal:

```hcl
# Get the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM role for the bastion (needed for CloudWatch and SSM)
resource "aws_iam_role" "bastion" {
  name = "${var.project_name}-bastion-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "bastion_ssm" {
  role       = aws_iam_role.bastion.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "bastion" {
  name = "${var.project_name}-bastion-profile"
  role = aws_iam_role.bastion.name
}

# The bastion EC2 instance
resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.micro"
  key_name                    = var.ssh_key_name
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  iam_instance_profile        = aws_iam_instance_profile.bastion.name
  associate_public_ip_address = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required" # Require IMDSv2
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    # Harden the bastion host

    # Update system packages
    dnf update -y

    # Install fail2ban to block brute force attempts
    dnf install -y fail2ban
    systemctl enable fail2ban
    systemctl start fail2ban

    # Configure SSH hardening
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' /etc/ssh/sshd_config
    sed -i 's/#ClientAliveInterval 0/ClientAliveInterval 300/' /etc/ssh/sshd_config
    sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 2/' /etc/ssh/sshd_config

    # Restart SSH with new config
    systemctl restart sshd

    # Install CloudWatch agent for session logging
    dnf install -y amazon-cloudwatch-agent
  EOF

  tags = {
    Name = "${var.project_name}-bastion"
    Role = "bastion"
  }
}

# Elastic IP for a stable public address
resource "aws_eip" "bastion" {
  instance = aws_instance.bastion.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-bastion-eip"
  }
}
```

### Auto Scaling for High Availability

For production, run the bastion in an Auto Scaling group so it gets replaced automatically if it fails:

```hcl
resource "aws_launch_template" "bastion" {
  name_prefix   = "${var.project_name}-bastion-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = var.ssh_key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.bastion.name
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.bastion.id]
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  user_data = base64encode(file("${path.module}/bastion-userdata.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-bastion"
    }
  }
}

resource "aws_autoscaling_group" "bastion" {
  name                = "${var.project_name}-bastion-asg"
  vpc_zone_identifier = var.public_subnet_ids
  desired_capacity    = 1
  min_size            = 1
  max_size            = 1

  launch_template {
    id      = aws_launch_template.bastion.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-bastion"
    propagate_at_launch = true
  }
}
```

## Modern Alternative: Session Manager

AWS Systems Manager Session Manager provides shell access without SSH, without opening inbound ports, and with full audit logging built in:

```hcl
# Session Manager preferences for logging
resource "aws_ssm_document" "session_preferences" {
  name            = "SSM-SessionManagerRunShell"
  document_type   = "Session"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "1.0"
    description   = "Session Manager preferences"
    sessionType   = "Standard_Stream"
    inputs = {
      # Log sessions to S3
      s3BucketName        = aws_s3_bucket.session_logs.id
      s3KeyPrefix         = "session-logs"
      s3EncryptionEnabled = true

      # Log sessions to CloudWatch
      cloudWatchLogGroupName      = aws_cloudwatch_log_group.sessions.name
      cloudWatchEncryptionEnabled = true

      # Idle timeout
      idleSessionTimeout = "20"

      # Enable run-as support
      runAsEnabled = true
      runAsDefaultUser = "ec2-user"
    }
  })
}

resource "aws_cloudwatch_log_group" "sessions" {
  name              = "/aws/ssm/sessions"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.sessions.arn
}

resource "aws_s3_bucket" "session_logs" {
  bucket = "${var.project_name}-session-logs-${var.account_id}"
}
```

With Session Manager, your private instances do not need a public IP or an open SSH port. They just need the SSM agent (included in Amazon Linux by default) and an IAM role with the SSM managed policy.

## SSH Session Logging

For compliance, you want every command typed on the bastion recorded:

```hcl
# CloudWatch log group for SSH session recordings
resource "aws_cloudwatch_log_group" "bastion_sessions" {
  name              = "/bastion/sessions"
  retention_in_days = 365 # Keep for compliance
  kms_key_id        = aws_kms_key.bastion.arn

  tags = {
    Purpose = "audit"
  }
}
```

## DNS Record

Give the bastion a friendly DNS name:

```hcl
resource "aws_route53_record" "bastion" {
  zone_id = var.hosted_zone_id
  name    = "bastion.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.bastion.public_ip]
}
```

## Which Approach Should You Use?

If you are starting fresh, go with Session Manager. It is more secure, has built-in audit logging, and eliminates the need to manage SSH keys. If you have compliance requirements that mandate a traditional bastion, or if you need to support legacy tools that require direct SSH, use the EC2 bastion approach with the hardening steps we covered.

For broader security architecture, check out [building a VPN infrastructure with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-vpn-infrastructure-with-terraform/view) as an additional layer of access control.

## Wrapping Up

Whether you go with a traditional bastion host or AWS Session Manager, the goal is the same: provide a secure, audited entry point to your private infrastructure. Terraform lets you define this access layer as code, making it easy to replicate across environments and audit through code reviews. Always follow the principle of least privilege, log everything, and regularly rotate access credentials.
