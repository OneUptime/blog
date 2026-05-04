# How to Create an EC2 Instance with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, Infrastructure as Code, Compute

Description: Learn how to create and configure an AWS EC2 instance with OpenTofu, including AMI selection, security groups, key pairs, and user data.

## Introduction

EC2 instances are the foundational compute resource in AWS. This guide walks through creating a production-ready EC2 instance with OpenTofu, covering AMI selection, networking, security groups, SSH key pairs, and user data for bootstrapping.

## Data Source: Find the Latest Ubuntu AMI

```hcl
# Always look up the latest AMI rather than hardcoding an ID

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical's official AWS account

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
```

## Security Group

```hcl
resource "aws_security_group" "web" {
  name        = "web-server-sg"
  description = "Allow HTTP, HTTPS, and SSH inbound traffic"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-server-sg"
  }
}
```

## Key Pair

```hcl
# Generate an RSA key pair managed by OpenTofu
resource "tls_private_key" "web" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "web" {
  key_name   = "web-server-key"
  public_key = tls_private_key.web.public_key_openssh
}

# Save the private key locally (protect it carefully)
resource "local_sensitive_file" "web_private_key" {
  content         = tls_private_key.web.private_key_pem
  filename        = "${path.module}/web-key.pem"
  file_permission = "0400"
}
```

## EC2 Instance

```hcl
resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
  key_name               = aws_key_pair.web.key_name

  # Assign a public IP for direct SSH access
  associate_public_ip_address = true

  # Bootstrap the instance with Nginx
  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo "<h1>$(hostname) - deployed by OpenTofu</h1>" > /var/www/html/index.html
  EOF

  # Attach an EBS root volume with GP3 storage
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20     # GB
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name        = "web-server"
    Environment = var.environment
  }

  lifecycle {
    # When the instance is replaced (e.g. on AMI or user_data change),
    # create the new instance before destroying the old one.
    create_before_destroy = true
  }
}
```

## Outputs

```hcl
output "instance_id" {
  value       = aws_instance.web.id
  description = "The EC2 instance ID"
}

output "public_ip" {
  value       = aws_instance.web.public_ip
  description = "Public IP address of the web server"
}

output "public_dns" {
  value       = aws_instance.web.public_dns
  description = "Public DNS name of the web server"
}
```

## Variables

```hcl
variable "instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance type"

  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Instance type must be t3.micro, t3.small, or t3.medium."
  }
}

variable "environment" {
  type = string
}

variable "allowed_ssh_cidr" {
  type    = string
  default = "0.0.0.0/0"
}
```

## Conclusion

This configuration creates a production-ready EC2 instance with encrypted storage, dynamic AMI selection, and cloud-init bootstrapping. Extend it by attaching an Elastic IP, adding CloudWatch monitoring, or putting it behind an Application Load Balancer.
