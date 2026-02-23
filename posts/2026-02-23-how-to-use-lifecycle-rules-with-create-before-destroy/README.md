# How to Use Lifecycle Rules with create_before_destroy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Lifecycle, Zero Downtime, Infrastructure as Code

Description: Learn how to use Terraform's create_before_destroy lifecycle rule to achieve zero-downtime resource replacements, understand when it is needed, and handle the edge cases that come with it.

---

When Terraform needs to replace a resource (destroy the old one and create a new one), its default behavior is to destroy first, then create. For many resources, this causes downtime. The `create_before_destroy` lifecycle rule reverses this order: Terraform creates the replacement resource first, then destroys the old one. This is essential for zero-downtime deployments.

This post explains how `create_before_destroy` works, which resources need it, and the edge cases you will encounter.

## The Default Replacement Behavior

By default, when Terraform detects that a resource needs to be replaced (not just updated in place), it follows this order:

1. Destroy the existing resource
2. Create the new resource

For an EC2 instance where the AMI changes, this means the old instance is terminated before the new one launches. There is a gap where no instance exists.

```hcl
# Default behavior: destroy-then-create
resource "aws_instance" "app" {
  ami           = var.ami_id  # Changing this forces replacement
  instance_type = "t3.micro"
}
```

If `var.ami_id` changes, Terraform destroys the running instance, then creates a new one. Any traffic hitting that instance during the gap fails.

## Enabling create_before_destroy

Add the lifecycle rule to reverse the order:

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "app-server"
  }
}
```

Now when the AMI changes:
1. Terraform creates a new instance with the new AMI
2. Once the new instance is running, Terraform destroys the old one

There is a brief period where both instances exist simultaneously.

## Resources That Commonly Need create_before_destroy

### Security Groups

If you change a security group's name or description, AWS requires replacement. Without `create_before_destroy`, instances referencing the group briefly lose their security group.

```hcl
resource "aws_security_group" "app" {
  name_prefix = "app-"
  description = "Application security group"
  vpc_id      = var.vpc_id

  ingress {
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

  lifecycle {
    create_before_destroy = true
  }
}
```

Using `name_prefix` instead of `name` is important here. With `name_prefix`, AWS generates a unique suffix, so the new security group can be created while the old one still exists. With a fixed `name`, the creation would fail because the name is already taken.

### Launch Configurations and Launch Templates

Auto Scaling Groups reference launch configurations. If the launch config changes, the ASG needs the new one before releasing the old one.

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "${var.project}-app-asg"
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

### ACM Certificates

When renewing or replacing an ACM certificate, the old one should stay active until the new one is validated and associated.

```hcl
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = var.san_domains

  lifecycle {
    create_before_destroy = true
  }
}
```

### RDS Instances

Database replacements are particularly sensitive. You want the new database to be ready before the old one goes away.

```hcl
resource "aws_db_instance" "main" {
  identifier_prefix    = "${var.project}-"
  engine               = "postgres"
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.storage_gb
  username             = "admin"
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.main.name

  lifecycle {
    create_before_destroy = true
  }
}
```

Note the use of `identifier_prefix` instead of `identifier`. Like `name_prefix` for security groups, this lets AWS generate a unique suffix so both the old and new instances can exist simultaneously.

## The name Conflict Problem

The biggest gotcha with `create_before_destroy` is naming conflicts. If the old resource has a fixed name and the new resource tries to use the same name, creation fails.

```hcl
# This FAILS with create_before_destroy
resource "aws_security_group" "app" {
  name   = "app-sg"  # Fixed name - can't have two with the same name
  vpc_id = var.vpc_id

  lifecycle {
    create_before_destroy = true
  }
}

# Error: A security group named 'app-sg' already exists in this VPC
```

The fix is to use `name_prefix`:

```hcl
# This WORKS with create_before_destroy
resource "aws_security_group" "app" {
  name_prefix = "app-sg-"  # AWS appends a random suffix
  vpc_id      = var.vpc_id

  lifecycle {
    create_before_destroy = true
  }
}
```

Resources that have this limitation include:
- Security groups (use `name_prefix`)
- Launch configurations (use `name_prefix`)
- RDS instances (use `identifier_prefix`)
- IAM roles (use `name_prefix`)
- S3 buckets (use `bucket_prefix`)

## create_before_destroy with Dependencies

When resource A has `create_before_destroy` and resource B depends on A, Terraform applies `create_before_destroy` to B as well. This cascade can cause unexpected behavior.

```hcl
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = var.vpc_id

  lifecycle {
    create_before_destroy = true
  }
}

