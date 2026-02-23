# How to Create Terraform Modules for Multi-Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Multi-Cloud, AWS, Azure, GCP, Infrastructure as Code

Description: Learn how to design Terraform modules that work across AWS, Azure, and GCP with abstraction layers, provider-agnostic interfaces, and practical multi-cloud patterns.

---

Building Terraform modules that work across multiple cloud providers is one of the harder challenges in infrastructure as code. The providers have different resource models, naming conventions, and capabilities. But with the right abstraction strategy, you can create modules that let teams deploy to any cloud without rewriting their configurations from scratch.

## Why Multi-Cloud Modules?

There are legitimate reasons to go multi-cloud: regulatory requirements for data sovereignty, vendor negotiation leverage, disaster recovery across providers, or simply having teams that prefer different clouds. The goal is not to abstract away every cloud difference but to provide a consistent interface where it makes sense.

## The Abstraction Layer Approach

The most practical pattern is to create a thin abstraction layer that defines a common interface, with cloud-specific implementations underneath.

```
modules/
  compute/
    interface/         # Shared variable and output definitions
      variables.tf
      outputs.tf
    aws/              # AWS-specific implementation
      main.tf
      variables.tf
      outputs.tf
    azure/            # Azure-specific implementation
      main.tf
      variables.tf
      outputs.tf
    gcp/              # GCP-specific implementation
      main.tf
      variables.tf
      outputs.tf
```

## Defining the Common Interface

Start by defining what inputs and outputs should be consistent across clouds.

```hcl
# modules/compute/interface/variables.tf
# These variables are shared across all cloud implementations

variable "name" {
  description = "Name for the compute instance"
  type        = string
}

variable "size" {
  description = "Size category: small, medium, large, xlarge"
  type        = string
  validation {
    condition     = contains(["small", "medium", "large", "xlarge"], var.size)
    error_message = "Size must be small, medium, large, or xlarge."
  }
}

variable "image" {
  description = "OS image identifier"
  type        = string
}

variable "network_id" {
  description = "Network or VPC identifier"
  type        = string
}

variable "subnet_id" {
  description = "Subnet identifier"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/compute/interface/outputs.tf
# All implementations must provide these outputs

# output "instance_id" - Unique ID of the compute instance
# output "private_ip" - Private IP address
# output "public_ip" - Public IP address (may be empty)
```

## AWS Implementation

```hcl
# modules/compute/aws/main.tf

# Map abstract sizes to AWS instance types
locals {
  instance_type_map = {
    small  = "t3.small"
    medium = "t3.medium"
    large  = "t3.large"
    xlarge = "t3.xlarge"
  }
}

resource "aws_instance" "this" {
  ami           = var.image
  instance_type = local.instance_type_map[var.size]
  subnet_id     = var.subnet_id

  tags = merge(var.tags, {
    Name = var.name
  })
}

output "instance_id" {
  value = aws_instance.this.id
}

output "private_ip" {
  value = aws_instance.this.private_ip
}

output "public_ip" {
  value = aws_instance.this.public_ip
}
```

## Azure Implementation

```hcl
# modules/compute/azure/main.tf

locals {
  vm_size_map = {
    small  = "Standard_B1ms"
    medium = "Standard_B2s"
    large  = "Standard_D2s_v3"
    xlarge = "Standard_D4s_v3"
  }
}

resource "azurerm_linux_virtual_machine" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = local.vm_size_map[var.size]
  admin_username      = "adminuser"

  network_interface_ids = [azurerm_network_interface.this.id]

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  admin_ssh_key {
    username   = "adminuser"
    public_key = var.ssh_public_key
  }

  tags = var.tags
}

resource "azurerm_network_interface" "this" {
  name                = "${var.name}-nic"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
  }
}

output "instance_id" {
  value = azurerm_linux_virtual_machine.this.id
}

output "private_ip" {
  value = azurerm_network_interface.this.private_ip_address
}

output "public_ip" {
  value = ""  # Public IP requires additional Azure resources
}
```

## GCP Implementation

