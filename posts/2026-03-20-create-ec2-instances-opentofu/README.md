# How to Create EC2 Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, AWS, EC2, Terraform, IaC, DevOps

Description: Learn how to create and configure AWS EC2 instances with OpenTofu, including AMI lookup, security groups, user data, and instance profiles.

## Introduction

EC2 instances are the core compute resource in AWS. OpenTofu's `aws_instance` resource gives you full control over instance configuration: AMI, instance type, networking, storage, user data, and IAM instance profiles. This guide covers the most common patterns for creating production-ready EC2 instances.

## Minimal EC2 Instance

```hcl
# Look up the latest Ubuntu 22.04 AMI

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

## Full Production-Ready EC2 Instance

```hcl
resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.app.id]
  subnet_id              = aws_subnet.private.id
  iam_instance_profile   = aws_iam_instance_profile.app.name

  # Root volume
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    encrypted             = true
    delete_on_termination = true
  }

  # Additional data volume
  ebs_block_device {
    device_name           = "/dev/sdf"
    volume_type           = "gp3"
    volume_size           = 100
    encrypted             = true
    delete_on_termination = false
  }

  # Initialization script
  user_data_base64 = base64encode(templatefile("${path.module}/templates/user-data.sh.tpl", {
    environment = var.environment
    db_host     = var.db_host
  }))

  # Prevent accidental termination in production
  disable_api_termination = var.environment == "production"

  tags = {
    Name        = "${var.environment}-app-server"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [ami]  # Don't replace instance on AMI update
  }
}
```

## Security Group for EC2

```hcl
resource "aws_security_group" "app" {
  name        = "${var.environment}-app-sg"
  description = "Security group for app instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from load balancer"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "SSH from bastion"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.environment}-app-sg" }
}
```

## IAM Instance Profile

```hcl
resource "aws_iam_role" "app" {
  name = "${var.environment}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.environment}-app-profile"
  role = aws_iam_role.app.name
}
```

## Auto Scaling Group (Multiple Instances)

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "${var.environment}-app-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(file("${path.module}/templates/user-data.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.environment}-app"
      Environment = var.environment
    }
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "${var.environment}-app-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]

  desired_capacity = var.desired_capacity
  min_size         = var.min_size
  max_size         = var.max_size

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

## Outputs

```hcl
output "instance_id"  { value = aws_instance.app.id }
output "private_ip"   { value = aws_instance.app.private_ip }
output "public_ip"    { value = aws_instance.app.public_ip }
output "instance_arn" { value = aws_instance.app.arn }
```

## Conclusion

Creating production EC2 instances with OpenTofu requires combining multiple resources: the instance itself, a security group, IAM role and instance profile, and optional storage configuration. Use `data.aws_ami` to look up the latest AMI rather than hardcoding AMI IDs. For scalable applications, use Launch Templates with Auto Scaling Groups instead of individual instances. Always encrypt EBS volumes and use IAM roles (with SSM access) instead of SSH keys where possible.
