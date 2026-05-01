# How to Create EC2 Dedicated Hosts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, Dedicated Hosts, Compliance, BYOL, Infrastructure as Code

Description: Learn how to allocate and manage EC2 Dedicated Hosts with OpenTofu to support BYOL licensing, compliance requirements, and workloads that need dedicated physical servers.

## Introduction

EC2 Dedicated Hosts are physical servers fully dedicated to your use. They enable you to use your existing software licenses (BYOL) that have server-bound licensing requirements and help meet compliance needs that mandate physical isolation. This guide covers allocating and using Dedicated Hosts with OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 permissions
- An existing VPC and a subnet in the same Availability Zone as the Dedicated Host

## Step 1: Allocate a Dedicated Host

```hcl
# Allocate a dedicated physical host for c5 instances

resource "aws_ec2_host" "dedicated" {
  instance_family   = "c5"         # Instance family supported on this host
  availability_zone = "us-east-1a"

  # auto_placement allows untargeted host-tenancy launches
  # that match this host's configuration
  auto_placement = "on"

  # host_recovery can recover supported running instances
  # onto replacement hardware if the host fails
  host_recovery = "on"

  tags = {
    Name        = "dedicated-host-c5"
    Compliance  = "PCI-DSS"
    LicenseType = "BYOL"
  }
}
```

## Step 2: Launch Instances on the Dedicated Host

```hcl
variable "subnet_id" {
  description = "Subnet ID in the same Availability Zone as the Dedicated Host"
  type        = string
}

variable "windows_byol_ami_id" {
  description = "AMI ID for your eligible Windows Server 2019-or-earlier BYOL image"
  type        = string
}

# Launch an instance specifically on the allocated dedicated host
resource "aws_instance" "byol_server" {
  ami           = var.windows_byol_ami_id
  instance_type = "c5.2xlarge"

  # Place instance on the specific dedicated host
  host_id = aws_ec2_host.dedicated.id

  # Tenancy must be "host" for dedicated host placement
  tenancy = "host"

  subnet_id = var.subnet_id

  root_block_device {
    volume_type = "gp3"
    volume_size = 100
    encrypted   = true
  }

  tags = {
    Name    = "byol-windows-server"
    License = "Windows-Server-BYOL"
  }
}
```

## Step 3: Use Dedicated Tenancy (Instance-Level)

```hcl
variable "amazon_linux_ami_id" {
  description = "AMI ID for the Amazon Linux dedicated instance"
  type        = string
}

# Alternative: dedicated instance (not dedicated host)
# The instance runs on hardware dedicated to one customer
# but you don't have visibility into the specific host
resource "aws_instance" "dedicated_instance" {
  ami           = var.amazon_linux_ami_id
  instance_type = "m5.xlarge"
  subnet_id     = var.subnet_id

  # "dedicated" reserves physical hardware without specific host assignment
  tenancy = "dedicated"

  tags = { Name = "dedicated-instance" }
}
```

## Step 4: Create a License Manager License Configuration

```hcl
# Optional: track Dedicated Host BYOL usage with License Manager
resource "aws_licensemanager_license_configuration" "windows" {
  name                     = "windows-server-licenses"
  description              = "Windows Server 2019-or-earlier BYOL licenses on Dedicated Hosts"
  license_counting_type    = "Core"
  license_count            = 100
  license_count_hard_limit = true
  license_rules            = ["#allowedTenancy=EC2-DedicatedHost"]

  tags = { Name = "windows-byol-config" }
}
```

## Step 5: Outputs

```hcl
data "aws_ec2_host" "dedicated" {
  host_id = aws_ec2_host.dedicated.id
}

output "dedicated_host_id" {
  description = "ID of the allocated dedicated host"
  value       = aws_ec2_host.dedicated.id
}

output "dedicated_host_arn" {
  description = "ARN of the dedicated host"
  value       = aws_ec2_host.dedicated.arn
}

output "total_vcpus" {
  description = "Total vCPUs on the dedicated host"
  value       = data.aws_ec2_host.dedicated.total_vcpus
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EC2 Dedicated Hosts provide physical server isolation for compliance and BYOL licensing scenarios. The host_recovery feature can automatically recover supported running instances on replacement hardware if the physical host fails. Be mindful of costs-dedicated hosts are billed per host-hour regardless of whether instances are running on them.