```hcl
# modules/compute/gcp/main.tf

locals {
  machine_type_map = {
    small  = "e2-small"
    medium = "e2-medium"
    large  = "e2-standard-2"
    xlarge = "e2-standard-4"
  }
}

resource "google_compute_instance" "this" {
  name         = var.name
  machine_type = local.machine_type_map[var.size]
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = var.image
    }
  }

  network_interface {
    network    = var.network_id
    subnetwork = var.subnet_id
  }

  labels = var.tags
}

output "instance_id" {
  value = google_compute_instance.this.instance_id
}

output "private_ip" {
  value = google_compute_instance.this.network_interface[0].network_ip
}

output "public_ip" {
  value = try(google_compute_instance.this.network_interface[0].access_config[0].nat_ip, "")
}
```

## The Wrapper Module Pattern

Create a top-level module that selects the right implementation based on a cloud provider variable.

```hcl
# modules/compute/main.tf - The wrapper module

variable "cloud_provider" {
  description = "Cloud provider to use: aws, azure, gcp"
  type        = string
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.cloud_provider)
    error_message = "Cloud provider must be aws, azure, or gcp."
  }
}

module "aws" {
  source = "./aws"
  count  = var.cloud_provider == "aws" ? 1 : 0

  name      = var.name
  size      = var.size
  image     = var.image
  subnet_id = var.subnet_id
  tags      = var.tags
}

module "azure" {
  source = "./azure"
  count  = var.cloud_provider == "azure" ? 1 : 0

  name                = var.name
  size                = var.size
  image               = var.image
  subnet_id           = var.subnet_id
  resource_group_name = var.resource_group_name
  location            = var.location
  ssh_public_key      = var.ssh_public_key
  tags                = var.tags
}

module "gcp" {
  source = "./gcp"
  count  = var.cloud_provider == "gcp" ? 1 : 0

  name       = var.name
  size       = var.size
  image      = var.image
  network_id = var.network_id
  subnet_id  = var.subnet_id
  zone       = var.zone
  tags       = var.tags
}

# Unified outputs - only one cloud module is active at a time
output "instance_id" {
  value = coalesce(
    try(module.aws[0].instance_id, ""),
    try(module.azure[0].instance_id, ""),
    try(module.gcp[0].instance_id, "")
  )
}

output "private_ip" {
  value = coalesce(
    try(module.aws[0].private_ip, ""),
    try(module.azure[0].private_ip, ""),
    try(module.gcp[0].private_ip, "")
  )
}
```

## Multi-Cloud Networking Module

Networking is where clouds differ the most, but the core concepts are similar.

```hcl
# modules/network/aws/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, { Name = var.name })
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "${var.name}-private-${count.index}"
  })
}

output "network_id" {
  value = aws_vpc.this.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

## When Not to Abstract

Some things are better left cloud-specific. Do not try to create multi-cloud abstractions for:

- Managed services that have no equivalent on other clouds (e.g., AWS Lambda vs. Azure Functions have very different models)
- IAM and access control (these are fundamentally different per cloud)
- Cloud-specific optimizations (reserved instances, spot pricing)
- Services you will only ever run on one cloud

Focus your multi-cloud modules on infrastructure primitives: compute, networking, storage, and DNS.

## Testing Multi-Cloud Modules

Each cloud implementation needs its own tests.

```hcl
# tests/aws/main.tf
provider "aws" {
  region = "us-east-1"
}

module "test_compute" {
  source = "../../modules/compute/aws"

  name      = "test-instance"
  size      = "small"
  image     = "ami-0c55b159cbfafe1f0"
  subnet_id = module.test_vpc.subnet_id
  tags      = { Test = "true" }
}
```

```bash
# Run tests for each cloud separately
cd tests/aws && terraform init && terraform plan
cd tests/azure && terraform init && terraform plan
cd tests/gcp && terraform init && terraform plan
```

## Conclusion

Multi-cloud Terraform modules require thoughtful abstraction. Define a common interface, implement cloud-specific logic separately, and use a wrapper module to select the right implementation. Do not try to abstract everything - focus on the infrastructure primitives that genuinely benefit from portability, and leave cloud-specific features in cloud-specific modules.

For related patterns, see our posts on [how to create Terraform modules with dynamic provider configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-with-dynamic-provider-configuration/view) and [how to use module composition patterns in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-composition-patterns-in-terraform/view).
