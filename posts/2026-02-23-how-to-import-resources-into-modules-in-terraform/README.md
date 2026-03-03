# How to Import Resources into Modules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Import, Infrastructure as Code, State Management

Description: Learn how to import existing cloud resources into Terraform modules, including strategies for handling module addresses and state management.

---

Importing existing resources into Terraform modules is a common requirement when you want to organize your infrastructure code into reusable components while adopting resources that were created outside of Terraform. Unlike importing into root-level resources, module imports require careful attention to resource addressing and module structure. This guide walks you through the process step by step.

## Understanding Module Resource Addresses

In Terraform, every resource has a unique address in the state. When a resource is inside a module, its address includes the module path:

```text
# Root-level resource address
aws_instance.web_server

# Resource inside a module
module.web.aws_instance.server

# Resource inside a nested module
module.network.module.vpc.aws_vpc.main
```

When importing resources into modules, you must use the full module-prefixed address. This tells Terraform exactly where in your module hierarchy the resource belongs.

## Setting Up the Module

Before importing, you need a module that defines the resource types you want to import. Create the module structure first:

```hcl
# modules/web-server/main.tf
variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "ami_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

# This resource will be the import target
resource "aws_instance" "server" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  tags = {
    Name = "web-server"
  }
}

resource "aws_eip" "server" {
  instance = aws_instance.server.id
}
```

Then reference the module in your root configuration:

```hcl
# main.tf
module "web" {
  source = "./modules/web-server"

  ami_id        = "ami-0abcdef1234567890"
  instance_type = "t3.medium"
  subnet_id     = "subnet-0abc123def456"
}
```

## Importing with the CLI Command

The traditional approach uses the `terraform import` command with the full module address:

```bash
# Initialize Terraform to register the module
terraform init

# Import the EC2 instance into the module
terraform import module.web.aws_instance.server i-0abc123def456789a

# Import the Elastic IP into the module
terraform import module.web.aws_eip.server eipalloc-0abc123def456789a
```

After importing, run `terraform plan` to verify the configuration matches the imported resource:

```bash
# Check for differences between config and imported state
terraform plan
```

If the plan shows changes, adjust your module variables or configuration until the plan is clean.

## Importing with Import Blocks (Terraform 1.5+)

Terraform 1.5 introduced import blocks, which provide a declarative way to import resources. This works well with modules:

```hcl
# imports.tf
# Import the EC2 instance into the web module
import {
  to = module.web.aws_instance.server
  id = "i-0abc123def456789a"
}

# Import the Elastic IP into the web module
import {
  to = module.web.aws_eip.server
  id = "eipalloc-0abc123def456789a"
}
```

Then run the import:

```bash
# Preview the import
terraform plan

# Execute the import
terraform apply
```

The advantage of import blocks is that they are version-controlled, reviewable, and can be planned before applying. After the import succeeds, you can remove the import blocks from your configuration.

## Importing into Modules with for_each

When your module uses `for_each`, the resource address includes the module key:

```hcl
# main.tf
variable "servers" {
  default = {
    web-1 = {
      instance_id = "i-0abc111"
      ami_id      = "ami-0abcdef1234567890"
    }
    web-2 = {
      instance_id = "i-0abc222"
      ami_id      = "ami-0abcdef1234567890"
    }
  }
}

module "web" {
  for_each = var.servers
  source   = "./modules/web-server"

  ami_id        = each.value.ami_id
  instance_type = "t3.medium"
  subnet_id     = "subnet-0abc123"
}
```

Import using the keyed module address:

```bash
# Import into the "web-1" module instance
terraform import 'module.web["web-1"].aws_instance.server' i-0abc111

# Import into the "web-2" module instance
terraform import 'module.web["web-2"].aws_instance.server' i-0abc222
```

Or with import blocks:

```hcl
import {
  to = module.web["web-1"].aws_instance.server
  id = "i-0abc111"
}

import {
  to = module.web["web-2"].aws_instance.server
  id = "i-0abc222"
}
```

## Importing into Nested Modules

For nested modules, chain the module addresses:

```hcl
# Root configuration calls the network module
module "network" {
  source = "./modules/network"
}

# modules/network/main.tf calls the vpc module
module "vpc" {
  source = "./modules/vpc"
}

# modules/vpc/main.tf defines the VPC resource
resource "aws_vpc" "main" {
  cidr_block = var.cidr_block
}
```

Import using the full nested path:

```bash
# Import into a nested module
terraform import module.network.module.vpc.aws_vpc.main vpc-0abc123def456
```

## Moving Existing Resources into Modules

If you already have resources in the root state and want to move them into a module, use `terraform state mv`:

```bash
# Move a root-level resource into a module
terraform state mv aws_instance.web_server module.web.aws_instance.server

# Move multiple resources
terraform state mv aws_eip.web module.web.aws_eip.server
terraform state mv aws_security_group.web module.web.aws_security_group.server
```

With Terraform 1.1+, you can also use `moved` blocks for a declarative approach:

```hcl
# moved.tf
moved {
  from = aws_instance.web_server
  to   = module.web.aws_instance.server
}

moved {
  from = aws_eip.web
  to   = module.web.aws_eip.server
}
```

Run `terraform plan` to see the moves, then `terraform apply` to execute them. After applying, you can remove the moved blocks.

## Handling Module Variables During Import

One challenge with module imports is ensuring the module variables produce the same configuration as the existing resource. A practical approach is to start with hardcoded values and gradually parameterize:

```hcl
# Step 1: Start with values that match the existing resource
module "web" {
  source = "./modules/web-server"

  ami_id        = "ami-0abcdef1234567890"  # Exact AMI of existing instance
  instance_type = "t3.medium"               # Exact type of existing instance
  subnet_id     = "subnet-0abc123"          # Exact subnet of existing instance
}

# Step 2: After import, gradually move to variables
module "web" {
  source = "./modules/web-server"

  ami_id        = var.ami_id
  instance_type = var.instance_type
  subnet_id     = module.network.subnet_id
}
```

## Troubleshooting Common Issues

When importing into modules, you may encounter the error "resource address does not exist in configuration." This means the module or resource block is not defined in your code. Ensure that:

1. The module block exists in the root configuration.
2. The resource exists within the module.
3. You have run `terraform init` to register the module.

Another common issue is state conflicts where the resource already exists in the state at a different address. Check for existing entries with:

```bash
# List all resources in state
terraform state list

# Show details for a specific resource
terraform state show module.web.aws_instance.server
```

## Best Practices

Always back up your state file before importing into modules. Write the module configuration first and verify it with `terraform validate` before attempting imports. Use import blocks instead of the CLI command when possible, as they are easier to review and track. After importing, always run `terraform plan` to ensure your configuration matches the imported resource with zero changes.

## Conclusion

Importing resources into Terraform modules requires understanding module addressing and careful planning. Whether you use the CLI import command, import blocks, or state moves, the key is ensuring your module configuration accurately reflects the existing resource. Start with exact values, verify with `terraform plan`, and then refactor to use variables and references. This approach minimizes risk and gives you a clean, modular Terraform codebase.

For related topics, see [How to Handle Import with for_each Resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-import-with-for-each-resources-in-terraform/view) and [How to Verify Imported Resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-verify-imported-resources-in-terraform/view).
