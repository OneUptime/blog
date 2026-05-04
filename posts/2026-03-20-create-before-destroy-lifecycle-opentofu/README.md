# How to Use create_before_destroy Lifecycle in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Lifecycle, Zero Downtime, Infrastructure as Code, DevOps

Description: A guide to using the create_before_destroy lifecycle argument in OpenTofu to achieve zero-downtime resource replacement.

## Introduction

By default, when OpenTofu needs to replace a resource, it destroys the old resource before creating the new one. The `create_before_destroy` lifecycle setting reverses this order - creating the replacement first, then destroying the old resource. This is crucial for zero-downtime deployments.

## Basic create_before_destroy

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true  # Create new instance before destroying old
  }
}
```

## Default Behavior vs create_before_destroy

```hcl
# DEFAULT BEHAVIOR (no lifecycle setting):

# 1. Detect change requiring replacement (e.g., new AMI)
# 2. DESTROY old instance <- Application unavailable here!
# 3. CREATE new instance
# 4. Done

# WITH create_before_destroy = true:
# 1. Detect change requiring replacement
# 2. CREATE new instance
# 3. (If creation succeeds) DESTROY old instance
# 4. Done - much shorter or no downtime!
```

## Common Use Cases

### Auto Scaling Launch Templates

```hcl
resource "aws_launch_template" "web" {
  name_prefix   = "web-lt-"
  image_id      = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true  # Essential for ASGs
  }
}

resource "aws_autoscaling_group" "web" {
  name                = "web-asg-${aws_launch_template.web.latest_version}"
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2

  launch_template {
    id      = aws_launch_template.web.id
    version = aws_launch_template.web.latest_version
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

### Security Groups

```hcl
resource "aws_security_group" "web" {
  name_prefix = "web-sg-"  # Use prefix, not name, for create_before_destroy
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
    # Note: Can't use name with create_before_destroy (name conflicts)
    # Use name_prefix to let AWS generate unique names
  }
}
```

### RDS Instances

```hcl
resource "aws_db_instance" "main" {
  identifier_prefix = "myapp-db-"  # Use prefix - identifiers must be unique during replacement
  engine            = "postgres"
  instance_class    = "db.t3.micro"

  lifecycle {
    create_before_destroy = true
  }
}
```

## name vs name_prefix

```hcl
# PROBLEM: Using 'name' with create_before_destroy causes naming conflict
resource "aws_security_group" "bad_example" {
  name   = "web-sg"  # Fixed name - will conflict during replacement!
  vpc_id = aws_vpc.main.id

  lifecycle {
    create_before_destroy = true
    # Error: "web-sg" already exists when trying to create the new one
  }
}

# SOLUTION: Use name_prefix for auto-generated unique names
resource "aws_security_group" "good_example" {
  name_prefix = "web-sg-"  # Provider appends a unique suffix, e.g. web-sg-20240115093045123456789a1b
  vpc_id      = aws_vpc.main.id

  lifecycle {
    create_before_destroy = true  # No naming conflict!
  }
}
```

## Dependency Propagation

```hcl
resource "aws_security_group" "main" {
  name_prefix = "main-"
  vpc_id      = aws_vpc.main.id

  lifecycle {
    create_before_destroy = true
  }
}

# Resources depending on security group also get create_before_destroy
resource "aws_instance" "web" {
  ami                    = var.ami_id
  vpc_security_group_ids = [aws_security_group.main.id]

  # create_before_destroy propagates from security group to instance
  lifecycle {
    create_before_destroy = true
  }
}
```

## Conclusion

`create_before_destroy` is essential for zero-downtime infrastructure updates. Use it for any resource that serves live traffic - EC2 instances, load balancers, security groups, and launch templates. Remember to use `name_prefix` instead of `name` for resources that would have naming conflicts during the creation-before-destruction window. The tradeoff is that you briefly run with both old and new resources simultaneously, which may incur short-term cost increases.
