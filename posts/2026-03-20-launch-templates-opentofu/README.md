# How to Use EC2 Launch Templates with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, EC2, Launch Templates, AWS, Infrastructure as Code, Compute

Description: Learn how to manage EC2 Launch Templates with OpenTofu - configuring AMI, instance type, network settings, EBS volumes, IAM profiles, and user data with versioning support.

## Introduction

EC2 Launch Templates define reusable instance configuration that can be versioned, referenced by Auto Scaling Groups, and used to launch individual instances. OpenTofu manages launch templates with full configuration control and automatic versioning on changes.

## Basic Launch Template

```hcl
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

resource "aws_launch_template" "app" {
  name        = "${var.environment}-app-lt"
  description = "Launch template for ${var.environment} application servers"

  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  # Key pair for SSH access
  key_name = aws_key_pair.app.key_name

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    arn = aws_iam_instance_profile.app.arn
  }

  tags = { Environment = var.environment }
}
```

## EBS Volume Configuration

```hcl
resource "aws_launch_template" "app" {
  name          = "${var.environment}-app-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  # Root volume
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      encrypted             = true
      kms_key_id            = aws_kms_key.ebs.arn
      delete_on_termination = true
    }
  }

  # Additional data volume
  block_device_mappings {
    device_name = "/dev/xvdb"
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      encrypted             = true
      kms_key_id            = aws_kms_key.ebs.arn
      delete_on_termination = true
    }
  }

}
```

## Metadata Options and User Data

```hcl
resource "aws_launch_template" "app" {
  name          = "${var.environment}-app-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  # IMDSv2 required - prevents SSRF-based metadata theft
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  # User data via templatefile for dynamic configuration
  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    environment    = var.environment
    region         = var.region
    log_group_name = aws_cloudwatch_log_group.app.name
    ssm_prefix     = "/${var.environment}/app"
  }))

  # Monitoring
  monitoring {
    enabled = true  # Detailed CloudWatch monitoring (1-minute intervals)
  }

  # Explicitly disable instance hibernation
  hibernation_options {
    configured = false
  }
}
```

## Network Interface Configuration

```hcl
resource "aws_launch_template" "app" {
  name          = "${var.environment}-app-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # Note: can't specify security groups in both
  # vpc_security_group_ids and network_interfaces.security_groups
  network_interfaces {
    associate_public_ip_address = false
    delete_on_termination       = true
    security_groups             = [aws_security_group.app.id]
    # subnet_id not set here - ASG/launch supplies the subnet
  }

  placement {
    tenancy = "default"
    # Use spread placement group for high availability
    group_name = aws_placement_group.app.name
  }

  credit_specification {
    cpu_credits = "unlimited"  # For T-series burstable instances
  }
}
```

## Launch Template Versioning

```hcl
resource "aws_launch_template" "app" {
  name                   = "${var.environment}-app-lt"
  image_id               = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  update_default_version = true
}

# Have the ASG use the concrete version created by this apply

resource "aws_autoscaling_group" "app" {
  name = "${var.environment}-app-asg"

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version  # Avoid runtime drift from "$Latest" or "$Default"
  }

  # ... other ASG config
}

# Output the latest version number
output "launch_template_version" {
  value = aws_launch_template.app.latest_version
}
```

## Tag Specifications

```hcl
resource "aws_launch_template" "app" {
  name          = "${var.environment}-app-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.environment}-app"
      Environment = var.environment
      ManagedBy   = "opentofu"
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name        = "${var.environment}-app-volume"
      Environment = var.environment
    }
  }

  tag_specifications {
    resource_type = "network-interface"
    tags = {
      Environment = var.environment
    }
  }
}
```

## Conclusion

EC2 Launch Templates with OpenTofu provide versioned, reusable instance configuration. Use `metadata_options` with `http_tokens = "required"` to enforce IMDSv2 on all instances. Launch template updates create new template versions automatically, and `update_default_version = true` promotes the newest version to the template default. Reference `aws_launch_template.app.latest_version` in your ASG when you want OpenTofu to pass a concrete version number instead of deferring resolution to `$Latest` or `$Default` at instance launch time.
