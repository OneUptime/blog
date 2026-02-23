# How to Use Data Sources for Dynamic AMI Lookup in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AMI, AWS, Data Sources, EC2, Infrastructure as Code

Description: Learn how to use the aws_ami data source in Terraform to dynamically look up AMI IDs by filters, owners, and naming conventions instead of hardcoding image identifiers.

---

Hardcoding AMI IDs in Terraform configurations is a maintenance headache. AMI IDs are region-specific, change with every update, and mean nothing without context. When Canonical releases a new Ubuntu image or your team publishes an updated application AMI, you have to manually update the ID everywhere it is referenced. Dynamic AMI lookup with the `aws_ami` data source eliminates this problem by finding the right AMI at plan time based on filters you define.

## The Problem with Hardcoded AMIs

```hcl
# Don't do this
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"  # What is this? Which OS? Which version?
  instance_type = "t3.medium"
}
```

This AMI ID tells you nothing. It is region-specific, so it breaks if you deploy to a different region. It is a point-in-time snapshot, so it does not get security updates. And when you need to update it, you have to look up the new ID manually.

## Basic Dynamic Lookup

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical's AWS account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  tags = {
    Name     = "web-server"
    AMI_Name = data.aws_ami.ubuntu.name  # Track which AMI is in use
  }
}
```

Every time you run `terraform plan`, this finds the latest Ubuntu 22.04 AMI. When Canonical publishes updates, your next apply picks up the new image.

## Understanding the Key Arguments

### owners

The `owners` argument restricts which AWS accounts' AMIs are searched. This is critical for security - without it, anyone could publish a malicious AMI matching your filters.

```hcl
# Common owner IDs
# 099720109477 - Canonical (Ubuntu)
# 137112412989 - Amazon (Amazon Linux)
# 125523088429 - CentOS
# 309956199498 - Red Hat
# "self"       - Your own account
# "amazon"     - AWS Marketplace

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["137112412989"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}
```

### most_recent

When multiple AMIs match your filters, `most_recent = true` picks the one with the latest creation date. Without this, Terraform fails if multiple matches exist.

### name_regex

An alternative to the name filter, `name_regex` supports full regular expressions:

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]
  name_regex  = "^app-server-v[0-9]+-[0-9]{8}$"
}
```

## Common AMI Lookup Patterns

### Latest Ubuntu LTS

```hcl
data "aws_ami" "ubuntu_2404" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}
```

### Latest Amazon Linux 2023

```hcl
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}
```

### Latest Amazon Linux 2023 for ARM (Graviton)

```hcl
data "aws_ami" "al2023_arm" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}
```

### Latest Windows Server

```hcl
data "aws_ami" "windows_2022" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["Windows_Server-2022-English-Full-Base-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
```

### Custom Application AMI

When your team builds AMIs with Packer:

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-server-*"]
  }

  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }

  filter {
    name   = "tag:Application"
    values = ["web-app"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}
```

### Specific Version with Fallback

```hcl
# Try to find a specific version first
data "aws_ami" "app_specific" {
  count       = var.app_ami_version != "" ? 1 : 0
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-server-v${var.app_ami_version}-*"]
  }
}

# Fall back to latest if no specific version requested
data "aws_ami" "app_latest" {
  count       = var.app_ami_version == "" ? 1 : 0
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-server-*"]
  }
}

locals {
  ami_id = var.app_ami_version != "" ? data.aws_ami.app_specific[0].id : data.aws_ami.app_latest[0].id
}
```

## Multi-Architecture Support

If you support both x86 and ARM (Graviton) instances:

```hcl
variable "architecture" {
  description = "CPU architecture: x86_64 or arm64"
  type        = string
  default     = "x86_64"

  validation {
    condition     = contains(["x86_64", "arm64"], var.architecture)
    error_message = "Architecture must be x86_64 or arm64."
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-${var.architecture == "arm64" ? "arm64" : "amd64"}-server-*"]
  }

  filter {
    name   = "architecture"
    values = [var.architecture]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.architecture == "arm64" ? "t4g.medium" : "t3.medium"
}
```

## Multi-Region AMI Lookup

AMI IDs are region-specific, but the same AMI often exists in multiple regions with different IDs. Data source lookups automatically use the correct region based on your provider configuration.

```hcl
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

data "aws_ami" "ubuntu_us" {
  provider    = aws.us_east
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

data "aws_ami" "ubuntu_eu" {
  provider    = aws.eu_west
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}
```

## Useful AMI Attributes

The `aws_ami` data source returns many useful attributes beyond just the ID:

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-server-*"]
  }
}

output "ami_details" {
  value = {
    id            = data.aws_ami.app.id
    name          = data.aws_ami.app.name
    creation_date = data.aws_ami.app.creation_date
    architecture  = data.aws_ami.app.architecture
    root_device   = data.aws_ami.app.root_device_name
    description   = data.aws_ami.app.description
  }
}
```

## AMI Lookup in Modules

When building reusable modules, let callers either provide an AMI ID or use a dynamic lookup:

```hcl
variable "ami_id" {
  description = "Specific AMI ID. If empty, the latest matching AMI is used."
  type        = string
  default     = ""
}

variable "ami_name_pattern" {
  description = "AMI name pattern for dynamic lookup"
  type        = string
  default     = "app-server-*"
}

data "aws_ami" "dynamic" {
  count       = var.ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = [var.ami_name_pattern]
  }
}

locals {
  ami_id = var.ami_id != "" ? var.ami_id : data.aws_ami.dynamic[0].id
}

resource "aws_instance" "app" {
  ami           = local.ami_id
  instance_type = var.instance_type
}
```

## Protecting Against Unwanted AMI Changes

Dynamic AMI lookup means your infrastructure could change on any apply if a new AMI is published. To prevent this, use `ignore_changes`:

```hcl
resource "aws_instance" "production" {
  ami           = data.aws_ami.app.id
  instance_type = "t3.medium"

  lifecycle {
    # Don't replace the instance when a new AMI is available
    # Manually update by removing this and running apply
    ignore_changes = [ami]
  }
}
```

Or pin to a specific version in the filter rather than using wildcards.

## Summary

Dynamic AMI lookup replaces fragile hardcoded IDs with descriptive, portable queries. Use the `owners` argument for security, `most_recent` for automatic updates, and filters for precise matching. Build your AMI naming conventions to support clean filter patterns, and consider `ignore_changes` for production instances where you want controlled updates.

For more on data source filters, see our post on [using data sources with filters](https://oneuptime.com/blog/post/2026-02-23-terraform-data-sources-filters/view). For other dynamic lookups, check out [availability zone discovery](https://oneuptime.com/blog/post/2026-02-23-terraform-availability-zone-discovery/view).
