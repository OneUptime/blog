# How to Configure the Alibaba Cloud Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Alibaba Cloud, Aliyun, Infrastructure as Code, IaC, Cloud Provider

Description: Learn how to configure the Alibaba Cloud provider in OpenTofu to manage ECS, RDS, and OSS resources.

## Introduction

This guide covers how to configure the Alibaba Cloud provider in OpenTofu using practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- Alibaba Cloud AccessKey credentials or a RAM role with permissions for ECS, RDS, and OSS
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.277.0"
    }
  }
}

provider "alicloud" {
  region = var.region
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export ALICLOUD_ACCESS_KEY="your-access-key-id"
export ALICLOUD_SECRET_KEY="your-access-key-secret"
export ALICLOUD_REGION="cn-hangzhou"

# Optional when using temporary STS credentials
# export ALICLOUD_SECURITY_TOKEN="your-sts-token"
```

```hcl
variable "region" {
  description = "Alibaba Cloud region"
  type        = string
  default     = "cn-hangzhou"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "instance_type" {
  description = "ECS instance type"
  type        = string
  default     = "ecs.e-c1m1.large"
}

variable "bucket_name" {
  description = "Globally unique OSS bucket name"
  type        = string
}

variable "ecs_password" {
  description = "Login password for the ECS instance"
  type        = string
  sensitive   = true
}
```

## Step 3: Create Basic Resources

```hcl
data "alicloud_zones" "main" {
  available_instance_type     = var.instance_type
  available_resource_creation = "VSwitch"
  available_disk_category     = "cloud_essd"
}

resource "alicloud_vpc" "main" {
  vpc_name   = "${var.environment}-vpc"
  cidr_block = "172.16.0.0/16"
}

resource "alicloud_vswitch" "main" {
  vpc_id       = alicloud_vpc.main.id
  cidr_block   = "172.16.0.0/24"
  zone_id      = data.alicloud_zones.main.zones[0].id
  vswitch_name = "${var.environment}-vswitch"
}

resource "alicloud_security_group" "main" {
  security_group_name = "${var.environment}-sg"
  vpc_id              = alicloud_vpc.main.id
}

resource "alicloud_security_group_rule" "ssh" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "22/22"
  priority          = 1
  security_group_id = alicloud_security_group.main.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_oss_bucket" "main" {
  bucket = var.bucket_name

  lifecycle {
    ignore_changes = [acl]
  }
}

resource "alicloud_oss_bucket_acl" "main" {
  bucket = alicloud_oss_bucket.main.bucket
  acl    = "private"
}
```

## Step 4: Configure Advanced Settings

```hcl
data "alicloud_images" "main" {
  owners      = "system"
  most_recent = true
  name_regex  = "^ubuntu_[0-9]+_[0-9]+_x64.*"
}

data "alicloud_db_instance_classes" "main" {
  zone_id                  = data.alicloud_zones.main.zones[0].id
  engine                   = "MySQL"
  engine_version           = "8.0"
  category                 = "Basic"
  db_instance_storage_type = "cloud_essd"
  instance_charge_type     = "PostPaid"
}

resource "alicloud_instance" "main" {
  availability_zone          = data.alicloud_zones.main.zones[0].id
  security_groups            = [alicloud_security_group.main.id]
  instance_type              = var.instance_type
  instance_charge_type       = "PostPaid"
  internet_charge_type       = "PayByTraffic"
  system_disk_category       = "cloud_essd"
  image_id                   = data.alicloud_images.main.images[0].id
  instance_name              = "${var.environment}-ecs"
  vswitch_id                 = alicloud_vswitch.main.id
  internet_max_bandwidth_out = 10
  password                   = var.ecs_password
}

resource "alicloud_db_instance" "main" {
  engine                   = "MySQL"
  engine_version           = "8.0"
  instance_type            = data.alicloud_db_instance_classes.main.instance_classes[0].instance_class
  instance_storage         = data.alicloud_db_instance_classes.main.instance_classes[0].storage_range.min
  instance_charge_type     = "Postpaid"
  instance_name            = "${var.environment}-rds"
  vswitch_id               = alicloud_vswitch.main.id
  monitoring_period        = "60"
  db_instance_storage_type = "cloud_essd"
  security_group_ids       = [alicloud_security_group.main.id]
}

resource "alicloud_db_backup_policy" "main" {
  instance_id             = alicloud_db_instance.main.id
  preferred_backup_period = ["Monday", "Wednesday", "Friday"]
  preferred_backup_time   = "02:00Z-03:00Z"
  backup_retention_period = 30
}
```

## Step 5: Define Outputs

```hcl
output "ecs_instance_id" {
  description = "The ID of the ECS instance"
  value       = alicloud_instance.main.id
}

output "rds_instance_id" {
  description = "The ID of the RDS instance"
  value       = alicloud_db_instance.main.id
}

output "oss_bucket_name" {
  description = "The name of the OSS bucket"
  value       = alicloud_oss_bucket.main.bucket
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify that your AccessKey pair or RAM role has the required permissions, and check that `ALICLOUD_ACCESS_KEY`, `ALICLOUD_SECRET_KEY`, and `ALICLOUD_REGION` are set correctly.

### Rate Limiting
If Alibaba Cloud API throttling occurs during apply, reduce concurrency with `tofu apply -parallelism=1` instead of adding unnecessary `depends_on` blocks.

### Provider Version Conflicts
Pin the provider source to `aliyun/alicloud` and use a version constraint to keep deployments reproducible.

## Conclusion

You have successfully configured the Alibaba Cloud provider in OpenTofu. This setup lets you manage Alibaba Cloud resources such as ECS, RDS, and OSS as code, helping you keep infrastructure consistent and repeatable across environments. Always use environment variables, RAM roles, or other secure secret stores for sensitive credentials.
