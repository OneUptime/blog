# How to Pull Docker Images with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker, Infrastructure as Code, IaC, Docker Images

Description: Learn how to pull and manage Docker images from public and private registries using OpenTofu.

## Introduction

This guide covers how to pull Docker images with OpenTofu using the Docker provider with production-ready configurations, best practices, and practical examples.

## Prerequisites

- OpenTofu v1.6+
- Access to a Docker daemon
- If you are using a private registry, authenticate with `docker login` or prepare a Docker config file

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "4.2.0"
    }
  }
}

provider "docker" {
  host = var.docker_host

  # Uncomment this block when pulling from a private registry.
  # registry_auth {
  #   address     = var.registry_address
  #   config_file = pathexpand("~/.docker/config.json")
  # }
}
```

## Step 2: Define Variables

```hcl
variable "docker_host" {
  description = "Docker daemon endpoint"
  type        = string
  default     = "unix:///var/run/docker.sock"
}

variable "image_name" {
  description = "Docker image to pull"
  type        = string
  default     = "nginx:1.28.0"
}

variable "keep_locally" {
  description = "Keep the image on the host when the resource is destroyed"
  type        = bool
  default     = true
}

variable "registry_address" {
  description = "Registry address used for private registry authentication"
  type        = string
  default     = "registry-1.docker.io"
}
```

## Step 3: Read Registry Metadata

```hcl
data "docker_registry_image" "app" {
  name = var.image_name
}
```

## Step 4: Pull the Image

```hcl
resource "docker_image" "app" {
  name          = data.docker_registry_image.app.name
  pull_triggers = [data.docker_registry_image.app.sha256_digest]
  keep_locally  = var.keep_locally
}
```

## Step 5: Add Private Registry Authentication

Add the following block inside `provider "docker"` when using a private registry:

```hcl
registry_auth {
  address     = var.registry_address
  config_file = pathexpand("~/.docker/config.json")
}
```

## Step 6: Define Outputs

```hcl
output "image_id" {
  value = docker_image.app.image_id
}

output "repo_digest" {
  value = docker_image.app.repo_digest
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Pin images to a specific tag or digest instead of relying on `latest`
- Use `docker_registry_image` with `pull_triggers` when you want OpenTofu to repull an image after the remote digest changes
- Keep registry credentials out of your configuration and prefer `docker login` or a Docker config file
- Use `keep_locally = true` if the image should remain on the host when the OpenTofu resource is destroyed
- Set the correct `registry_auth.address` value for private registries

## Conclusion

You have successfully configured how to pull Docker images with OpenTofu using the Docker provider. This approach lets you manage image versions as code and repull images when the remote digest changes. For private registries, add `registry_auth` and reuse your existing Docker credentials.
