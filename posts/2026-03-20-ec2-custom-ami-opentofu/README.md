# How to Create EC2 Instances with Custom AMIs in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, AMI, Infrastructure as Code, Compute, Golden Image

Description: Learn how to create EC2 instances using custom AMIs with OpenTofu, including how to look up AMIs by filters and launch instances from your own golden images.

## Introduction

Custom AMIs (Amazon Machine Images) are pre-configured virtual machine images that serve as the starting point for EC2 instances. Using custom AMIs ensures consistent, pre-hardened configurations across your fleet. This guide covers launching EC2 instances from both AWS-managed and custom AMIs.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 permissions
- An existing VPC and subnet

## Step 1: Look Up the Latest Amazon Linux AMI

```hcl
# Data source to fetch the latest Amazon Linux 2023 AMI

# Filters ensure we always get the current version
data "aws_ami" "amazon_linux" {
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
```

## Step 2: Look Up a Custom AMI by Tag

```hcl
# Find a custom golden image by environment and application tags when enabled
data "aws_ami" "golden" {
  count       = var.use_golden_image ? 1 : 0
  most_recent = true
  owners      = [var.aws_account_id]

  filter {
    name   = "tag:Application"
    values = ["web-server"]
  }

  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}
```

## Step 3: Create an IAM Instance Profile

```hcl
# IAM role for the EC2 instance to assume
resource "aws_iam_role" "ec2" {
  name = "ec2-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "ec2-instance-profile"
  role = aws_iam_role.ec2.name
}
```

## Step 4: Launch an EC2 Instance from a Custom AMI

```hcl
resource "aws_instance" "web" {
  # Use the custom golden image when enabled, otherwise use Amazon Linux
  ami           = var.use_golden_image ? data.aws_ami.golden[0].id : data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id

  iam_instance_profile = aws_iam_instance_profile.ec2.name

  # Enable detailed monitoring
  monitoring = true

  # Root volume configuration
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  # User data runs on first boot only
  user_data = <<-EOF
    #!/bin/bash
    echo "Instance launched from AMI: ${var.use_golden_image ? data.aws_ami.golden[0].id : data.aws_ami.amazon_linux.id}"
    yum update -y
  EOF

  tags = {
    Name        = "web-server"
    AMI         = var.use_golden_image ? data.aws_ami.golden[0].id : data.aws_ami.amazon_linux.id
    Environment = var.environment
  }
}
```

## Step 5: Output AMI Details

```hcl
output "instance_id" {
  value = aws_instance.web.id
}

output "ami_used" {
  description = "AMI ID used to launch the instance"
  value       = aws_instance.web.ami
}

output "golden_ami_name" {
  value = var.use_golden_image ? data.aws_ami.golden[0].name : "N/A"
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have launched EC2 instances from both AWS-managed and custom golden AMIs using OpenTofu. The `data "aws_ami"` resource with `most_recent = true` ensures your infrastructure always uses the most recent matching image without hardcoding AMI IDs, which vary by region. Always store custom AMI IDs in SSM Parameter Store or use consistent tagging for reliable lookups.
