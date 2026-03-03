# How to Create Reusable Terraform Modules for EC2 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, AWS, EC2, Compute

Description: Build a flexible Terraform module for EC2 instances that handles AMI selection, user data, EBS volumes, and instance profiles with clean variable interfaces.

---

EC2 instances are probably the most common resource you will manage in AWS. Whether you are running application servers, bastion hosts, CI runners, or GPU workloads, the underlying Terraform configuration looks similar but with small differences each time. A reusable module eliminates that repetition and enforces your organization's standards for tagging, monitoring, and security.

This post walks through building an EC2 module that is flexible enough for most use cases while keeping sane defaults.

## What the Module Should Handle

Before writing any code, list out what your EC2 module needs to manage:

- The instance itself (AMI, instance type, key pair)
- Root and additional EBS volumes
- Security group attachment
- IAM instance profile
- User data scripts
- Tags and naming conventions
- Optional Elastic IP association

You do not want the module to manage the VPC, subnets, or security groups directly. Those should come from other modules and be passed in as variables.

## Directory Structure

```text
modules/ec2-instance/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
  data.tf          # For AMI lookups
```

## Variables

```hcl
# modules/ec2-instance/variables.tf

variable "name" {
  description = "Name tag for the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Specific AMI ID. If not set, latest Amazon Linux 2023 is used."
  type        = string
  default     = null
}

variable "subnet_id" {
  description = "Subnet ID where the instance will be launched"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs to attach"
  type        = list(string)
  default     = []
}

variable "key_name" {
  description = "SSH key pair name. Set to null to disable SSH key."
  type        = string
  default     = null
}

variable "user_data" {
  description = "User data script to run on first boot"
  type        = string
  default     = null
}

variable "iam_instance_profile" {
  description = "Name of the IAM instance profile to attach"
  type        = string
  default     = null
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 20
}

variable "root_volume_type" {
  description = "Root EBS volume type"
  type        = string
  default     = "gp3"
}

variable "additional_ebs_volumes" {
  description = "Additional EBS volumes to attach"
  type = list(object({
    device_name = string
    size        = number
    type        = optional(string, "gp3")
    encrypted   = optional(bool, true)
  }))
  default = []
}

variable "associate_public_ip" {
  description = "Whether to associate a public IP address"
  type        = bool
  default     = false
}

variable "enable_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

## AMI Lookup

Instead of hardcoding AMI IDs (which are region-specific), provide a sensible default lookup:

```hcl
# modules/ec2-instance/data.tf

# Fetch the latest Amazon Linux 2023 AMI when no AMI ID is provided
data "aws_ami" "amazon_linux" {
  count = var.ami_id == null ? 1 : 0

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

  filter {
    name   = "state"
    values = ["available"]
  }
}

locals {
  # Use provided AMI or fall back to the latest Amazon Linux 2023
  ami_id = var.ami_id != null ? var.ami_id : data.aws_ami.amazon_linux[0].id
}
```

## Main Resource

```hcl
# modules/ec2-instance/main.tf

resource "aws_instance" "this" {
  ami                    = local.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = var.security_group_ids
  key_name               = var.key_name
  iam_instance_profile   = var.iam_instance_profile
  monitoring             = var.enable_monitoring

  # Encode user data as base64 if provided
  user_data = var.user_data != null ? base64encode(var.user_data) : null

  associate_public_ip_address = var.associate_public_ip

  # Root volume configuration
  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = var.root_volume_type
    encrypted             = true
    delete_on_termination = true
  }

  # Enable IMDSv2 for better security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # Forces IMDSv2
    http_put_response_hop_limit = 1
  }

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )

  # Prevent accidental destruction in production
  lifecycle {
    ignore_changes = [ami]  # Don't replace instance when AMI updates
  }
}

# Additional EBS volumes
resource "aws_ebs_volume" "additional" {
  count = length(var.additional_ebs_volumes)

  availability_zone = aws_instance.this.availability_zone
  size              = var.additional_ebs_volumes[count.index].size
  type              = var.additional_ebs_volumes[count.index].type
  encrypted         = var.additional_ebs_volumes[count.index].encrypted

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-vol-${count.index}"
    }
  )
}

# Attach additional volumes to the instance
resource "aws_volume_attachment" "additional" {
  count = length(var.additional_ebs_volumes)

  device_name = var.additional_ebs_volumes[count.index].device_name
  volume_id   = aws_ebs_volume.additional[count.index].id
  instance_id = aws_instance.this.id
}
```

## Outputs

```hcl
# modules/ec2-instance/outputs.tf

output "instance_id" {
  description = "The ID of the EC2 instance"
  value       = aws_instance.this.id
}

output "private_ip" {
  description = "Private IP address of the instance"
  value       = aws_instance.this.private_ip
}

output "public_ip" {
  description = "Public IP address (if assigned)"
  value       = aws_instance.this.public_ip
}

output "arn" {
  description = "ARN of the EC2 instance"
  value       = aws_instance.this.arn
}

output "availability_zone" {
  description = "Availability zone of the instance"
  value       = aws_instance.this.availability_zone
}
```

## Usage Examples

A basic application server:

```hcl
module "app_server" {
  source = "./modules/ec2-instance"

  name            = "app-server-01"
  instance_type   = "t3.medium"
  subnet_id       = module.vpc.private_subnet_ids[0]
  security_group_ids = [module.app_sg.id]
  key_name        = "ops-team"

  root_volume_size = 50

  tags = {
    Environment = "production"
    Service     = "api"
  }
}
```

A GPU instance for ML workloads:

```hcl
module "ml_worker" {
  source = "./modules/ec2-instance"

  name          = "ml-training-01"
  instance_type = "g5.xlarge"
  ami_id        = "ami-0abcdef1234567890"  # Custom ML AMI
  subnet_id     = module.vpc.private_subnet_ids[0]
  security_group_ids = [module.ml_sg.id]

  root_volume_size = 100

  # Additional storage for training data
  additional_ebs_volumes = [
    {
      device_name = "/dev/sdf"
      size        = 500
      type        = "gp3"
    }
  ]

  user_data = <<-EOF
    #!/bin/bash
    # Mount the additional volume
    mkfs -t xfs /dev/nvme1n1
    mkdir -p /data
    mount /dev/nvme1n1 /data
    echo '/dev/nvme1n1 /data xfs defaults 0 0' >> /etc/fstab
  EOF

  tags = {
    Environment = "production"
    Team        = "ml-platform"
  }
}
```

## Design Decisions Worth Noting

There are a few deliberate choices in this module. First, IMDSv2 is enforced by default. The instance metadata service v1 has been exploited in several high-profile breaches, so requiring v2 tokens is a sensible security default.

Second, the AMI is set to be ignored in lifecycle changes. This prevents Terraform from trying to replace your running instance every time a new AMI is published. If you want AMI updates to trigger replacements, remove that lifecycle block.

Third, the root volume is always encrypted. There is really no reason to have unencrypted volumes in 2026, and making it the default means nobody on your team accidentally deploys an unencrypted disk.

## When Not to Use This Module

This module is designed for standalone EC2 instances. If you are running containers, use ECS or EKS instead. If you need auto-scaling, look at launch templates with auto-scaling groups, which need a different module design since you are not managing individual instances.

For more on building Terraform modules, see our guide on [developing Terraform modules with best practices](https://oneuptime.com/blog/post/2026-02-23-develop-terraform-modules-with-best-practices/view).
