# How to Create Launch Templates for Auto Scaling in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Launch Templates, Auto Scaling, EC2

Description: Complete guide to creating AWS launch templates in Terraform for use with Auto Scaling Groups, covering instance configuration, versioning, and production-ready settings.

---

Launch templates are the blueprint that Auto Scaling Groups use to create new EC2 instances. They replaced launch configurations (which AWS deprecated) and offer significant improvements: versioning, multiple instance type overrides, mixed purchase options, and the ability to use them outside of Auto Scaling with standalone instance launches.

Getting your launch template right matters because every instance your ASG creates will be based on it. Let's walk through creating production-ready launch templates in Terraform.

## Basic Launch Template

Start with the essentials: AMI, instance type, security groups, and an instance profile.

```hcl
# Look up the latest Amazon Linux 2023 AMI
data "aws_ami" "al2023" {
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

# Launch template with basic configuration
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  description   = "Launch template for application servers"
  image_id      = data.aws_ami.al2023.id
  instance_type = "t3.medium"

  # Use name_prefix to allow create_before_destroy
  lifecycle {
    create_before_destroy = true
  }

  # Security groups for the instances
  vpc_security_group_ids = [
    aws_security_group.app.id,
    aws_security_group.monitoring.id,
  ]

  # IAM instance profile for AWS API access
  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  # User data script (must be base64 encoded in launch templates)
  user_data = base64encode(templatefile("${path.module}/scripts/bootstrap.sh", {
    environment = var.environment
    app_version = var.app_version
  }))

  # Tags applied to instances launched from this template
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "app-server"
      Environment = var.environment
    }
  }

  # Tags for volumes created with the instances
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

## Detailed Instance Configuration

Production launch templates typically need more configuration: key pairs, monitoring, metadata options, and block device mappings.

```hcl
# Production-ready launch template with full configuration
resource "aws_launch_template" "production" {
  name_prefix = "production-app-"
  description = "Production launch template v${var.template_version}"
  image_id    = data.aws_ami.al2023.id

  # Don't set instance_type here if using mixed instances in ASG
  # instance_type = "t3.large"

  key_name = var.key_pair_name

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  # Enable detailed CloudWatch monitoring
  monitoring {
    enabled = true
  }

  # Instance metadata service configuration (IMDSv2)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # Enforce IMDSv2
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "enabled"
  }

  # Root volume configuration
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
      iops                  = 3000
      throughput            = 250
      encrypted             = true
      kms_key_id            = aws_kms_key.ebs.arn
      delete_on_termination = true
    }
  }

  # Disable termination protection (ASG needs to be able to terminate)
  disable_api_termination = false

  # Enable EBS optimization (free on most current-gen instances)
  ebs_optimized = true

  # Credit specification for burstable instance types
  credit_specification {
    cpu_credits = "unlimited"
  }

  # Placement group for low-latency networking
  placement {
    tenancy = "default"
  }

  user_data = base64encode(templatefile("${path.module}/scripts/bootstrap.sh", {
    environment = var.environment
    region      = var.aws_region
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.common_tags, {
      Name = "production-app"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(var.common_tags, {
      Name = "production-app-volume"
    })
  }

  tag_specifications {
    resource_type = "network-interface"
    tags = merge(var.common_tags, {
      Name = "production-app-eni"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Launch Template Versioning

One of the biggest advantages of launch templates over the old launch configurations is versioning. You can create new versions without destroying the existing one, and your ASG can reference a specific version or always use the latest.

```hcl
# Launch template - Terraform creates a new version on each change
resource "aws_launch_template" "versioned" {
  name        = "app-template"  # Use a fixed name for versioning
  description = "Application server template"
  image_id    = var.ami_id

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(templatefile("${path.module}/scripts/bootstrap.sh", {
    app_version = var.app_version
  }))

  # This creates a new version instead of replacing the template
  update_default_version = true

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "app-server"
      AppVersion = var.app_version
    }
  }
}

# ASG referencing the latest version
resource "aws_autoscaling_group" "app" {
  name_prefix         = "app-"
  desired_capacity    = var.desired_capacity
  min_size            = var.min_size
  max_size            = var.max_size
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.versioned.id
    version = "$Latest"  # Always use the newest version
  }

  # Refresh instances when the launch template changes
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 75
      instance_warmup        = 300
    }
  }
}
```

Using `$Latest` means the ASG will use the newest template version for any new instances. Combined with `instance_refresh`, existing instances get replaced in a rolling fashion when the template changes.

## Mixed Instance Types

For cost optimization with Spot Instances, define the launch template without an instance type and specify overrides in the ASG.

```hcl
# Launch template without instance_type for mixed instances
resource "aws_launch_template" "mixed" {
  name_prefix = "mixed-"
  image_id    = data.aws_ami.al2023.id
  # Note: instance_type is intentionally omitted

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(file("${path.module}/scripts/bootstrap.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "mixed-instance"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ASG with mixed instance types and purchase options
resource "aws_autoscaling_group" "mixed" {
  name_prefix         = "mixed-"
  desired_capacity    = 6
  min_size            = 2
  max_size            = 20
  vpc_zone_identifier = var.private_subnet_ids

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2
      on_demand_percentage_above_base_capacity = 25
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.mixed.id
        version            = "$Latest"
      }

      # Specify multiple instance types for spot diversity
      override {
        instance_type     = "t3.large"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "t3a.large"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "m5.large"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "m5a.large"
        weighted_capacity = "1"
      }
    }
  }
}
```

## Network Interface Configuration

For instances that need specific networking configuration, define it in the template.

```hcl
# Launch template with specific network interface settings
resource "aws_launch_template" "network_heavy" {
  name_prefix = "network-heavy-"
  image_id    = data.aws_ami.al2023.id
  instance_type = "c5n.xlarge"  # Network-optimized instance

  # Use network_interfaces instead of vpc_security_group_ids
  # when you need more control
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.app.id]
    delete_on_termination       = true

    # Enhanced networking description
    description = "Primary interface for app traffic"
  }

  # Enable enhanced networking
  # (automatically enabled on compatible instance types)

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "network-heavy-instance"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Template with Spot Options

You can configure spot instance options directly in the launch template.

```hcl
# Launch template configured for spot instances
resource "aws_launch_template" "spot" {
  name_prefix   = "spot-worker-"
  image_id      = data.aws_ami.al2023.id
  instance_type = "c5.xlarge"

  instance_market_options {
    market_type = "spot"

    spot_options {
      max_price                      = "0.08"
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  vpc_security_group_ids = [aws_security_group.worker.id]

  user_data = base64encode(file("${path.module}/scripts/worker-bootstrap.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "spot-worker"
    }
  }
}
```

## Outputs

Always export the launch template ID and latest version for use by other modules.

```hcl
output "launch_template_id" {
  value       = aws_launch_template.app.id
  description = "ID of the launch template"
}

output "launch_template_latest_version" {
  value       = aws_launch_template.app.latest_version
  description = "Latest version number of the launch template"
}

output "launch_template_arn" {
  value       = aws_launch_template.app.arn
  description = "ARN of the launch template"
}
```

## Summary

Launch templates are the recommended way to define instance configurations for Auto Scaling Groups. Key things to remember: use `name_prefix` with `create_before_destroy` for safe updates, omit `instance_type` when using mixed instances in your ASG, always enforce IMDSv2, encrypt your volumes, and use `$Latest` version with instance refresh for rolling updates. Build your templates with all the production settings from the start - it's much easier than bolting them on later.

For more on Auto Scaling, see our guide on [creating Auto Scaling Groups with Terraform](https://oneuptime.com/blog/post/2026-02-23-create-auto-scaling-groups-with-terraform/view) and [configuring Auto Scaling policies](https://oneuptime.com/blog/post/2026-02-23-configure-auto-scaling-policies-in-terraform/view).
