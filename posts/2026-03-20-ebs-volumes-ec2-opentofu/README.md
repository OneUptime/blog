# How to Attach EBS Volumes to EC2 Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, EBS, Block Storage, Infrastructure as Code, Storage

Description: Learn how to create EBS volumes and attach them to EC2 instances using OpenTofu, including configuration of volume types, IOPS, and throughput for different workload requirements.

## Introduction

Amazon EBS (Elastic Block Store) provides persistent block storage for EC2 instances. Unlike instance store volumes, EBS volumes persist independently from the instance lifecycle. This guide covers creating and attaching data volumes with appropriate configurations for various workload types.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 and EBS permissions (and KMS permissions if you use a customer managed key)
- An existing EC2 instance or subnet

## Step 1: Launch an EC2 Instance

```hcl
variable "subnet_id" {
  type = string
}

variable "kms_key_arn" {
  type    = string
  default = null
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

resource "aws_instance" "database" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "m5.xlarge"
  subnet_id     = var.subnet_id

  # Root volume - OS disk
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 50
    iops                  = 3000
    throughput            = 125
    encrypted             = true
    delete_on_termination = true
  }

  tags = { Name = "database-instance" }
}
```

## Step 2: Create Additional EBS Volumes

```hcl
# High-performance io2 volume for database data files

resource "aws_ebs_volume" "database_data" {
  availability_zone = aws_instance.database.availability_zone
  type              = "io2"
  size              = 500   # 500 GiB
  iops              = 16000
  encrypted         = true
  kms_key_id        = var.kms_key_arn

  tags = {
    Name     = "database-data-volume"
    Instance = aws_instance.database.id
    Purpose  = "DatabaseData"
  }
}

# gp3 volume for database logs - cost-effective with good throughput
resource "aws_ebs_volume" "database_logs" {
  availability_zone = aws_instance.database.availability_zone
  type              = "gp3"
  size              = 200
  iops              = 3000
  throughput        = 250  # MiB/s, up to 1000 for gp3
  encrypted         = true

  tags = {
    Name    = "database-log-volume"
    Purpose = "DatabaseLogs"
  }
}

# st1 volume for backups - optimized for sequential throughput
resource "aws_ebs_volume" "database_backup" {
  availability_zone = aws_instance.database.availability_zone
  type              = "st1"  # Throughput-optimized HDD
  size              = 2000   # 2000 GiB for backup storage

  tags = {
    Name    = "database-backup-volume"
    Purpose = "Backups"
  }
}
```

## Step 3: Attach Volumes to the Instance

```hcl
# Attach the data volume as /dev/sdf
resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.database_data.id
  instance_id = aws_instance.database.id

  # Stop the instance to detach (set to false for hot-detach capable instances)
  stop_instance_before_detaching = false
}

resource "aws_volume_attachment" "logs" {
  device_name = "/dev/sdg"
  volume_id   = aws_ebs_volume.database_logs.id
  instance_id = aws_instance.database.id
}

resource "aws_volume_attachment" "backup" {
  device_name = "/dev/sdh"
  volume_id   = aws_ebs_volume.database_backup.id
  instance_id = aws_instance.database.id
}
```

## Step 4: Format and Mount After Attachment

On Nitro-based instances such as `m5.xlarge`, attached EBS volumes are exposed as NVMe devices inside the operating system, so identify the actual device names before formatting them.

```bash
# Identify the attached EBS volumes and their actual device names.
lsblk -o NAME,SIZE,SERIAL,MOUNTPOINT

# Replace the device names below with the actual unmounted EBS volumes from lsblk.
sudo mkfs -t xfs /dev/nvme1n1
sudo mkdir -p /data
sudo mount /dev/nvme1n1 /data
echo "UUID=$(sudo blkid -s UUID -o value /dev/nvme1n1) /data xfs defaults,nofail 0 2" | sudo tee -a /etc/fstab

sudo mkfs -t xfs /dev/nvme2n1
sudo mkdir -p /logs
sudo mount /dev/nvme2n1 /logs
echo "UUID=$(sudo blkid -s UUID -o value /dev/nvme2n1) /logs xfs defaults,nofail 0 2" | sudo tee -a /etc/fstab

sudo mkfs -t xfs /dev/nvme3n1
sudo mkdir -p /backup
sudo mount /dev/nvme3n1 /backup
echo "UUID=$(sudo blkid -s UUID -o value /dev/nvme3n1) /backup xfs defaults,nofail 0 2" | sudo tee -a /etc/fstab

sudo mount -a
```

## Step 5: Outputs

```hcl
output "data_volume_id" {
  value = aws_ebs_volume.database_data.id
}

output "data_volume_iops" {
  value = aws_ebs_volume.database_data.iops
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have attached multiple EBS volumes with appropriate types for different I/O patterns: io2 for high-IOPS database data, gp3 for balanced log storage, and st1 for high-throughput sequential backup workloads. Always encrypt EBS volumes containing sensitive data and use volume tags to track costs and ownership across your infrastructure.
