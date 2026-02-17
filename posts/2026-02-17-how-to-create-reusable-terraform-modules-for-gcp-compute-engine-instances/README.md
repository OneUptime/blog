# How to Create Reusable Terraform Modules for GCP Compute Engine Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Modules, Compute Engine, Infrastructure as Code

Description: Learn how to build reusable Terraform modules for GCP Compute Engine instances that your team can use across projects and environments with consistent configurations.

---

Copy-pasting Terraform resource blocks across projects is a maintenance nightmare. When you need to update a security setting or change a default configuration, you have to hunt down every copy and update it. Terraform modules solve this by letting you define a resource pattern once and reuse it everywhere.

In this guide, I will walk through building a production-ready Terraform module for GCP Compute Engine instances. We will start simple and add features incrementally until we have a module that handles the common patterns teams need.

## Module Structure

A Terraform module is just a directory with `.tf` files. Here is the structure we will build:

```
modules/
  compute-instance/
    main.tf          # Resource definitions
    variables.tf     # Input variables
    outputs.tf       # Output values
    versions.tf      # Provider requirements
```

## Starting with the Basics

Let us start with a minimal module that creates a Compute Engine instance.

```hcl
# modules/compute-instance/versions.tf
# Define the required provider and version
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}
```

```hcl
# modules/compute-instance/variables.tf
# Input variables for the Compute Engine instance module

variable "name" {
  description = "Name of the Compute Engine instance"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "zone" {
  description = "The zone where the instance will be created"
  type        = string
}

variable "machine_type" {
  description = "Machine type for the instance"
  type        = string
  default     = "e2-medium"
}

variable "image" {
  description = "Boot disk image"
  type        = string
  default     = "debian-cloud/debian-12"
}

variable "disk_size_gb" {
  description = "Boot disk size in GB"
  type        = number
  default     = 20
}

variable "network" {
  description = "VPC network name or self_link"
  type        = string
  default     = "default"
}

variable "subnetwork" {
  description = "Subnetwork name or self_link"
  type        = string
  default     = null
}

variable "tags" {
  description = "Network tags for the instance"
  type        = list(string)
  default     = []
}

variable "labels" {
  description = "Labels to apply to the instance"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/compute-instance/main.tf
# The core Compute Engine instance resource

resource "google_compute_instance" "this" {
  name         = var.name
  project      = var.project_id
  zone         = var.zone
  machine_type = var.machine_type
  tags         = var.tags
  labels       = var.labels

  boot_disk {
    initialize_params {
      image = var.image
      size  = var.disk_size_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    network    = var.network
    subnetwork = var.subnetwork
  }

  # Enable deletion protection by default for safety
  deletion_protection = false

  # Use the default service account with minimal scopes
  service_account {
    scopes = ["cloud-platform"]
  }

  lifecycle {
    # Prevent accidental destruction of instances
    prevent_destroy = false
  }
}
```

```hcl
# modules/compute-instance/outputs.tf
# Output values that callers might need

output "instance_id" {
  description = "The ID of the created instance"
  value       = google_compute_instance.this.instance_id
}

output "self_link" {
  description = "The self link of the instance"
  value       = google_compute_instance.this.self_link
}

output "internal_ip" {
  description = "The internal IP address of the instance"
  value       = google_compute_instance.this.network_interface[0].network_ip
}

output "name" {
  description = "The name of the instance"
  value       = google_compute_instance.this.name
}
```

## Using the Basic Module

Now you can use this module in any Terraform configuration:

```hcl
# main.tf - Using the compute instance module
module "web_server" {
  source = "./modules/compute-instance"

  name         = "web-server-1"
  project_id   = "my-gcp-project"
  zone         = "us-central1-a"
  machine_type = "e2-standard-2"
  image        = "debian-cloud/debian-12"
  disk_size_gb = 50

  tags   = ["http-server", "https-server"]
  labels = {
    environment = "production"
    team        = "web"
  }
}

output "web_server_ip" {
  value = module.web_server.internal_ip
}
```

## Adding Service Account Support

Most production instances need a custom service account rather than the default one:

```hcl
# Add to modules/compute-instance/variables.tf
variable "service_account_email" {
  description = "Service account email to attach to the instance. If null, uses the default compute service account."
  type        = string
  default     = null
}

variable "service_account_scopes" {
  description = "OAuth scopes for the service account"
  type        = list(string)
  default     = ["cloud-platform"]
}
```

Update the resource to use the variable:

```hcl
# Update the service_account block in main.tf
resource "google_compute_instance" "this" {
  # ... other configuration ...

  service_account {
    email  = var.service_account_email
    scopes = var.service_account_scopes
  }
}
```

## Adding Startup Script Support

Startup scripts are essential for instance initialization:

```hcl
# Add to modules/compute-instance/variables.tf
variable "startup_script" {
  description = "Startup script to run when the instance boots"
  type        = string
  default     = null
}

variable "metadata" {
  description = "Additional metadata key-value pairs"
  type        = map(string)
  default     = {}
}
```

```hcl
# Update the resource in main.tf to include metadata
resource "google_compute_instance" "this" {
  # ... other configuration ...

  metadata = merge(
    var.metadata,
    var.startup_script != null ? {
      startup-script = var.startup_script
    } : {}
  )
}
```

Usage with a startup script:

```hcl
# Create an instance with a startup script that installs nginx
module "web_server" {
  source = "./modules/compute-instance"

  name       = "web-server-1"
  project_id = "my-gcp-project"
  zone       = "us-central1-a"

  startup_script = <<-EOT
    #!/bin/bash
    # Install and start nginx
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
  EOT

  tags = ["http-server"]
}
```

## Adding External IP Support

Sometimes you need a public IP, sometimes you do not:

