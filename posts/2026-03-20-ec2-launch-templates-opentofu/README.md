# How to Use EC2 Launch Templates with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, Launch Templates, Auto Scaling, Infrastructure as Code, Compute

Description: Learn how to create and manage EC2 Launch Templates with OpenTofu to define reusable instance configurations for Auto Scaling Groups, Spot Fleets, and direct EC2 launches.

## Introduction

EC2 Launch Templates provide a reusable, versioned configuration for launching EC2 instances. AWS recommends them over the older Launch Configurations, and they support more features including multiple network interfaces, mixed instance types, and partial overrides. This guide covers creating launch templates with OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 permissions

## Step 1: Create a Launch Template

```hcl
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# Full-featured launch template with all common configuration

resource "aws_launch_template" "app" {
  name        = "app-launch-template"
  description = "Launch template for application servers"

  # Use the latest Amazon Linux AMI
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  key_name      = var.key_pair_name

  # Enable detailed CloudWatch monitoring
  monitoring {
    enabled = true
  }

  # Enforce IMDSv2 for enhanced metadata security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2
    http_put_response_hop_limit = 1
  }

  # Encrypted root volume
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  # IAM instance profile
  iam_instance_profile {
    name = var.instance_profile_name
  }

  # Network interface configuration
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [var.security_group_id]
    delete_on_termination       = true
  }

  # User data script executed at first boot
  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    environment = var.environment
    app_version = var.app_version
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "app-server"
      Environment = var.environment
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name        = "app-server-volume"
      Environment = var.environment
    }
  }

  tags = {
    Name = "app-launch-template"
  }

}
```

## Step 2: Create a New Version of the Template

```hcl
# Launch templates are versioned; update the existing resource and apply again
# to create a new version with an updated instance type
resource "aws_launch_template" "app" {
  name        = "app-launch-template"
  description = "Launch template for application servers"

  # Use the latest Amazon Linux AMI
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.large"  # Upgraded instance type

  key_name      = var.key_pair_name

  monitoring {
    enabled = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  iam_instance_profile {
    name = var.instance_profile_name
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [var.security_group_id]
    delete_on_termination       = true
  }

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    environment = var.environment
    app_version = var.app_version
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "app-server"
      Environment = var.environment
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name        = "app-server-volume"
      Environment = var.environment
    }
  }

  tags = {
    Name = "app-launch-template"
  }
}
```

## Step 3: Use the Launch Template in an Auto Scaling Group

```hcl
resource "aws_autoscaling_group" "app" {
  name               = "app-asg"
  vpc_zone_identifier = var.private_subnet_ids
  min_size           = 2
  max_size           = 10
  desired_capacity   = 2

  # Reference the launch template with a specific version
  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  tag {
    key                 = "Name"
    value               = "app-server"
    propagate_at_launch = true
  }
}
```

## Step 4: Launch an Instance Directly

```hcl
# Launch a single instance using the template
resource "aws_instance" "single" {
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"  # Always use the latest version
  }

  subnet_id = var.subnet_id

  tags = {
    Name = "single-app-instance"
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EC2 Launch Templates are the recommended way to define instance configurations in AWS. They support versioning so you can roll back changes, work with Auto Scaling Groups and Spot Fleets, and allow partial overrides at launch time. When you update an `aws_launch_template` resource and apply again, OpenTofu creates a new launch template version, and existing instances keep using the version they were launched with until you update the Auto Scaling Group or replace the instance.
