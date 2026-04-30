# How to Use ignore_changes Lifecycle in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Lifecycle, Ignore_changes, Infrastructure as Code, DevOps

Description: A guide to using ignore_changes lifecycle in OpenTofu to prevent specific resource attributes from being managed by OpenTofu after initial creation.

## Introduction

The `ignore_changes` lifecycle setting tells OpenTofu to ignore differences for specific attributes when planning changes. This is useful when attributes are managed externally (by autoscalers, external processes, or manual operations) or when a value should only be used during the initial creation of a resource.

## Basic ignore_changes

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    ignore_changes = [
      ami,  # Keep the original AMI after creation even if var.ami_id changes
      tags  # Ignore tag changes made outside OpenTofu
    ]
  }
}
```

## Common Use Cases

### Ignoring Auto Scaling Changes

```hcl
resource "aws_autoscaling_group" "web" {
  name             = "web-asg"
  min_size         = 2
  max_size         = 10
  desired_capacity = 2
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  lifecycle {
    # desired_capacity is managed by Auto Scaling policies
    ignore_changes = [desired_capacity]
  }
}
```

### Ignoring External Tag Changes

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server"
    Environment = var.environment
    # External automation may also add CostCenter and BackupPolicy tags
  }

  lifecycle {
    # Don't overwrite tags added by cost allocation automation
    ignore_changes = [tags["CostCenter"], tags["BackupPolicy"]]
  }
}
```

### Ignoring Password Changes

```hcl
resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.t3.micro"
  allocated_storage = 20
  username       = "admin"
  password       = var.initial_password  # Bootstrap password used at creation

  lifecycle {
    # Prevent later configuration changes from attempting a password update
    ignore_changes = [password]
  }
}
```

### Ignoring Computed Values

```hcl
resource "terraform_data" "created_at" {
  input = timestamp()

  lifecycle {
    # Keep the initial timestamp taken during creation
    ignore_changes = [input]
  }
}
```

## ignore_changes = all (Use with Caution)

```hcl
# Ignore ALL changes - OpenTofu only manages creation and deletion

resource "aws_instance" "manually_managed" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    ignore_changes = all  # Extreme - avoid unless necessary
  }
}
```

## Ignoring Multiple Attributes

```hcl
resource "aws_autoscaling_group" "web" {
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  lifecycle {
    # Ignore multiple attributes managed outside OpenTofu
    ignore_changes = [
      desired_capacity,  # Ignore capacity managed by scaling policies
      load_balancers,  # Ignore Classic Load Balancer attachments managed externally
    ]
  }
}
```

## When NOT to Use ignore_changes

```hcl
# AVOID: Using ignore_changes to suppress errors
resource "aws_s3_bucket" "main" {
  bucket_prefix = "my-bucket-"

  lifecycle {
    # BAD: Hiding configuration drift instead of fixing it
    ignore_changes = all
  }
}

# BETTER: Fix the underlying configuration drift
# Or use data sources to read external state instead of managing it
```

## Combining with Other Lifecycle Settings

```hcl
resource "aws_autoscaling_group" "web" {
  name_prefix         = "web-"
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes = [
      # Auto Scaling policies can adjust capacity independently
      desired_capacity,
    ]
  }
}
```

## Conclusion

`ignore_changes` bridges the gap between OpenTofu-managed infrastructure and externally-modified attributes. It's particularly valuable for autoscaling groups (managed capacity), one-time bootstrap values such as initial passwords or creation timestamps, and resources with attributes modified by other automation. Use it judiciously - overusing it can cause OpenTofu to become unaware of significant drift, undermining the benefits of infrastructure as code. Document why each `ignore_changes` entry exists to help future engineers understand the intent.
