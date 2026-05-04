# How to Create AMIs from EC2 Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, AMI, EC2, Golden Image, Infrastructure as Code, Automation

Description: Learn how to create custom AMIs from running or stopped EC2 instances using OpenTofu to build golden images for consistent, reproducible infrastructure deployments.

## Introduction

Creating AMIs from configured EC2 instances lets you capture a system state as a reusable image. This golden image pattern ensures all new instances start from a known-good, pre-configured baseline with required software, security hardening, and configuration already applied.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 permissions
- A source EC2 instance to image

## Step 1: Create a Source Instance with Configuration

```hcl
# Build instance from which we'll create the golden AMI

resource "aws_instance" "builder" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id

  user_data = base64encode(<<-EOF
    #!/bin/bash
    # Install and configure required software
    yum update -y
    yum install -y nginx java-17-amazon-corretto amazon-cloudwatch-agent

    # Enable services
    systemctl enable nginx
    systemctl enable amazon-cloudwatch-agent

    # Apply security hardening
    echo "ClientAliveInterval 300" >> /etc/ssh/sshd_config
    echo "ClientAliveCountMax 2" >> /etc/ssh/sshd_config

    # Mark bootstrap as complete so we know the instance is ready to image
    touch /var/lib/golden-image-ready
  EOF
  )

  tags = {
    Name    = "golden-image-builder"
    Purpose = "AMI-Build"
  }
}
```

## Step 2: Create an AMI from the Instance

```hcl
# Create an AMI from the builder instance
# AWS will stop the instance briefly, snapshot all volumes, then restart
resource "aws_ami_from_instance" "golden" {
  name               = "golden-image-${formatdate("YYYYMMDD", timestamp())}"
  source_instance_id = aws_instance.builder.id

  # If true, the source instance will not be rebooted
  # Leaving it false (default) ensures filesystem consistency
  snapshot_without_reboot = false

  tags = {
    Name        = "golden-image"
    BaseAMI     = data.aws_ami.amazon_linux.id
    BuildDate   = formatdate("YYYY-MM-DD", timestamp())
    Environment = var.environment
    Version     = var.image_version
  }

  depends_on = [aws_instance.builder]
}
```

## Step 3: Copy AMI to Other Regions

```hcl
# Copy the golden AMI to a disaster recovery region
resource "aws_ami_copy" "dr_region" {
  name              = "golden-image-dr-${formatdate("YYYYMMDD", timestamp())}"
  source_ami_id     = aws_ami_from_instance.golden.id
  source_ami_region = var.primary_region

  # Encrypt the copied AMI in the DR region
  encrypted  = true
  kms_key_id = var.dr_kms_key_arn

  tags = {
    Name       = "golden-image-dr"
    Source     = aws_ami_from_instance.golden.id
    SourceRegion = var.primary_region
  }
}
```

## Step 4: Share AMI with Other Accounts

```hcl
# Share the AMI with member accounts in your organization
resource "aws_ami_launch_permission" "share_dev" {
  image_id   = aws_ami_from_instance.golden.id
  account_id = var.dev_account_id
}

resource "aws_ami_launch_permission" "share_staging" {
  image_id   = aws_ami_from_instance.golden.id
  account_id = var.staging_account_id
}
```

## Step 5: Register AMI ID in SSM for Discovery

```hcl
# Store the AMI ID in SSM Parameter Store so other stacks can find it
resource "aws_ssm_parameter" "golden_ami_id" {
  name        = "/golden-images/${var.environment}/latest"
  type        = "String"
  value       = aws_ami_from_instance.golden.id
  description = "Latest golden AMI ID for ${var.environment}"

  tags = {
    Name = "golden-ami-ssm-param"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Creating AMIs from configured instances enables the golden image pattern where all new instances start from a hardened, pre-configured baseline. Store AMI IDs in SSM Parameter Store with consistent paths so downstream stacks can always reference the latest approved image. Automate this process in CI/CD pipelines triggered by security updates or software releases to keep your golden images current.