```hcl
# Add to modules/compute-instance/variables.tf
variable "enable_external_ip" {
  description = "Whether to assign an external IP address"
  type        = bool
  default     = false
}

variable "static_external_ip" {
  description = "A static external IP address to assign. Only used if enable_external_ip is true."
  type        = string
  default     = null
}
```

```hcl
# Update the network_interface in main.tf
resource "google_compute_instance" "this" {
  # ... other configuration ...

  network_interface {
    network    = var.network
    subnetwork = var.subnetwork

    # Conditionally add an external IP
    dynamic "access_config" {
      for_each = var.enable_external_ip ? [1] : []
      content {
        nat_ip = var.static_external_ip
      }
    }
  }
}
```

Add the external IP to outputs:

```hcl
# Add to outputs.tf
output "external_ip" {
  description = "The external IP address of the instance, if assigned"
  value       = var.enable_external_ip ? google_compute_instance.this.network_interface[0].access_config[0].nat_ip : null
}
```

## Adding Additional Disk Support

Many workloads need extra disks beyond the boot disk:

```hcl
# Add to modules/compute-instance/variables.tf
variable "additional_disks" {
  description = "Additional disks to attach to the instance"
  type = list(object({
    name    = string
    size_gb = number
    type    = optional(string, "pd-balanced")
  }))
  default = []
}
```

```hcl
# Add to main.tf - Create and attach additional disks
resource "google_compute_disk" "additional" {
  for_each = { for disk in var.additional_disks : disk.name => disk }

  name    = "${var.name}-${each.value.name}"
  project = var.project_id
  zone    = var.zone
  size    = each.value.size_gb
  type    = each.value.type
}

resource "google_compute_attached_disk" "additional" {
  for_each = { for disk in var.additional_disks : disk.name => disk }

  disk     = google_compute_disk.additional[each.key].id
  instance = google_compute_instance.this.id
}
```

Usage:

```hcl
# Create an instance with additional data disks
module "db_server" {
  source = "./modules/compute-instance"

  name         = "db-server-1"
  project_id   = "my-gcp-project"
  zone         = "us-central1-a"
  machine_type = "e2-standard-4"

  additional_disks = [
    {
      name    = "data"
      size_gb = 500
      type    = "pd-ssd"
    },
    {
      name    = "logs"
      size_gb = 100
      type    = "pd-balanced"
    }
  ]
}
```

## Creating Multiple Instances with for_each

The module works naturally with `for_each` for creating instance groups:

```hcl
# Create multiple web servers across zones
locals {
  web_servers = {
    "web-1" = { zone = "us-central1-a" }
    "web-2" = { zone = "us-central1-b" }
    "web-3" = { zone = "us-central1-c" }
  }
}

module "web_servers" {
  source   = "./modules/compute-instance"
  for_each = local.web_servers

  name         = each.key
  project_id   = "my-gcp-project"
  zone         = each.value.zone
  machine_type = "e2-standard-2"

  tags   = ["http-server", "https-server"]
  labels = {
    role        = "web"
    environment = "production"
  }
}

# Output all web server IPs
output "web_server_ips" {
  value = { for k, v in module.web_servers : k => v.internal_ip }
}
```

## Adding Input Validation

Make your module harder to misuse with validation rules:

```hcl
# Add validation to variables.tf
variable "machine_type" {
  description = "Machine type for the instance"
  type        = string
  default     = "e2-medium"

  validation {
    condition     = can(regex("^(e2|n2|n2d|c2|c2d|m2|a2)-", var.machine_type))
    error_message = "Machine type must be a valid GCP machine type family."
  }
}

variable "disk_size_gb" {
  description = "Boot disk size in GB"
  type        = number
  default     = 20

  validation {
    condition     = var.disk_size_gb >= 10 && var.disk_size_gb <= 65536
    error_message = "Boot disk size must be between 10 and 65536 GB."
  }
}

variable "name" {
  description = "Name of the Compute Engine instance"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,62}$", var.name))
    error_message = "Instance name must start with a lowercase letter, contain only lowercase letters, numbers, and hyphens, and be at most 63 characters."
  }
}
```

## Publishing and Versioning Your Module

For team-wide reuse, host your module in a Git repository and reference it by version:

```hcl
# Reference a module from a Git repository with a specific version tag
module "web_server" {
  source = "git::https://github.com/myorg/terraform-gcp-modules.git//compute-instance?ref=v1.2.0"

  name       = "web-server-1"
  project_id = "my-gcp-project"
  zone       = "us-central1-a"
}
```

Alternatively, use a GCS bucket as a module registry:

```hcl
# Reference a module from a GCS bucket
module "web_server" {
  source = "gcs::https://www.googleapis.com/storage/v1/my-terraform-modules/compute-instance/1.2.0.zip"

  name       = "web-server-1"
  project_id = "my-gcp-project"
  zone       = "us-central1-a"
}
```

## Best Practices

1. **Keep modules focused.** A module should do one thing well. Do not create a mega-module that creates instances, networks, and databases.
2. **Use sensible defaults.** Good defaults mean callers only need to specify what is different from the norm.
3. **Validate inputs.** Catch errors at plan time instead of during apply.
4. **Document with descriptions.** Every variable and output should have a clear description.
5. **Version your modules.** Use Git tags or semantic versioning to control what version consumers use.
6. **Output everything useful.** You cannot predict what callers will need. Output IDs, self-links, IP addresses, and names.

## Wrapping Up

Building reusable Terraform modules for Compute Engine instances reduces duplication, enforces consistency, and makes it easier for your team to provision infrastructure correctly. Start with a basic module that covers the common case, add features as your team needs them, and version the module so changes are deliberate and reviewable.
