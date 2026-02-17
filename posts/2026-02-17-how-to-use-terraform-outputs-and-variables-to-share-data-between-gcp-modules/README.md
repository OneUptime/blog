# How to Use Terraform Outputs and Variables to Share Data Between GCP Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Modules, Infrastructure as Code, Google Cloud

Description: A practical guide to using Terraform outputs and variables to pass data between modules when building GCP infrastructure.

---

One of the first things you learn when working with Terraform modules is that modules are isolated by default. A networking module that creates a VPC does not automatically share the VPC ID with your compute module that needs it for deploying instances. You have to explicitly wire things together using outputs and variables. This is by design - it makes modules reusable and their dependencies clear - but it takes some getting used to.

In this post, I will walk you through how to use outputs and variables to connect Terraform modules in a real GCP project.

## The Problem: Module Isolation

Say you have two modules. One creates a VPC network, and the other deploys a GKE cluster that needs to live inside that VPC. Without a way to share data between modules, you would have to hardcode the VPC name in the GKE module, which defeats the entire purpose of modularization.

Here is what a typical project structure looks like:

```
project/
  main.tf
  variables.tf
  outputs.tf
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    gke/
      main.tf
      variables.tf
      outputs.tf
```

## Defining Module Variables

Variables are the inputs to a module. They define what information the module needs from the outside world.

Here is the variables file for the networking module:

```hcl
# modules/networking/variables.tf
# These variables define what the networking module needs to create a VPC

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the subnet"
  type        = string
  default     = "us-central1"
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
  default     = "main-vpc"
}

variable "subnet_cidr" {
  description = "CIDR range for the subnet"
  type        = string
  default     = "10.0.0.0/16"
}
```

And here is the main configuration for the networking module:

```hcl
# modules/networking/main.tf
# Creates a VPC network and subnet in GCP

resource "google_compute_network" "vpc" {
  name                    = var.network_name
  project                 = var.project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.network_name}-subnet"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.subnet_cidr

  # Secondary ranges needed for GKE pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }
}
```

## Defining Module Outputs

Outputs are how a module exposes data to the outside world. They are the return values of a module.

The networking module needs to expose the VPC and subnet details so other modules can reference them:

```hcl
# modules/networking/outputs.tf
# These outputs expose the created network resources for use by other modules

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "network_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "subnet_name" {
  description = "The name of the subnet"
  value       = google_compute_subnetwork.subnet.name
}

output "subnet_id" {
  description = "The ID of the subnet"
  value       = google_compute_subnetwork.subnet.id
}

output "pods_range_name" {
  description = "The name of the secondary range for pods"
  value       = "pods"
}

output "services_range_name" {
  description = "The name of the secondary range for services"
  value       = "services"
}
```

## Consuming Outputs in Another Module

Now the GKE module needs variables that correspond to the networking module's outputs:

```hcl
# modules/gke/variables.tf
# Input variables - the GKE module needs network details from the networking module

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the cluster"
  type        = string
}

variable "cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
  default     = "main-cluster"
}

variable "network_name" {
  description = "VPC network name (from networking module)"
  type        = string
}

variable "subnet_name" {
  description = "Subnet name (from networking module)"
  type        = string
}

variable "pods_range_name" {
  description = "Secondary range name for pods"
  type        = string
}

variable "services_range_name" {
  description = "Secondary range name for services"
  type        = string
}
```

And the GKE module's main configuration uses those variables:

```hcl
# modules/gke/main.tf
# Creates a GKE cluster in the specified VPC and subnet

resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  project  = var.project_id
  location = var.region

  network    = var.network_name
  subnetwork = var.subnet_name

  # Use the secondary ranges from the networking module
  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_range_name
    services_secondary_range_name = var.services_range_name
  }

  # Start with a default node pool, then remove it
  remove_default_node_pool = true
  initial_node_count       = 1
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.cluster_name}-node-pool"
  project    = var.project_id
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 3

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 100

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
```

## Wiring Everything Together in the Root Module

The root module is where you connect the dots. You instantiate both modules and pass the outputs from one as inputs to another:

```hcl
# main.tf (root module)
# This is where we connect the networking and GKE modules

module "networking" {
  source = "./modules/networking"

  project_id   = var.project_id
  region       = var.region
  network_name = "production-vpc"
  subnet_cidr  = "10.0.0.0/16"
}

module "gke" {
  source = "./modules/gke"

  project_id          = var.project_id
  region              = var.region
  cluster_name        = "production-cluster"
  # These values come from the networking module's outputs
  network_name        = module.networking.network_name
  subnet_name         = module.networking.subnet_name
  pods_range_name     = module.networking.pods_range_name
  services_range_name = module.networking.services_range_name
}
```

The `module.networking.network_name` syntax is how you reference a module's output. Terraform understands the dependency - it knows it needs to create the networking resources before it can create the GKE cluster.

## Exposing Root-Level Outputs

You often want to expose some information from your root module too, especially if other Terraform configurations or CI/CD pipelines need it:

```hcl
# outputs.tf (root module)
# Expose key information for use by other tools and pipelines

output "cluster_endpoint" {
  description = "The GKE cluster endpoint"
  value       = module.gke.cluster_endpoint
  sensitive   = true
}

output "vpc_network_name" {
  description = "The VPC network name"
  value       = module.networking.network_name
}
```

## Using Complex Variable Types

Sometimes you need to pass structured data between modules. Terraform supports complex types like maps, lists, and objects.

Here is an example of passing a list of firewall rules from a root module to a networking module:

```hcl
# Variable definition for complex types
variable "firewall_rules" {
  description = "List of firewall rules to create"
  type = list(object({
    name        = string
    ports       = list(string)
    protocol    = string
    source_ranges = list(string)
  }))
  default = [
    {
      name          = "allow-http"
      ports         = ["80"]
      protocol      = "tcp"
      source_ranges = ["0.0.0.0/0"]
    },
    {
      name          = "allow-https"
      ports         = ["443"]
      protocol      = "tcp"
      source_ranges = ["0.0.0.0/0"]
    }
  ]
}
```

## Sensitive Outputs

Some outputs contain sensitive information. Terraform lets you mark them as sensitive:

```hcl
# Mark sensitive outputs to prevent them from showing in plan output
output "cluster_ca_certificate" {
  description = "The cluster CA certificate"
  value       = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive   = true
}
```

## Tips From Real Projects

After working with Terraform modules on GCP for a while, here are some patterns that have saved me time.

Keep your output names consistent with the attribute names from the resources they expose. If the resource has `name` and `id`, your outputs should be `network_name` and `network_id`, not something creative.

Use `description` on every variable and output. When you come back to this code in six months, those descriptions are invaluable.

Set sensible defaults for variables where possible, but require explicit input for anything project-specific like project IDs or cluster names.

Avoid passing entire resource objects between modules. Pass specific attributes instead. This keeps the interface clean and makes it obvious what data flows where.

Use `terraform output` to inspect what a module exposes. Run `terraform output -json` for a machine-readable format that scripts can consume.

## Wrapping Up

Outputs and variables are the glue that holds Terraform modules together. They create clear interfaces between components, making your infrastructure code modular and reusable. On GCP, this pattern works especially well because resources like VPCs, subnets, and service accounts are frequently shared across multiple services. Get comfortable with this pattern and your Terraform configurations will be much easier to maintain and extend.
