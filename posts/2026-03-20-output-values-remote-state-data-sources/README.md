# How to Use Output Values in Remote State Data Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Remote State, Data Source, Output, HCL, Infrastructure as Code, DevOps

Description: Learn how to read output values from another OpenTofu configuration's remote state using the terraform_remote_state data source.

---

The `terraform_remote_state` data source lets you read output values from another OpenTofu configuration's state file. This is the standard way to share infrastructure values between separate OpenTofu configurations - for example, reading VPC IDs from a networking configuration in an application configuration.

---

## Why Use Remote State Data Sources?

Instead of hardcoding IDs or duplicating resources, reference the outputs of a separate infrastructure configuration:

```text
networking-config/
  → outputs: vpc_id, subnet_ids
  → state stored in s3://my-state/networking.tfstate

application-config/
  → reads vpc_id, subnet_ids from networking state
  → deploys app resources in the correct VPC
```

---

## Configure the Remote State Data Source

```hcl
# In your application configuration - read from networking state

data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Now reference the networking configuration's outputs

resource "aws_eks_cluster" "main" {
  name = "my-cluster"

  vpc_config {
    # Read subnet IDs from the networking configuration's outputs
    subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
  }
}
```

---

## Example: Multi-Tier Architecture

```hcl
# infrastructure.tf - app config reading from base infra state

# Read the base infrastructure state (VPC, subnets)
data "terraform_remote_state" "base" {
  backend = "s3"
  config = {
    bucket = "company-terraform-state"
    key    = "base/terraform.tfstate"
    region = "us-east-1"
  }
}

# Read the platform state (EKS cluster, RDS)
data "terraform_remote_state" "platform" {
  backend = "s3"
  config = {
    bucket = "company-terraform-state"
    key    = "platform/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use outputs from both states
resource "kubernetes_namespace" "app" {
  metadata {
    name = "my-application"

    annotations = {
      "vpc-id"      = data.terraform_remote_state.base.outputs.vpc_id
      "cluster-id"  = data.terraform_remote_state.platform.outputs.eks_cluster_id
    }
  }
}
```

---

## Using Different Backends

```hcl
# Local backend (for testing)
data "terraform_remote_state" "networking" {
  backend = "local"
  config = {
    path = "../networking/terraform.tfstate"
  }
}

# Terraform Cloud / HCP Terraform backend
data "terraform_remote_state" "networking" {
  backend = "remote"
  config = {
    organization = "my-org"
    workspaces = {
      name = "networking-production"
    }
  }
}
```

---

## Access All Outputs from Remote State

```hcl
# The .outputs attribute exposes all outputs as an object
locals {
  # Store outputs locally for cleaner references
  net = data.terraform_remote_state.networking.outputs
}

resource "aws_security_group" "app" {
  vpc_id = local.net.vpc_id

  ingress {
    cidr_blocks = [local.net.vpc_cidr_block]
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
  }
}
```

---

## Handle Missing Outputs Gracefully

```hcl
# Use try() to provide a fallback if an output doesn't exist in the remote state
locals {
  custom_domain = try(
    data.terraform_remote_state.platform.outputs.custom_domain,
    "default.example.com"  # fallback if output doesn't exist
  )
}
```

---

## Summary

`terraform_remote_state` data sources let separate OpenTofu configurations share infrastructure values through outputs. Configure the `backend` and `config` to point to the source configuration's state, then access its outputs via `.outputs.<output_name>`. This pattern enables modular infrastructure where networking, platform, and application configurations are independently managed but can share values.
