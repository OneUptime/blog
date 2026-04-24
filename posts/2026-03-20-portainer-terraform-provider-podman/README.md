# How to Use Portainer Terraform Provider with Podman - Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Podman, Infrastructure as Code, Automation, IaC

Description: Learn how to use the Portainer Terraform provider to manage Podman environments, stacks, and container configurations declaratively through Portainer's API.

---

The Portainer Terraform provider lets you manage Portainer resources (environments, stacks, registries, users) through Terraform's declarative configuration language. When Portainer manages a Podman environment, you can target it using the same Portainer environment and stack resources.

## Setting Up the Portainer Terraform Provider

```hcl
# versions.tf

terraform {
  required_providers {
    portainer = {
      source  = "portainer/portainer"
      version = "~> 1.0"
    }
  }
}

provider "portainer" {
  endpoint = "https://localhost:9443"
  api_key  = var.portainer_api_key  # Create in Portainer > My Account > Access tokens
  skip_ssl_verify = true            # Useful for Portainer's default self-signed certificate
}

# variables.tf
variable "portainer_api_key" {
  type      = string
  sensitive = true
}

variable "registry_username" {
  type = string
}

variable "registry_password" {
  type      = string
  sensitive = true
}
```

## Referencing a Podman Environment

In Portainer, add your Podman environment and note its name. Then reference it in Terraform:

```hcl
# data.tf
data "portainer_environment" "podman_host" {
  name = "podman-server"  # The environment name you set in Portainer
}
```

## Deploying a Stack to the Podman Environment

```hcl
# stacks.tf
resource "portainer_stack" "webapp" {
  name            = "webapp"
  deployment_type = "standalone"
  endpoint_id     = data.portainer_environment.podman_host.id
  method          = "string"

  stack_file_content = <<-EOT
    version: "3.8"
    services:
      nginx:
        image: nginx:alpine
        ports:
          - "8080:80"
    EOT

  env {
    name  = "APP_ENV"
    value = "production"
  }
}
```

## Managing Registries via Terraform

```hcl
resource "portainer_registry" "internal" {
  name           = "Internal Registry"
  type           = 3   # 3 = Custom registry
  url            = "registry.example.com"
  authentication = true
  username       = var.registry_username
  password       = var.registry_password
}
```

## Applying the Configuration

```bash
# Initialize Terraform
terraform init

# Set your API key
export TF_VAR_portainer_api_key="ptr_xxxxxxxxxxxx"

# If you're using the registry example
export TF_VAR_registry_username="registry-user"
export TF_VAR_registry_password="registry-password"

# Preview changes
terraform plan

# Apply
terraform apply
```

## Terraform State and Portainer

Terraform stores state about Portainer resources. When you `terraform destroy`, Portainer resources are removed. For stacks on Podman, this means the containers are stopped and removed.

Store Terraform state remotely (S3, Terraform Cloud) for team use:

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "portainer/terraform.tfstate"
    region = "us-east-1"
  }
}
```
