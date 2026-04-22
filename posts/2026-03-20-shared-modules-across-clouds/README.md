# How to Share OpenTofu Modules Across Cloud Providers - Clouds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Multi-Cloud, Module Registry, Reusability, Infrastructure as Code

Description: Learn how to design and publish reusable OpenTofu modules that work across multiple cloud providers - using a private module registry, consistent interfaces, and versioning for shared...

## Introduction

Shared modules encode organizational best practices once and reuse them across teams and cloud providers. A `compute-instance` module, for example, enforces security defaults, required tags, and naming conventions regardless of whether it's creating an EC2 instance, Azure VM, or GCP compute instance.

## Module Structure for Multi-Cloud Sharing

```text
modules/
  compute-instance/
    aws/
      main.tf
      variables.tf   # Shared interface
      outputs.tf     # Shared outputs
    azure/
      main.tf
      variables.tf   # Same interface
      outputs.tf     # Same outputs
    gcp/
      main.tf
      variables.tf   # Same interface
      outputs.tf     # Same outputs
```

## Shared Variable Interface

All cloud-specific submodules use the same variable contract:

```hcl
# modules/compute-instance/aws/variables.tf

# (Same in azure/ and gcp/)
variable "name"        { type = string }
variable "environment" { type = string }
variable "size" {
  type = string
  validation {
    condition     = contains(["small", "medium", "large", "xlarge"], var.size)
    error_message = "Size must be: small, medium, large, or xlarge."
  }
}
variable "subnet_id"   { type = string }
variable "tags" {
  type    = map(string)
  default = {}
}
```

## AWS Implementation

```hcl
# modules/compute-instance/aws/main.tf
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  instance_type_map = {
    small  = "t3.small"
    medium = "t3.medium"
    large  = "t3.large"
    xlarge = "t3.xlarge"
  }
  common_tags = merge(var.tags, {
    Name        = "${var.environment}-${var.name}"
    Environment = var.environment
    ManagedBy   = "opentofu"
  })
}

resource "aws_instance" "this" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = local.instance_type_map[var.size]
  subnet_id     = var.subnet_id

  # Enforce encryption - organization standard
  root_block_device {
    encrypted   = true
    volume_type = "gp3"
  }

  # Enforce IMDSv2
  metadata_options {
    http_tokens = "required"
  }

  tags = local.common_tags
}

output "instance_id"  { value = aws_instance.this.id }
output "private_ip"   { value = aws_instance.this.private_ip }
output "instance_name" { value = local.common_tags["Name"] }
```

## Publishing to a Private Module Registry

For a private registry-compatible server (like GitLab), follow that registry's publishing requirements. Registry-style module repositories commonly use the naming convention `terraform-<provider>-<name>`:

```bash
# Repository naming convention
# github.com/my-org/terraform-aws-compute-instance
# github.com/my-org/terraform-azurerm-compute-instance
# github.com/my-org/terraform-google-compute-instance

# Tag versions for registry consumption
git tag 1.0.0
git push origin 1.0.0
```

## Using Shared Modules from Git

```hcl
# Reference AWS module by Git tag
module "app_server" {
  source = "git::https://github.com/my-org/terraform-aws-compute-instance.git?ref=1.2.0"

  name        = "app-server"
  environment = var.environment
  size        = "medium"
  subnet_id   = module.vpc.private_subnet_id
  tags = {
    Team    = "platform"
    Service = "api"
  }
}
```

## Using from Private Registry

```hcl
# Consume from organization's private module registry
module "app_server" {
  source  = "app.terraform.io/my-org/compute-instance/aws"
  version = "~> 1.2"

  name        = "app-server"
  environment = var.environment
  size        = "medium"
  subnet_id   = module.vpc.private_subnet_id
}
```

## Module Versioning with CHANGELOG

Maintain backward compatibility with semantic versioning:

```text
# CHANGELOG.md for terraform-aws-compute-instance

## [2.0.0] - 2026-01-15
### BREAKING CHANGES
- Removed `instance_type` variable - use `size` instead

## [1.2.0] - 2025-11-01
### Added
- `xlarge` size option
- `enable_monitoring` variable

## [1.1.0] - 2025-09-15
### Added
- Enforce IMDSv2 by default
```

## Testing Shared Modules with Terratest

```go
// test/compute_instance_test.go
func TestComputeInstanceModule(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir:    "../modules/compute-instance/aws",
        TerraformBinary: "tofu",
        Vars: map[string]interface{}{
            "name":        "test-instance",
            "environment": "dev",
            "size":        "small",
            "subnet_id":   "subnet-12345678",
        },
    }
    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    instanceID := terraform.Output(t, opts, "instance_id")
    assert.NotEmpty(t, instanceID)
}
```

## Conclusion

Shared OpenTofu modules reduce duplication and enforce organization standards across teams and cloud providers. Design a consistent variable interface across cloud-specific implementations, publish modules to a private registry with semantic versioning, and test modules with Terratest. Teams consuming shared modules get security best practices (encrypted volumes, IMDSv2, required tags) without needing to remember them.
