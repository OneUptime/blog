# How to Create FSx File Systems in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, FSx, Storage, File System, Infrastructure as Code

Description: A practical guide to provisioning Amazon FSx file systems with Terraform, covering FSx for Windows, Lustre, NetApp ONTAP, and OpenZFS configurations.

---

Amazon FSx provides fully managed file systems built on popular technologies like Windows File Server, Lustre, NetApp ONTAP, and OpenZFS. Each variant serves a different use case - from high-performance computing workloads to Windows-native file shares to multi-protocol enterprise storage.

Managing these file systems through Terraform gives you version-controlled, repeatable infrastructure. This guide covers how to create each FSx file system type with practical configurations you can adapt for your environment.

## Prerequisites

You will need:

- Terraform 1.0 or later
- AWS credentials with permissions for FSx, VPC, and related services
- A VPC with private subnets
- For FSx for Windows: an AWS Managed Microsoft AD or self-managed AD

## Provider Configuration

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
  region = "us-east-1"
}

# Common variables
variable "vpc_id" {
  description = "VPC ID for the file system"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the file system"
  type        = list(string)
}
```

## FSx for Windows File Server

FSx for Windows is the go-to choice when your applications need SMB protocol support, Windows ACLs, or integration with Active Directory.

```hcl
# Security group for FSx Windows
resource "aws_security_group" "fsx_windows" {
  name_prefix = "fsx-windows-"
  description = "Security group for FSx Windows file system"
  vpc_id      = var.vpc_id

  # SMB traffic
  ingress {
    from_port   = 445
    to_port     = 445
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Allow SMB access"
  }

  # DNS for AD integration
  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Allow DNS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fsx-windows-sg"
  }
}

# FSx for Windows File Server
resource "aws_fsx_windows_file_system" "main" {
  # Storage capacity in GB (minimum 32 for SSD, 2000 for HDD)
  storage_capacity = 200

  # SSD or HDD storage
  storage_type = "SSD"

  # Single-AZ or Multi-AZ deployment
  deployment_type = "SINGLE_AZ_2"

  # Throughput capacity in MB/s
  throughput_capacity = 32

  # Place in a subnet
  subnet_ids = [var.subnet_ids[0]]

  # Security groups
  security_group_ids = [aws_security_group.fsx_windows.id]

  # Active Directory configuration
  active_directory_id = var.directory_id

  # Automated backup settings
  automatic_backup_retention_days = 7
  daily_automatic_backup_start_time = "02:00"

  # Maintenance window (UTC)
  weekly_maintenance_start_time = "7:01:00:00"

  # Enable data deduplication to save storage
  aliases = ["fsx.example.com"]

  tags = {
    Name        = "windows-file-server"
    Environment = "production"
  }
}

variable "directory_id" {
  description = "AWS Managed AD directory ID"
  type        = string
}

output "windows_fs_dns_name" {
  description = "DNS name for mounting the Windows file system"
  value       = aws_fsx_windows_file_system.main.dns_name
}
```

## FSx for Lustre

Lustre is designed for high-performance computing, machine learning training, and media processing workloads where throughput matters more than anything else.

```hcl
# Security group for Lustre
resource "aws_security_group" "fsx_lustre" {
  name_prefix = "fsx-lustre-"
  description = "Security group for FSx Lustre file system"
  vpc_id      = var.vpc_id

  # Lustre client traffic
  ingress {
    from_port   = 988
    to_port     = 988
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Lustre client traffic"
  }

  # Lustre traffic between nodes
  ingress {
    from_port   = 1021
    to_port     = 1023
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Lustre inter-node traffic"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fsx-lustre-sg"
  }
}

# FSx for Lustre - persistent file system
resource "aws_fsx_lustre_file_system" "hpc" {
  # Storage in GB - must be in increments of 1200 for SCRATCH_2/PERSISTENT_1
  storage_capacity = 2400

  # Subnet for the file system
  subnet_ids = [var.subnet_ids[0]]

  security_group_ids = [aws_security_group.fsx_lustre.id]

  # SCRATCH_1, SCRATCH_2, PERSISTENT_1, or PERSISTENT_2
  deployment_type = "PERSISTENT_2"

  # Per-unit storage throughput (MB/s/TiB)
  # Valid values depend on deployment type
  per_unit_storage_throughput = 125

  # Optional S3 data repository integration
  import_path = "s3://${var.data_bucket}"
  export_path = "s3://${var.data_bucket}/export"

  # Auto-import policy for new/changed/deleted objects
  auto_import_policy = "NEW_CHANGED_DELETED"

  # Enable compression to reduce storage costs
  data_compression_type = "LZ4"

  tags = {
    Name     = "lustre-hpc-cluster"
    Workload = "machine-learning"
  }
}

variable "data_bucket" {
  description = "S3 bucket name for Lustre data repository"
  type        = string
  default     = "my-hpc-data-bucket"
}

output "lustre_mount_name" {
  description = "Mount name for the Lustre file system"
  value       = aws_fsx_lustre_file_system.hpc.mount_name
}

