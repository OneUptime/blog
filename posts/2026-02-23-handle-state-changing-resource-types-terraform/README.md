# How to Handle State When Changing Resource Types

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Migration, Infrastructure as Code, DevOps

Description: Learn how to handle Terraform state when you need to change a resource type, such as migrating from one AWS resource to another or changing providers.

---

Sometimes you need to change the type of a resource in Terraform. Maybe you're migrating from `aws_instance` to `aws_launch_template` with an Auto Scaling group. Maybe you're switching from `aws_db_instance` to `aws_rds_cluster` for Aurora. Or perhaps you're replacing an `aws_security_group_rule` with an inline rule in `aws_security_group`.

Unlike renaming resources, changing resource types is not a simple state operation. Terraform can't just update the address - the resource schema is completely different. Here's how to handle these transitions safely.

## Why You Can't Just State Move

The `terraform state mv` command and `moved` blocks work for renaming resources of the same type. But when the type changes, the state data has a completely different structure:

```json
// aws_instance state data
{
  "type": "aws_instance",
  "attributes": {
    "id": "i-0abc123",
    "ami": "ami-0123456789",
    "instance_type": "t3.medium",
    "subnet_id": "subnet-abc123"
  }
}

// aws_launch_template state data - completely different schema
{
  "type": "aws_launch_template",
  "attributes": {
    "id": "lt-0abc123",
    "image_id": "ami-0123456789",
    "instance_type": "t3.medium"
  }
}
```

You can't move between these because the attribute names and structures are different. Terraform has no way to automatically map one schema to another.

## Strategy 1: Create New, Then Remove Old

The safest approach is to create the new resource alongside the old one, verify it works, then remove the old resource:

### Step 1: Add the New Resource

```hcl
# Keep the old resource temporarily
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "web-old"
  }
}

# Add the new resource
resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = "ami-0123456789abcdef0"
  instance_type = "t3.medium"

  network_interfaces {
    subnet_id = aws_subnet.public.id
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "web-new"
    }
  }
}

resource "aws_autoscaling_group" "web" {
  desired_capacity = 1
  max_size         = 3
  min_size         = 1

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  vpc_zone_identifier = [aws_subnet.public.id]
}
```

### Step 2: Apply and Verify

```bash
# Apply to create the new resources
terraform apply

# Verify the new resources are working
# (test endpoints, check health, etc.)
```

### Step 3: Remove the Old Resource

Once you've confirmed the new resource works:

```hcl
# Remove the old resource block from your .tf files
# (delete the aws_instance.web block)
```

```bash
# Apply to destroy the old resource
terraform apply
# Plan shows: aws_instance.web will be destroyed
```

### Step 4: Clean Up

After the transition is complete, you have just the new resources.

## Strategy 2: Import After Manual Creation

If the new resource type represents an existing resource that was already created outside Terraform (or by another tool):

```bash
# Remove the old resource from state (don't destroy it)
terraform state rm aws_db_instance.main

# Import the existing resource under the new type
terraform import aws_rds_cluster.main my-cluster-id

# Import associated resources
terraform import aws_rds_cluster_instance.main my-cluster-instance-id
```

## Strategy 3: Remove and Import (Same Infrastructure)

When the underlying infrastructure stays the same but the Terraform resource type changes (common with provider upgrades or resource splits):

```bash
# Example: aws_security_group with inline rules -> separate aws_security_group_rule resources

# Step 1: Remove the old resource from state
terraform state rm aws_security_group.web

# Step 2: Import it under the new structure
terraform import aws_security_group.web sg-0abc123

# Step 3: Import the individual rules
terraform import aws_security_group_rule.http "sg-0abc123_ingress_tcp_80_80_0.0.0.0/0"
terraform import aws_security_group_rule.https "sg-0abc123_ingress_tcp_443_443_0.0.0.0/0"
```

## Real-World Example: EC2 Instance to Launch Template

Let's walk through a complete migration from a standalone EC2 instance to a Launch Template with Auto Scaling.

### Current State

```hcl
# Current configuration
resource "aws_instance" "app" {
  ami                    = "ami-0123456789abcdef0"
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.private.id
  vpc_security_group_ids = [aws_security_group.app.id]
  key_name               = "my-key"

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  user_data = base64encode(file("userdata.sh"))

  tags = {
    Name = "app-server"
  }
}
```

### New Configuration

