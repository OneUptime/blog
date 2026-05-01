# How to Set Up EC2 Instance Connect with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, Instance Connect, SSH, Security, Infrastructure as Code

Description: Learn how to configure EC2 Instance Connect for browser-based and CLI SSH access to EC2 instances without managing SSH keys using OpenTofu.

## Introduction

EC2 Instance Connect provides a secure way to connect to instances using short-lived SSH keys that are pushed to the instance by AWS. This eliminates the need to manage long-lived SSH key pairs and integrates with IAM for access control. Connections are logged in CloudTrail.

## Prerequisites

- OpenTofu v1.6+
- AWS CLI v2 installed locally
- AWS credentials with EC2 permissions
- EC2 Instance Connect pre-installed on the AMI (included in AL2023, current Amazon Linux 2 AMIs, and Ubuntu 20.04+)

## Step 1: Configure IAM Policy for Instance Connect

```hcl
# IAM policy granting permission to use Instance Connect

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "instance_connect" {
  statement {
    sid    = "AllowInstanceConnect"
    effect = "Allow"
    actions = [
      "ec2-instance-connect:SendSSHPublicKey"
    ]
    resources = [
      "arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:instance/*"
    ]
    condition {
      test     = "StringEquals"
      variable = "ec2:osuser"
      values   = ["ec2-user"]  # OS username to connect as
    }
  }

  statement {
    sid    = "AllowOpenTunnel"
    effect = "Allow"
    actions = [
      "ec2-instance-connect:OpenTunnel"
    ]
    resources = [
      aws_ec2_instance_connect_endpoint.private.arn
    ]
    condition {
      test     = "NumericEquals"
      variable = "ec2-instance-connect:remotePort"
      values   = ["22"]
    }
  }

  statement {
    sid    = "AllowDescribeInstances"
    effect = "Allow"
    actions = [
      "ec2:DescribeInstances"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "instance_connect" {
  name        = "EC2InstanceConnectPolicy"
  description = "Allow EC2 Instance Connect access"
  policy      = data.aws_iam_policy_document.instance_connect.json
}
```

Attach this policy to the IAM user or role that will initiate the SSH connection.

## Step 2: Create an Instance Connect Endpoint

```hcl
# EC2 Instance Connect Endpoint allows connecting to private instances
# without requiring public IPs or a bastion host
resource "aws_ec2_instance_connect_endpoint" "private" {
  subnet_id          = var.private_subnet_id
  ip_address_type    = "ipv4"
  security_group_ids = [aws_security_group.instance_connect.id]

  # Preserve client IP for connection tracking
  preserve_client_ip = true

  tags = {
    Name        = "private-instance-connect-endpoint"
    Environment = var.environment
  }
}
```

## Step 3: Security Group for the Endpoint

```hcl
resource "aws_security_group" "instance_connect" {
  name        = "instance-connect-endpoint-sg"
  description = "Security group for EC2 Instance Connect Endpoint"
  vpc_id      = var.vpc_id

  egress {
    description = "Allow SSH to instances in the VPC"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = { Name = "instance-connect-sg" }
}

# Security group on the instances allowing SSH from the endpoint
resource "aws_security_group" "instance" {
  name        = "instance-ssh-sg"
  description = "Allow SSH from Instance Connect Endpoint"
  vpc_id      = var.vpc_id

  ingress {
    description     = "SSH from Instance Connect Endpoint"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.instance_connect.id]
  }
}
```

## Step 4: Launch an Instance Without a Key Pair

```hcl
# Instance Connect works without a traditional key pair
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "no_keypair" {
  ami             = data.aws_ami.amazon_linux.id
  instance_type   = "t3.micro"
  subnet_id       = var.private_subnet_id

  # No key_name needed - Instance Connect handles authentication
  vpc_security_group_ids = [aws_security_group.instance.id]

  tags = {
    Name = "no-keypair-instance"
  }
}
```

## Step 5: Connect via AWS CLI

```bash
# Connect to a private instance using the Instance Connect Endpoint
aws ec2-instance-connect ssh \
  --instance-id i-0123456789abcdef0 \
  --os-user ec2-user \
  --connection-type eice \
  --region us-east-1
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EC2 Instance Connect Endpoint provides a managed, auditable alternative to bastion hosts for accessing private EC2 instances. All connection attempts are logged in CloudTrail, and temporary SSH keys expire after 60 seconds. Combine with IAM conditions to restrict access by instance tag, user, or time of day for fine-grained access control.