output "lustre_dns_name" {
  description = "DNS name for mounting Lustre"
  value       = aws_fsx_lustre_file_system.hpc.dns_name
}
```

## FSx for NetApp ONTAP

ONTAP provides multi-protocol access (NFS, SMB, iSCSI) and advanced data management features like snapshots, cloning, and tiering.

```hcl
# FSx ONTAP file system
resource "aws_fsx_ontap_file_system" "enterprise" {
  # SSD storage capacity in GB
  storage_capacity = 1024

  # Multi-AZ for production
  deployment_type = "MULTI_AZ_1"

  # Throughput in MB/s
  throughput_capacity = 512

  # Primary and standby subnets for Multi-AZ
  preferred_subnet_id = var.subnet_ids[0]
  subnet_ids          = var.subnet_ids

  # Endpoint IP address range for management
  endpoint_ip_address_range = "198.19.255.0/24"

  # Weekly maintenance window
  weekly_maintenance_start_time = "7:02:00:00"

  # Automatic backups
  automatic_backup_retention_days   = 30
  daily_automatic_backup_start_time = "03:00"

  # Route table IDs for Multi-AZ to enable failover routing
  route_table_ids = var.route_table_ids

  tags = {
    Name        = "ontap-enterprise"
    Environment = "production"
  }
}

# Create a storage virtual machine (SVM)
resource "aws_fsx_ontap_storage_virtual_machine" "main" {
  file_system_id = aws_fsx_ontap_file_system.enterprise.id
  name           = "svm-prod"

  tags = {
    Name = "svm-production"
  }
}

# Create a volume on the SVM
resource "aws_fsx_ontap_volume" "app_data" {
  name                       = "app_data"
  junction_path              = "/app_data"
  size_in_megabytes          = 51200
  storage_virtual_machine_id = aws_fsx_ontap_storage_virtual_machine.main.id

  # Enable storage efficiency
  storage_efficiency_enabled = true

  # Tiering policy - move cold data to capacity pool
  tiering_policy {
    name           = "AUTO"
    cooling_period = 31
  }

  # Snapshot policy
  snapshot_policy = "default"

  tags = {
    Name = "app-data-volume"
  }
}

variable "route_table_ids" {
  description = "Route table IDs for ONTAP Multi-AZ routing"
  type        = list(string)
  default     = []
}
```

## FSx for OpenZFS

OpenZFS is a good fit for Linux workloads that need NFS access with features like snapshots, compression, and data integrity checks.

```hcl
# FSx for OpenZFS file system
resource "aws_fsx_openzfs_file_system" "data_lake" {
  # SSD storage in GB
  storage_capacity = 512

  # Single or Multi-AZ
  deployment_type = "SINGLE_AZ_1"

  # Throughput capacity in MB/s
  throughput_capacity = 160

  # Subnet placement
  subnet_ids = [var.subnet_ids[0]]

  # Root volume configuration
  root_volume_configuration {
    # NFS export settings
    nfs_exports {
      client_configurations {
        clients = "10.0.0.0/8"
        options = ["rw", "crossmnt", "no_root_squash"]
      }
    }

    # Enable data compression on the root volume
    data_compression_type = "ZSTD"

    # Read-only setting
    read_only = false

    # Record size in KB
    record_size_kib = 128
  }

  # Automatic backups
  automatic_backup_retention_days = 7

  tags = {
    Name = "openzfs-data-lake"
  }
}

# Create a child volume
resource "aws_fsx_openzfs_volume" "datasets" {
  name             = "datasets"
  parent_volume_id = aws_fsx_openzfs_file_system.data_lake.root_volume_id

  # Volume-specific compression
  data_compression_type = "ZSTD"

  # NFS export configuration
  nfs_exports {
    client_configurations {
      clients = "10.0.0.0/8"
      options = ["rw", "no_root_squash"]
    }
  }

  # User and group quotas
  user_and_group_quotas {
    id                         = 1000
    storage_capacity_quota_gib = 100
    type                       = "USER"
  }

  tags = {
    Name = "datasets-volume"
  }
}
```

## Monitoring FSx Performance

File system performance issues can directly impact your applications. Use OneUptime to set up monitoring for throughput, IOPS, and latency metrics on your FSx file systems. Catching bottlenecks early prevents them from becoming user-facing problems.

For audit logging of file system access, check out how to set up CloudTrail at https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudtrail-trails-in-terraform/view.

## Common Pitfalls

A few things that trip people up when working with FSx in Terraform:

- Storage capacity values have minimum and increment requirements that vary by file system type. Check the AWS docs for your specific variant.
- Changing certain attributes like `deployment_type` or `storage_type` forces a replacement of the entire file system. Always check the Terraform plan before applying.
- Multi-AZ deployments for ONTAP require route tables for automatic failover. Forgetting to pass route table IDs means failover routing will not work.
- Lustre scratch file systems are temporary by design. If the underlying hardware fails, your data is gone. Use persistent deployment types for data that matters.

## Summary

Amazon FSx gives you four distinct file system technologies, each optimized for different workloads. Terraform makes it practical to manage these file systems alongside the rest of your infrastructure. Start with the variant that matches your protocol and performance requirements, and use the examples above as a starting point for your configuration.