```hcl
# New configuration with launch template and ASG
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  key_name      = "my-key"

  network_interfaces {
    security_groups = [aws_security_group.app.id]
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 50
      volume_type = "gp3"
    }
  }

  user_data = base64encode(file("userdata.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "app-server"
    }
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  desired_capacity    = 1
  max_size            = 3
  min_size            = 1
  vpc_zone_identifier = [aws_subnet.private.id]

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Wait for new instances to be healthy before removing old ones
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "app-server"
    propagate_at_launch = true
  }
}
```

### Migration Steps

```bash
# Step 1: Add the new resources to your .tf files (keep the old instance too)
# Edit your configuration to include both old and new

# Step 2: Apply to create the launch template and ASG
terraform apply -target=aws_launch_template.app -target=aws_autoscaling_group.app

# Step 3: Verify the new ASG instance is working
# Check health, test endpoints, verify logs

# Step 4: Update DNS/load balancer to point to the new ASG instances
# This depends on your specific setup

# Step 5: Remove the old instance from configuration and apply
# Delete the aws_instance.app block from your .tf files
terraform apply
# This destroys the old standalone instance
```

## Real-World Example: RDS Instance to Aurora Cluster

```bash
# Step 1: Snapshot the existing RDS instance
aws rds create-db-snapshot \
  --db-instance-identifier my-database \
  --db-snapshot-identifier pre-aurora-migration

# Step 2: Create the Aurora cluster from the snapshot (outside Terraform)
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier my-aurora-cluster \
  --snapshot-identifier pre-aurora-migration \
  --engine aurora-mysql

# Step 3: Remove the old resource from Terraform state
terraform state rm aws_db_instance.main

# Step 4: Import the new Aurora cluster into Terraform
terraform import aws_rds_cluster.main my-aurora-cluster
terraform import aws_rds_cluster_instance.main my-aurora-cluster-instance

# Step 5: Update your configuration to use aws_rds_cluster instead of aws_db_instance
# Then run terraform plan to verify alignment
terraform plan
```

## Using lifecycle prevent_destroy for Safety

During type migrations, protect critical resources from accidental deletion:

```hcl
# Protect the old resource during migration
resource "aws_db_instance" "main" {
  # ... existing configuration ...

  lifecycle {
    prevent_destroy = true
  }
}
```

Remove `prevent_destroy` only when you're ready to decommission the old resource.

## Handling Outputs and References

When changing resource types, all references to the old resource need updating:

```hcl
# Before: referencing aws_instance attributes
output "app_ip" {
  value = aws_instance.app.private_ip
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app"
  type    = "A"
  ttl     = 300
  records = [aws_instance.app.private_ip]
}

# After: referencing ASG/ALB attributes instead
output "app_endpoint" {
  value = aws_lb.app.dns_name
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app"
  type    = "CNAME"
  ttl     = 300
  records = [aws_lb.app.dns_name]
}
```

## Blue-Green Approach for Zero-Downtime Migration

For critical resources, use a blue-green pattern:

```hcl
variable "active_color" {
  type    = string
  default = "blue"  # Switch to "green" after migration
}

# Blue (old) resources
resource "aws_instance" "blue" {
  count         = var.active_color == "blue" ? 1 : 0
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.private.id
}

# Green (new) resources
resource "aws_autoscaling_group" "green" {
  count            = var.active_color == "green" ? 1 : 0
  desired_capacity = 1
  max_size         = 3
  min_size         = 1

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  vpc_zone_identifier = [aws_subnet.private.id]
}

# Point traffic at the active color
resource "aws_lb_target_group_attachment" "active" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id = (
    var.active_color == "blue"
    ? aws_instance.blue[0].id
    : aws_autoscaling_group.green[0].id
  )
}
```

Deploy with `active_color = "blue"`, create the green resources, test them, then switch:

```bash
# Deploy green alongside blue
terraform apply -var="active_color=blue"

# Switch traffic to green
terraform apply -var="active_color=green"

# Once verified, clean up blue
# Remove the blue resources from configuration
terraform apply
```

## Wrapping Up

Changing resource types is one of the more involved Terraform operations because you can't simply rename the resource in state. The approach you choose depends on the specific migration: create-and-destroy for straightforward transitions, remove-and-import for schema changes, and blue-green for zero-downtime requirements.

Whatever approach you take, always backup your state before starting, verify at each step, and keep the old resource running until you've confirmed the new one works correctly.

For related refactoring techniques, see our posts on [renaming Terraform resources](https://oneuptime.com/blog/post/2026-02-23-handle-state-renaming-terraform-resources/view) and [moving resources between modules](https://oneuptime.com/blog/post/2026-02-23-handle-state-moving-resources-between-modules/view).
