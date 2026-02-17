# How to Use Terraform Moved Blocks to Refactor GCP Resource Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Refactoring, Moved Blocks, Infrastructure as Code

Description: Learn how to use Terraform moved blocks to safely refactor your GCP resource configurations by renaming resources, moving them into modules, and restructuring code without destroying infrastructure.

---

As your Terraform codebase grows, you inevitably need to refactor it. Maybe you want to rename a resource for clarity, move resources into a module for reusability, or split a monolithic configuration into smaller pieces. The problem is that Terraform tracks resources by their address in state. If you change a resource's address, Terraform thinks the old one should be destroyed and a new one should be created.

That is a disaster when the resource is a production database or a VPC network.

Terraform moved blocks solve this by telling Terraform that a resource has moved to a new address without needing to destroy and recreate it. They were introduced in Terraform 1.1 and are the recommended way to refactor configurations.

## The Problem: Resource Address Changes

Consider this simple Compute Engine configuration:

```hcl
# main.tf - Original configuration
resource "google_compute_instance" "web" {
  name         = "web-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
```

If you rename this resource from `web` to `web_server`:

```hcl
# Without a moved block, Terraform sees this as:
# - Destroy google_compute_instance.web
# - Create google_compute_instance.web_server
# That means downtime!
resource "google_compute_instance" "web_server" {
  name         = "web-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
```

Without a moved block, `terraform plan` will show a destroy-and-create. With a moved block, it shows a harmless state move.

## Basic Moved Block Syntax

Add a moved block to tell Terraform the resource was renamed:

```hcl
# moved.tf - Tell Terraform the resource was renamed
moved {
  from = google_compute_instance.web
  to   = google_compute_instance.web_server
}

# main.tf - The renamed resource
resource "google_compute_instance" "web_server" {
  name         = "web-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
```

Now when you run `terraform plan`, it shows:

```
# google_compute_instance.web has moved to google_compute_instance.web_server
```

No destroy. No create. Just a state update.

## Renaming GCP Resources

Renaming is the most common refactoring case. Here are some examples for different GCP resource types:

```hcl
# Rename a VPC network
moved {
  from = google_compute_network.main
  to   = google_compute_network.primary_vpc
}

# Rename a Cloud SQL instance
moved {
  from = google_sql_database_instance.db
  to   = google_sql_database_instance.primary_database
}

# Rename a service account
moved {
  from = google_service_account.app
  to   = google_service_account.web_application
}

# Rename a GKE cluster
moved {
  from = google_container_cluster.cluster
  to   = google_container_cluster.production
}
```

## Moving Resources into Modules

This is where moved blocks really shine. When you extract resources into a reusable module, every resource gets a new address that includes the module path.

Before (flat structure):

```hcl
# main.tf - Flat structure
resource "google_compute_network" "vpc" {
  name                    = "app-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "app-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = "us-central1"
  network       = google_compute_network.vpc.id
}

resource "google_compute_firewall" "allow_http" {
  name    = "allow-http"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]
}
```

After (extracted into a module):

```hcl
# main.tf - Using the network module
module "network" {
  source = "./modules/network"

  network_name = "app-vpc"
  subnet_name  = "app-subnet"
  subnet_cidr  = "10.0.0.0/24"
  region       = "us-central1"
}

# moved.tf - Tell Terraform where each resource went
moved {
  from = google_compute_network.vpc
  to   = module.network.google_compute_network.vpc
}

moved {
  from = google_compute_subnetwork.subnet
  to   = module.network.google_compute_subnetwork.subnet
}

moved {
  from = google_compute_firewall.allow_http
  to   = module.network.google_compute_firewall.allow_http
}
```

The module itself:

```hcl
# modules/network/main.tf
resource "google_compute_network" "vpc" {
  name                    = var.network_name
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = var.subnet_name
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id
}

resource "google_compute_firewall" "allow_http" {
  name    = "allow-http"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]
}
```

## Moving Resources from count to for_each

Converting from `count` to `for_each` is a common refactoring that changes resource addresses from indexed (`[0]`, `[1]`) to keyed (`["web-1"]`, `["web-2"]`):

Before:

```hcl
# Original - using count
resource "google_compute_instance" "server" {
  count = 3

  name         = "server-${count.index + 1}"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
```

