# How to Use Terragrunt to Manage Multiple GCP Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Terragrunt, Infrastructure as Code, Google Cloud Platform

Description: Learn how to use Terragrunt to manage multiple GCP projects efficiently by sharing Terraform modules, reducing code duplication, and maintaining consistent infrastructure across environments.

---

Managing infrastructure across multiple GCP projects is a challenge that grows fast. You start with one project, maybe two - dev and prod. Then staging gets added. Then a data project. Before you know it, you have a dozen GCP projects and your Terraform code is a tangled mess of copy-pasted modules with slight variations.

Terragrunt solves this problem by acting as a thin wrapper around Terraform that lets you keep your configurations DRY (Don't Repeat Yourself), manage remote state automatically, and share modules across projects without duplicating code.

In this guide, I will walk you through setting up Terragrunt to manage multiple GCP projects with shared Terraform modules.

## Why Terragrunt for Multi-Project GCP

Terraform alone works fine for a single project. But when you scale to multiple projects, you run into several pain points:

- Duplicated backend configuration blocks in every module
- Copy-pasted variable values across environments
- No easy way to define dependencies between modules in different projects
- Manual state bucket creation and management

Terragrunt addresses all of these. It gives you a hierarchy of configuration files that inherit from each other, so you define things once at the top and override only what changes at each level.

## Project Structure

Here is the directory layout I recommend for managing multiple GCP projects with Terragrunt:

```text
infrastructure/
  root.hcl                    # Root config - provider, backend defaults
  modules/                     # Shared Terraform modules
    vpc/
      main.tf
      variables.tf
      outputs.tf
    gke/
      main.tf
      variables.tf
      outputs.tf
    cloud-sql/
      main.tf
      variables.tf
      outputs.tf
  environments/
    dev/
      env.hcl                  # Dev-specific values
      project-a/
        project.hcl            # Project-specific values
        vpc/
          terragrunt.hcl
        gke/
          terragrunt.hcl
      project-b/
        project.hcl
        vpc/
          terragrunt.hcl
        cloud-sql/
          terragrunt.hcl
    staging/
      env.hcl
      project-a/
        project.hcl
        vpc/
          terragrunt.hcl
        gke/
          terragrunt.hcl
    prod/
      env.hcl
      project-a/
        project.hcl
        vpc/
          terragrunt.hcl
        gke/
          terragrunt.hcl
```

## Setting Up the Root Configuration

The root `root.hcl` file defines settings shared across all environments and projects. This is where you configure the GCS backend for state storage and the Google provider.

Here is a root configuration that automatically generates backend config based on the directory path:

```hcl
# root.hcl - defines remote state and provider configuration
# that all child modules include

# Automatically configure the GCS backend based on directory structure
remote_state {
  backend = "gcs"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket   = "my-org-terraform-state"
    prefix   = "${path_relative_to_include()}/terraform.tfstate"
    project  = "my-org-terraform-admin"
    location = "US"
  }
}

# Generate the Google provider block for all child modules
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "google" {
  # Project is set by each module's inputs/resources
}

provider "google-beta" {
  # Beta provider for features not yet in GA
}
EOF
}
```

The `path_relative_to_include()` function is what makes this work. It uses the directory structure to create unique state file paths automatically, so `environments/dev/project-a/vpc` gets its state stored at that exact path in the GCS bucket.

## Environment-Level Configuration

Each environment directory has its own `env.hcl` that sets environment-specific values. Terragrunt currently supports only a single level of `include` blocks, so child modules include the root config directly and read the environment file separately. Here is what the dev environment config looks like:

```hcl
# environments/dev/env.hcl
# Sets dev-specific defaults

locals {
  environment = "dev"
  region      = "us-central1"
}
```

## Creating Shared Terraform Modules

Shared modules live in the `modules/` directory and contain standard Terraform code. Here is a VPC module designed to work across projects:

```hcl
# modules/vpc/main.tf
# Creates a VPC with subnets, configurable per-project

variable "project_id" {
  description = "The GCP project ID to create the VPC in"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "GCP region for the subnet"
  type        = string
}

variable "subnet_cidr" {
  description = "CIDR range for the primary subnet"
  type        = string
}

resource "google_compute_network" "vpc" {
  project                 = var.project_id
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  project       = var.project_id
  name          = "${var.environment}-subnet-${var.region}"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id

  # Enable Private Google Access so instances without external IPs
  # can reach Google APIs
  private_ip_google_access = true
}

output "vpc_id" {
  value = google_compute_network.vpc.id
}

output "subnet_id" {
  value = google_compute_subnetwork.subnet.id
}
```

## Module-Level Terragrunt Configuration

Each module usage in a project gets a small `terragrunt.hcl` that points to the shared module and provides project-specific inputs:

```hcl
# environments/dev/project-a/vpc/terragrunt.hcl
# Deploys the shared VPC module for project-a in dev

# Include root for backend and provider configuration
include "root" {
  path = find_in_parent_folders("root.hcl")
}

# Point to the shared VPC module
terraform {
  source = "../../../../modules/vpc"
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

# Project-specific inputs that extend environment defaults
inputs = {
  project_id   = "my-org-dev-project-a"
  environment  = local.env_vars.locals.environment
  region       = local.env_vars.locals.region
  subnet_cidr  = "10.0.0.0/20"
}
```

Notice how small this file is. The backend and provider are inherited, and the environment and region are loaded from `env.hcl`. You only specify what is unique to this particular deployment.

## Handling Dependencies Between Modules

When one module depends on another - say GKE needs the VPC ID - Terragrunt handles this with `dependency` blocks:

```hcl
# environments/dev/project-a/gke/terragrunt.hcl
# Deploys GKE cluster that depends on the VPC module

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../../modules/gke"
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

# Declare dependency on the VPC module in the same project
dependency "vpc" {
  config_path = "../vpc"
}

inputs = {
  project_id   = "my-org-dev-project-a"
  environment  = local.env_vars.locals.environment
  region       = local.env_vars.locals.region
  vpc_id       = dependency.vpc.outputs.vpc_id
  subnet_id    = dependency.vpc.outputs.subnet_id
}
```

When you run `terragrunt apply` on the GKE module, Terragrunt reads the VPC module outputs from its state. If the VPC has not been applied yet, this will fail unless you configure mock outputs. When you run across multiple modules with `terragrunt run --all`, Terragrunt uses the dependency graph to run the VPC before GKE.

## Running Terragrunt Across All Projects

One of the biggest wins with Terragrunt is `run --all`. From any directory in the hierarchy, you can apply everything beneath it:

```bash
# Apply all modules in all projects for the dev environment
cd infrastructure/environments/dev
terragrunt run --all apply

# Plan changes across all prod projects
cd infrastructure/environments/prod
terragrunt run --all plan

# Destroy a specific project's infrastructure
cd infrastructure/environments/dev/project-b
terragrunt run --all destroy
```

Terragrunt figures out the dependency graph and runs things in the right order, parallelizing where it can.

## Managing Project-Specific Variables

For values that change per project, I like to use a `project.hcl` file at each project level:

```hcl
# environments/dev/project-a/project.hcl
locals {
  project_id   = "my-org-dev-project-a"
  project_name = "Project A"
  billing_id   = "XXXXXX-XXXXXX-XXXXXX"
}
```

Then reference it in child modules:

```hcl
# Read the project-level config
locals {
  project_vars = read_terragrunt_config(find_in_parent_folders("project.hcl"))
}

inputs = {
  project_id = local.project_vars.locals.project_id
}
```

## Tips from Production Experience

After running this setup across dozens of GCP projects, here are a few things I have learned:

**Version your modules.** Use Git tags on your modules repository and reference specific versions in Terragrunt. This prevents a module change from accidentally breaking production.

**Use separate state buckets per environment.** While the example above uses one bucket, in production you want the state bucket for prod to be in a different project with tighter access controls.

**Set up a CI/CD pipeline.** Terragrunt works well with GitHub Actions or Cloud Build. Run `terragrunt run --all plan` on pull requests and `terragrunt run --all apply` on merge to main.

**Use `prevent_destroy` lifecycle rules** on critical resources like databases and storage buckets. Terragrunt respects these Terraform lifecycle rules and will refuse to destroy protected resources.

## Wrapping Up

Terragrunt takes the pain out of managing Terraform across multiple GCP projects. By structuring your infrastructure with shared modules and a clear directory hierarchy, you get consistency, reduced duplication, and the ability to manage everything from a single command. The initial setup takes some time, but it pays off quickly as your GCP footprint grows.

If you are currently managing more than two or three GCP projects with Terraform, give Terragrunt a try. The reduction in boilerplate alone makes it worth the switch.
