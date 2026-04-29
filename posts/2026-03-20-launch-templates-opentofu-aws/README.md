# How to Use Launch Templates with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Launch Templates, EC2, Infrastructure as Code

Description: Learn how to define and manage AWS EC2 Launch Templates using OpenTofu to standardize instance configurations and enable consistent auto-scaling deployments.

## Introduction

AWS Launch Templates allow you to define reusable EC2 instance configurations, including AMI IDs, instance types, security groups, and user data scripts. Using OpenTofu to manage Launch Templates ensures your infrastructure is version-controlled, repeatable, and easy to update.

## Prerequisites

- OpenTofu installed (v1.6+)
- AWS CLI configured with appropriate credentials
- An existing VPC, subnets, security group, and IAM instance profile in your AWS account

## What Are Launch Templates?

Launch Templates are the recommended successor to the older Launch Configurations and offer more flexibility. They support versioning, making it easy to roll back configurations, and can be used with Auto Scaling Groups, EC2 Fleet, and Spot Instances.

## Defining a Launch Template in OpenTofu

### Provider Configuration

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

### Variables

```hcl
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances"
  type        = string
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "security_group_ids" {
  description = "Security group IDs for EC2 instances"
  type        = list(string)
}

variable "iam_instance_profile_name" {
  description = "IAM instance profile name for EC2 instances"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the Auto Scaling Group"
  type        = list(string)
}
```

### Launch Template Resource

```hcl
resource "aws_launch_template" "app_server" {
  name_prefix   = "app-server-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  vpc_security_group_ids = var.security_group_ids

  iam_instance_profile {
    name = var.iam_instance_profile_name
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "Launch template bootstrap complete" > /var/log/launch-template-init.log
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "app-server"
      Environment = "production"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

### Auto Scaling Group Using the Launch Template

```hcl
resource "aws_autoscaling_group" "app" {
  desired_capacity = 2
  max_size         = 5
  min_size         = 1
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app_server.id
    version = aws_launch_template.app_server.latest_version
  }

  tag {
    key                 = "Name"
    value               = "app-asg-instance"
    propagate_at_launch = true
  }
}
```

## Versioning Launch Templates

OpenTofu manages Launch Template versions automatically. Each `apply` that changes the template creates a new version. Pin a specific version in production:

```hcl
launch_template {
  id      = aws_launch_template.app_server.id
  version = "3"
}
```

## Deploying

```bash
tofu init
tofu plan \
  -var="ami_id=ami-0abcdef1234567890" \
  -var='security_group_ids=["sg-0123456789abcdef0"]' \
  -var="iam_instance_profile_name=app-profile" \
  -var='subnet_ids=["subnet-0123456789abcdef0","subnet-0fedcba9876543210"]'
tofu apply \
  -var="ami_id=ami-0abcdef1234567890" \
  -var='security_group_ids=["sg-0123456789abcdef0"]' \
  -var="iam_instance_profile_name=app-profile" \
  -var='subnet_ids=["subnet-0123456789abcdef0","subnet-0fedcba9876543210"]'
```

## Best Practices

- Use `name_prefix` instead of `name` to allow clean replacements.
- Always encrypt EBS volumes by default.
- Store sensitive user data in AWS Secrets Manager and reference it at runtime.
- Pin Launch Template versions in production ASGs to prevent unexpected updates.
- If you use `lifecycle { create_before_destroy = true }`, pair it with `name_prefix` to avoid name collisions during replacement.

## Conclusion

OpenTofu makes managing AWS Launch Templates straightforward with clear resource definitions and built-in versioning. By combining Launch Templates with Auto Scaling Groups, you can build resilient, consistently configured workloads that scale seamlessly.