After:

```hcl
# Refactored - using for_each
locals {
  servers = {
    "server-1" = { zone = "us-central1-a" }
    "server-2" = { zone = "us-central1-b" }
    "server-3" = { zone = "us-central1-c" }
  }
}

resource "google_compute_instance" "server" {
  for_each = local.servers

  name         = each.key
  machine_type = "e2-medium"
  zone         = each.value.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}

# Map count indexes to for_each keys
moved {
  from = google_compute_instance.server[0]
  to   = google_compute_instance.server["server-1"]
}

moved {
  from = google_compute_instance.server[1]
  to   = google_compute_instance.server["server-2"]
}

moved {
  from = google_compute_instance.server[2]
  to   = google_compute_instance.server["server-3"]
}
```

## Moving Between Modules

You can also move resources between modules:

```hcl
# Move a resource from one module to another
moved {
  from = module.infrastructure.google_compute_instance.web
  to   = module.compute.google_compute_instance.web
}

# Move a resource from a module back to the root
moved {
  from = module.old_module.google_storage_bucket.data
  to   = google_storage_bucket.data
}
```

## Renaming Modules

Rename entire modules with a single moved block:

```hcl
# Rename a module
moved {
  from = module.web_servers
  to   = module.application_servers
}
```

This automatically moves all resources within the module to the new module address.

## Chaining Moved Blocks

If a resource has been moved multiple times over the course of your project's history, you can chain moved blocks:

```hcl
# First refactoring: renamed the resource
moved {
  from = google_compute_instance.web
  to   = google_compute_instance.web_server
}

# Second refactoring: moved into a module
moved {
  from = google_compute_instance.web_server
  to   = module.compute.google_compute_instance.web_server
}
```

Terraform follows the chain and correctly maps the original state address to the final address.

## Verifying Moved Blocks

Always run `terraform plan` after adding moved blocks to verify the result:

```bash
# Plan should show moves, not destroy/create
terraform plan
```

A correct plan shows:

```
  # google_compute_instance.web has moved to google_compute_instance.web_server
    resource "google_compute_instance" "web_server" {
        # (all attributes unchanged)
    }

Plan: 0 to add, 0 to change, 0 to destroy.
```

If you see any creates or destroys, something is wrong with your moved blocks.

## Cleaning Up Moved Blocks

Moved blocks can stay in your code indefinitely - they are no-ops after the first apply. However, they add clutter over time.

The safe approach is:

1. Add moved blocks
2. Run `terraform apply` to update state
3. Keep moved blocks for at least one full release cycle so all environments get updated
4. Remove moved blocks after all environments have been applied

```hcl
# You can keep moved blocks in a dedicated file for easy cleanup
# moved.tf - Remove these after all environments are updated

# Refactoring from 2026-02-17
moved {
  from = google_compute_instance.web
  to   = module.compute.google_compute_instance.web
}
```

## Common Mistakes

**Moving to a different resource type.** You cannot move a `google_compute_instance` to a `google_compute_instance_template`. The from and to must be the same resource type.

**Forgetting dependent resources.** If you move a VPC into a module, you also need to move the subnets, firewall rules, and everything else that references it.

**Not testing with plan first.** Always verify with `terraform plan` before applying. A misconfigured moved block could still cause destruction.

**Removing moved blocks too early.** If you remove a moved block before all environments have been updated, the unapplied environments will see destroy-and-create plans.

## Best Practices

1. **Always plan before applying** moved blocks. Verify zero destroys.
2. **Keep moved blocks in a separate file** for easy tracking and cleanup.
3. **Apply to all environments** before removing moved blocks.
4. **Move one logical group at a time.** Do not try to refactor everything in a single commit.
5. **Document the refactoring** in your commit message so the team understands the changes.
6. **Back up your state** before large refactoring operations, just in case.

## Wrapping Up

Moved blocks make Terraform refactoring safe and predictable. Whether you are renaming resources for clarity, extracting code into modules, or converting from count to for_each, moved blocks ensure your actual infrastructure remains untouched while your code gets cleaner. The key is to always verify with `terraform plan` and apply to all environments before cleaning up the moved blocks.
