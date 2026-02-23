# How to Fix Missing Required Argument Error in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Configuration, HCL, DevOps

Description: How to fix the Missing Required Argument error in Terraform when your resource or provider blocks are missing mandatory configuration values.

---

You write a resource block, run `terraform plan`, and get:

```
Error: Missing required argument

on main.tf line 5, in resource "aws_instance" "web":
   5: resource "aws_instance" "web" {

The argument "ami" is required, but no definition was found.
```

This one is straightforward: a resource, data source, or provider block is missing a field that Terraform requires. But while the concept is simple, tracking down exactly what is missing (and why) can sometimes take a bit of investigation. Let us go through the common scenarios.

## The Basics: A Required Field Is Missing

Every Terraform resource has a set of required arguments. If you do not provide them, you get this error.

```hcl
# MISSING REQUIRED ARGUMENTS
resource "aws_instance" "web" {
  # Missing "ami" - required
  # Missing "instance_type" - required
  subnet_id = aws_subnet.private.id
}
```

**Fix**: Add the missing required arguments:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"  # Required
  instance_type = "t3.micro"              # Required
  subnet_id     = aws_subnet.private.id
}
```

How do you know which arguments are required? The provider documentation marks them:

- **Required** - You must provide this value
- **Optional** - You can omit this and a default will be used
- **Computed** - Terraform fills this in after creation

```bash
# Check the documentation for required fields
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
```

## Common Resource Missing Arguments

Here is a quick reference for frequently used resources and their required arguments:

```hcl
# AWS EC2 Instance - requires ami and instance_type
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}

# AWS S3 Bucket - requires bucket (or generates random name)
resource "aws_s3_bucket" "data" {
  bucket = "my-unique-bucket-name"
}

# AWS Security Group - requires nothing in the resource itself,
# but ingress/egress rules need from_port, to_port, protocol
resource "aws_security_group" "web" {
  name = "web-sg"

  ingress {
    from_port   = 443          # Required in the ingress block
    to_port     = 443          # Required
    protocol    = "tcp"        # Required
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# AWS RDS Instance - several required fields
resource "aws_db_instance" "main" {
  allocated_storage = 20                # Required
  engine            = "postgres"        # Required
  instance_class    = "db.t3.micro"     # Required
  username          = "admin"           # Required
  password          = var.db_password   # Required
}

# Azure Resource Group - requires name and location
resource "azurerm_resource_group" "example" {
  name     = "my-rg"           # Required
  location = "East US"         # Required
}

# GCP Compute Instance - requires name, machine_type, boot_disk, network_interface
resource "google_compute_instance" "web" {
  name         = "web-server"       # Required
  machine_type = "e2-medium"        # Required
  zone         = "us-central1-a"    # Required

  boot_disk {                       # Required block
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {               # Required block
    network = "default"
  }
}
```

## Missing Arguments in Provider Blocks

Providers also have required arguments:

```hcl
# Azure provider requires several fields
# WRONG - missing required arguments
provider "azurerm" {
  features {}
}

# RIGHT - specify required fields (or use environment variables)
provider "azurerm" {
  features {}

  subscription_id = var.subscription_id  # Required
  # client_id, client_secret, tenant_id can come from env vars
}
```

For AWS, the region is typically required (though it can come from environment variables):

```hcl
# This might fail if AWS_DEFAULT_REGION is not set
provider "aws" {}

# Explicit is better
provider "aws" {
  region = "us-east-1"
}
```

## Missing Arguments in Nested Blocks

Some required arguments are inside nested blocks, making them harder to spot:

```hcl
# WRONG - lifecycle_rule requires a status argument
resource "aws_s3_bucket_lifecycle_configuration" "example" {
  bucket = aws_s3_bucket.example.id

  rule {
    id = "archive"
    # Missing: status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

# RIGHT
resource "aws_s3_bucket_lifecycle_configuration" "example" {
  bucket = aws_s3_bucket.example.id

  rule {
    id     = "archive"
    status = "Enabled"  # Required field in the rule block

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}
```

## Conditionally Required Arguments

Some arguments are only required in certain situations. These are the tricky ones:

```hcl
# The "password" argument is required when "manage_master_user_password" is not set
resource "aws_db_instance" "main" {
  allocated_storage = 20
  engine            = "postgres"
  instance_class    = "db.t3.micro"
  username          = "admin"

  # You need EITHER password OR manage_master_user_password
  password                    = var.db_password
  # OR
  # manage_master_user_password = true
}
```

```hcl
# AWS Launch Template - certain blocks require specific sub-arguments
resource "aws_launch_template" "web" {
  name          = "web-template"
  image_id      = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  # If you include block_device_mappings, device_name is required
  block_device_mappings {
    device_name = "/dev/sda1"  # Required within this block

    ebs {
      volume_size = 20
    }
  }
}
```

## Missing Arguments in Modules

When calling a module, its input variables that do not have defaults are required:

```hcl
# modules/web-server/variables.tf
variable "instance_type" {
  type = string
  # No default - this is required
}

variable "environment" {
  type    = string
  default = "dev"  # Has a default - this is optional
}

variable "ami_id" {
  type = string
  # No default - this is required
}
```

```hcl
# WRONG - missing required module variables
module "web" {
  source        = "./modules/web-server"
  instance_type = "t3.micro"
  # Missing: ami_id
}

# RIGHT
module "web" {
  source        = "./modules/web-server"
  instance_type = "t3.micro"
  ami_id        = "ami-0123456789abcdef0"
}
```

## Using terraform validate

The `terraform validate` command catches missing required arguments without needing valid credentials or backend access:

```bash
# Quick validation - does not need provider credentials
terraform validate

# Output:
# Error: Missing required argument
#
# on main.tf line 5, in resource "aws_instance" "web":
#    5: resource "aws_instance" "web" {
#
# The argument "ami" is required, but no definition was found.
```

This is great for quick feedback during development without waiting for a full plan.

## Using Default Values to Avoid Missing Arguments

For your own modules, provide sensible defaults so callers do not have to specify everything:

```hcl
variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.micro"  # Sensible default
}

variable "volume_size" {
  type        = number
  description = "Root volume size in GB"
  default     = 20  # Sensible default
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  # No default - callers must specify this
  # This is intentional for values that should always be explicit

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

The "Missing required argument" error is one of the most straightforward Terraform errors to fix. The error message tells you exactly which argument is missing and where. Add the missing field, and you are good to go. When in doubt, the provider documentation lists every required and optional argument for each resource type.