# This instance inherits create_before_destroy behavior
# because it depends on the security group
resource "aws_instance" "app" {
  ami                    = var.ami_id
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.app.id]
}
```

If the security group is replaced, Terraform will also replace the instance using create-before-destroy semantics, even though the instance does not have the lifecycle rule explicitly set.

## Combining with Other Lifecycle Rules

`create_before_destroy` can be combined with other lifecycle arguments:

```hcl
resource "aws_db_instance" "main" {
  identifier_prefix = "${var.project}-"
  engine            = "postgres"
  engine_version    = var.engine_version
  instance_class    = var.instance_class

  lifecycle {
    # Create replacement before destroying old one
    create_before_destroy = true

    # Ignore AMI changes from external updates
    ignore_changes = [engine_version]

    # Do NOT combine with prevent_destroy - they conflict
    # prevent_destroy blocks all destruction, including the
    # "destroy old" step of create_before_destroy
  }
}
```

Note: using `create_before_destroy` and `prevent_destroy` together does not make sense. `prevent_destroy` blocks any destruction, which would prevent the "destroy old resource" step of `create_before_destroy`.

## Cost Implications

During the brief overlap period, you are paying for both the old and new resource. For most resources, this is seconds or minutes. But for large databases or expensive instances, be aware of the cost.

```hcl
# For expensive resources, consider the overlap cost
resource "aws_db_instance" "analytics" {
  identifier_prefix = "${var.project}-analytics-"
  instance_class    = "db.r5.4xlarge"  # Expensive instance
  # ...

  lifecycle {
    create_before_destroy = true
    # Both the old and new instance run simultaneously
    # until Terraform destroys the old one
  }
}
```

## When NOT to Use create_before_destroy

Some resources should not use this rule:

```hcl
# Resources with unique constraints that prevent two existing at once
resource "aws_eip" "nat" {
  domain = "vpc"
  # EIPs do not need create_before_destroy
  # They are cheap and fast to create
}

# Resources where simultaneous existence causes conflicts
resource "aws_route" "default" {
  route_table_id         = aws_route_table.main.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
  # Two routes with the same destination would conflict
}

# Stateful resources that should not be duplicated
resource "aws_sqs_queue" "orders" {
  name = "order-processing"
  # Having two queues with similar names could cause
  # messages to be split between them
}
```

## Testing create_before_destroy

You can verify the replacement behavior with `terraform plan`:

```bash
# Change the AMI ID to trigger replacement
terraform plan

# Look for the replacement notice in the output:
# aws_instance.app must be replaced
# +/- create replacement and then destroy
```

The `+/-` symbol in the plan output indicates create-before-destroy. A `-/+` symbol indicates the default destroy-before-create.

## A Complete Example

```hcl
# Security group with create_before_destroy
resource "aws_security_group" "web" {
  name_prefix = "${var.project}-web-"
  description = "Web server security group"
  vpc_id      = var.vpc_id

  ingress {
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

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-web-sg"
  })
}

# Launch template with create_before_destroy
resource "aws_launch_template" "web" {
  name_prefix   = "${var.project}-web-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.web.id]

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "${var.project}-web"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ASG that references the launch template
resource "aws_autoscaling_group" "web" {
  name_prefix         = "${var.project}-web-"
  min_size            = 2
  max_size            = 10
  desired_capacity    = var.desired_capacity
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  lifecycle {
    create_before_destroy = true
  }

  tag {
    key                 = "Name"
    value               = "${var.project}-web"
    propagate_at_launch = true
  }
}
```

## Summary

`create_before_destroy` is your primary tool for zero-downtime resource replacements in Terraform. Enable it on resources that serve traffic or are referenced by other resources - security groups, launch templates, ACM certificates, and database instances. Always use `name_prefix` or `identifier_prefix` instead of fixed names to avoid naming conflicts during the overlap period. Be aware that the rule cascades to dependent resources and that both old and new resources run simultaneously during the transition.

For more on lifecycle management, see our post on [using prevent_destroy](https://oneuptime.com/blog/post/2026-02-23-how-to-use-lifecycle-rules-with-prevent-destroy/view) and our overview of [Terraform lifecycle rules](https://oneuptime.com/blog/post/2026-01-24-terraform-lifecycle-rules/view).
