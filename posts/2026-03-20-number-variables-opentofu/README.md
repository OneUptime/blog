# How to Use Number Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Number, HCL, Infrastructure as Code, DevOps

Description: A guide to declaring and using number type variables in OpenTofu for counts, sizes, and numeric configuration values.

## Introduction

Number variables in OpenTofu hold numeric values - both integers and floating-point numbers. They are used for counts, sizes, ports, timeouts, and other numeric configuration values.

## Declaring Number Variables

```hcl
# Basic number variable

variable "instance_count" {
  type = number
}

# Number with default
variable "disk_size_gb" {
  type    = number
  default = 20
}

# Number with validation
variable "port" {
  type        = number
  description = "Application port number"
  default     = 8080

  validation {
    condition     = var.port >= 1024 && var.port <= 65535
    error_message = "Port must be between 1024 and 65535 (non-privileged ports)."
  }
}

variable "instance_count" {
  type        = number
  description = "Number of instances to create"
  default     = 2

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 20
    error_message = "Instance count must be between 1 and 20."
  }
}
```

## Using Numbers in Configurations

```hcl
variable "instance_count" {
  type    = number
  default = 2
}

variable "disk_size_gb" {
  type    = number
  default = 20
}

resource "aws_instance" "web" {
  count         = var.instance_count  # Number used for count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  root_block_device {
    volume_size = var.disk_size_gb  # Number for disk size
  }
}

resource "aws_autoscaling_group" "web" {
  min_size         = var.min_capacity
  max_size         = var.max_capacity
  desired_capacity = var.desired_capacity
}
```

## Arithmetic with Number Variables

```hcl
variable "base_capacity" {
  type    = number
  default = 2
}

locals {
  # Arithmetic operations
  double_capacity = var.base_capacity * 2
  half_capacity   = var.base_capacity / 2
  plus_spare      = var.base_capacity + 1

  # Ceiling and floor
  rounded_up   = ceil(var.base_capacity / 3.0)
  rounded_down = floor(var.base_capacity / 3.0)

  # Absolute value
  abs_value = abs(-5)

  # Min/max
  min_value = min(var.base_capacity, 10)
  max_value = max(var.base_capacity, 1)
}
```

## Number Variables for AWS Resource Sizing

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

variable "rds_storage_gb" {
  type        = number
  description = "RDS allocated storage in GB"
  default     = 20

  validation {
    condition     = var.rds_storage_gb >= 20 && var.rds_storage_gb <= 65536
    error_message = "RDS storage must be between 20 and 65536 GB."
  }
}

variable "rds_backup_retention_days" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 7

  validation {
    condition     = var.rds_backup_retention_days >= 0 && var.rds_backup_retention_days <= 35
    error_message = "Backup retention must be between 0 and 35 days."
  }
}

resource "aws_db_instance" "main" {
  allocated_storage       = var.rds_storage_gb
  backup_retention_period = var.rds_backup_retention_days
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = "db.t3.micro"
  db_name                 = "myapp"
  username                = "admin"
  password                = var.db_password
}
```

## Integer vs Float

```hcl
locals {
  # OpenTofu numbers are arbitrary-precision floating-point internally
  integer_value = 42
  float_value   = 3.14

  # Use tostring() to convert to string when needed
  count_string = tostring(var.instance_count)

  # Use tonumber() to convert string to number
  from_string = tonumber("42")
}
```

## Conclusion

Number variables in OpenTofu handle counts, capacities, sizes, and numeric configurations. Using type constraints and validation rules for numbers prevents invalid values like negative counts or out-of-range ports. Arithmetic operations on number variables enable dynamic sizing based on environment or other computed values, making your infrastructure scale appropriately with simple variable changes.
