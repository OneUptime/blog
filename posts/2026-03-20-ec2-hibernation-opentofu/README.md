# How to Configure EC2 Hibernation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, Hibernation, Cost Optimization, Infrastructure as Code, Storage

Description: Learn how to enable EC2 instance hibernation using OpenTofu so instances can save their in-memory state to EBS and resume quickly without a full boot process.

## Introduction

EC2 hibernation saves the instance RAM contents to the root EBS volume, allowing instances to resume where they left off. This is useful for long-running processes, development environments, and workloads that benefit from pre-warmed caches while avoiding continuous compute costs.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 permissions
- Hibernation must be enabled at launch; you cannot turn it on for an existing instance
- The AMI must support hibernation
- Root EBS volume must be large enough to store RAM contents and expected OS/application usage
- Instance family must support hibernation for the exact instance type you choose

## Step 1: Enable Hibernation on an EC2 Instance

```hcl
resource "aws_instance" "hibernatable" {
  ami           = data.aws_ami.amazon_linux.id  # Must be an HVM AMI that supports hibernation
  instance_type = "t3.medium"  # Verify that this instance type supports hibernation
  subnet_id     = var.subnet_id

  # Hibernation requires an encrypted EBS root volume
  root_block_device {
    volume_type           = "gp3"
    # Volume size must be large enough for RAM contents plus OS/application usage
    # t3.medium has 4 GiB RAM, so 30 GiB provides ample headroom for a typical setup
    volume_size           = 30
    encrypted             = true  # Explicitly satisfies the encryption prerequisite
    delete_on_termination = true
  }

  # Must be enabled when the instance is launched
  hibernation = true

  # IMDSv2 enforced for security
  metadata_options {
    http_tokens = "required"
  }

  tags = {
    Name          = "hibernatable-instance"
    Hibernation   = "enabled"
    Environment   = var.environment
  }
}
```

## Step 2: Use Hibernation with a Launch Template

```hcl
# Launch template with hibernation enabled for instances launched from the template

# Note: Do not rely on hibernation for instances managed by an Auto Scaling group.
# Auto Scaling can mark a hibernated instance unhealthy and replace it.
resource "aws_launch_template" "hibernate" {
  name          = "hibernate-launch-template"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "m5.large"

  # Hibernation requires an encrypted root volume, and the device name
  # must match the AMI root device name
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 40
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  hibernation_options {
    configured = true
  }

  metadata_options {
    http_tokens = "required"
  }

  tags = { Name = "hibernate-template" }
}
```

## Step 3: Hibernate and Resume via AWS CLI

```bash
# Hibernate a running instance
aws ec2 stop-instances \
  --instance-ids i-0123456789abcdef0 \
  --hibernate \
  --region us-east-1

# Check whether hibernation was initiated
aws ec2 describe-instances \
  --instance-ids i-0123456789abcdef0 \
  --query 'Reservations[0].Instances[0].StateReason.Code' \
  --output text \
  --region us-east-1

# Start the instance (resumes from hibernate)
aws ec2 start-instances \
  --instance-ids i-0123456789abcdef0 \
  --region us-east-1
```

## Step 4: Verify Hibernation Prerequisites

```hcl
# Estimate a root volume size that leaves headroom beyond instance RAM
locals {
  # Example map of selected instance types to RAM sizes (GiB)
  instance_ram = {
    "t3.medium"  = 4
    "t3.large"   = 8
    "m5.large"   = 8
    "m5.xlarge"  = 16
    "m5.2xlarge" = 32
  }

  # AWS requires enough room for RAM contents plus expected OS/application usage
  recommended_root_size = local.instance_ram[var.instance_type] + 10
}

output "recommended_root_volume_size" {
  description = "Example EBS root volume size target for hibernation"
  value       = "${local.recommended_root_size} GiB"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EC2 hibernation is a powerful feature for workloads with long initialization times or pre-warmed caches. The instance can often resume more quickly than a full boot because its memory state is restored. Remember that AWS does not support keeping an instance hibernated for more than 60 days, and hibernation is not supported for bare metal instances or Linux instances with 150 GiB or more of RAM.
