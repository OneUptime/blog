# How to Create Docker Images with Terraform Docker Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, Docker Provider, Container Image, Infrastructure as Code, DevOps

Description: Learn how to build and manage Docker images using the Terraform Docker provider for consistent, declarative container image management as part of your infrastructure code.

---

Terraform is primarily known for managing cloud infrastructure, but its Docker provider extends that capability to local container management. You can build Docker images, pull images from registries, and manage the entire container lifecycle with the same declarative approach you use for cloud resources. In this guide, you will learn how to use the Terraform Docker provider to create and manage Docker images.

## Why Use Terraform for Docker Images

Most teams use separate tooling for building Docker images, typically a Dockerfile with `docker build` commands in a CI pipeline. Using Terraform for Docker images makes sense in specific scenarios:

- When your Docker images are tightly coupled with infrastructure that Terraform already manages
- When you want a single tool to manage both your infrastructure and the containers running on it
- When you need to manage Docker resources on local development machines or Docker hosts
- When you want declarative management of which images are available on a Docker host

## Prerequisites

Before you begin, you need:

- Terraform 1.0 or later
- Docker Engine installed and running
- The Docker socket accessible (usually at `/var/run/docker.sock`)
- Basic understanding of Docker and Terraform

## Configuring the Docker Provider

The Docker provider connects to the Docker daemon to manage resources. By default, it uses the local Docker socket.

```hcl
# Configure Terraform to use the Docker provider
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Configure the Docker provider
# Uses local Docker socket by default
provider "docker" {
  # For local Docker daemon, no additional config needed
  # For remote Docker hosts, specify the host:
  # host = "tcp://docker-host:2376/"
}
```

For remote Docker hosts with TLS, you can configure certificates:

```hcl
# Docker provider with TLS for remote host
provider "docker" {
  host = "tcp://docker-host:2376/"

  registry_auth {
    address  = "registry.example.com"
    username = var.registry_username
    password = var.registry_password
  }
}
```

## Pulling Docker Images from Registries

The most common operation is pulling images from container registries. The `docker_image` resource manages this.

```hcl
# Pull the latest nginx image
resource "docker_image" "nginx" {
  name = "nginx:latest"

  # Keep the image locally even if the tag is updated
  keep_locally = false
}

# Pull a specific version of PostgreSQL
resource "docker_image" "postgres" {
  name = "postgres:15.4-alpine"

  # Keep the image when destroying the resource
  keep_locally = true
}

# Pull from a private registry
resource "docker_image" "app" {
  name = "registry.example.com/myorg/myapp:v1.2.3"
}

# Pull multiple utility images
resource "docker_image" "redis" {
  name = "redis:7-alpine"
}

resource "docker_image" "node" {
  name = "node:20-alpine"
}
```

## Building Docker Images from Dockerfiles

You can build images directly from a Dockerfile using the `docker_image` resource with a build block.

```hcl
# Build a custom application image
resource "docker_image" "custom_app" {
  name = "myapp:latest"

  build {
    # Path to the directory containing the Dockerfile
    context = "${path.module}/app"

    # Optionally specify a different Dockerfile name
    dockerfile = "Dockerfile"

    # Build arguments passed to the Dockerfile
    build_args = {
      NODE_VERSION = "20"
      APP_ENV      = "production"
    }

    # Labels for the built image
    label = {
      "maintainer"  = "team@example.com"
      "version"     = "1.0.0"
      "description" = "Custom application image"
    }

    # Target a specific build stage in a multi-stage Dockerfile
    # target = "production"
  }
}
```

Here is an example Dockerfile that pairs with the above configuration:

```dockerfile
# Example Dockerfile at ./app/Dockerfile
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Building Multiple Image Variants

Use Terraform variables and loops to build multiple image variants from the same Dockerfile.

```hcl
# Define image variants
variable "image_variants" {
  description = "Map of image variants to build"
  type = map(object({
    tag        = string
    build_args = map(string)
    target     = string
  }))
  default = {
    development = {
      tag    = "dev"
      build_args = {
        NODE_ENV = "development"
        DEBUG    = "true"
      }
      target = "development"
    }
    production = {
      tag    = "prod"
      build_args = {
        NODE_ENV = "production"
        DEBUG    = "false"
      }
      target = "production"
    }
    test = {
      tag    = "test"
      build_args = {
        NODE_ENV = "test"
        DEBUG    = "true"
      }
      target = "test"
    }
  }
}

# Build each variant
resource "docker_image" "app_variants" {
  for_each = var.image_variants

  name = "myapp:${each.value.tag}"

  build {
    context    = "${path.module}/app"
    dockerfile = "Dockerfile"
    build_args = each.value.build_args
    target     = each.value.target

    label = {
      "variant" = each.key
      "version" = "1.0.0"
    }
  }
}
```

## Managing Image Registries

Configure authentication for multiple registries to pull and push images.

```hcl
# Provider with multiple registry authentications
provider "docker" {
  # Docker Hub
  registry_auth {
    address  = "registry-1.docker.io"
    username = var.dockerhub_username
    password = var.dockerhub_token
  }

  # AWS ECR
  registry_auth {
    address  = "${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com"
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }

  # GitHub Container Registry
  registry_auth {
    address  = "ghcr.io"
    username = var.github_username
    password = var.github_token
  }
}
```

## Tagging and Pushing Images

Use the `docker_tag` resource to tag images and push them to registries.

```hcl
# Build the image locally
resource "docker_image" "app_build" {
  name = "myapp:latest"

  build {
    context = "${path.module}/app"
  }
}

# Tag the image for ECR
resource "docker_tag" "app_ecr" {
  source_image = docker_image.app_build.name
  target_image = "${var.ecr_repository_url}:${var.image_tag}"
}

# Push to ECR using a provisioner
resource "docker_registry_image" "app_ecr" {
  name = "${var.ecr_repository_url}:${var.image_tag}"

  # Rebuild if the source changes
  keep_remotely = true

  depends_on = [docker_image.app_build]
}
```

## Using Data Sources to Reference Existing Images

Sometimes you need to reference images that already exist rather than pulling or building them.

```hcl
# Reference an existing local image
data "docker_image" "existing" {
  name = "myapp:latest"
}

# Use the image data in other resources
output "image_id" {
  value = data.docker_image.existing.id
}

# Get digest from a registry image
data "docker_registry_image" "nginx" {
  name = "nginx:latest"
}

# Pull with a specific digest for reproducibility
resource "docker_image" "nginx_pinned" {
  name          = data.docker_registry_image.nginx.name
  pull_triggers = [data.docker_registry_image.nginx.sha256_digest]
}
```

## Image Cleanup and Lifecycle Management

Manage image lifecycle to prevent disk space issues on Docker hosts.

```hcl
# Image with lifecycle rules
resource "docker_image" "managed_app" {
  name = "myapp:v1.0.0"

  # Remove the image when the resource is destroyed
  keep_locally = false

  # Force remove even if containers are using it
  force_remove = false

  build {
    context = "${path.module}/app"
  }

  # Trigger rebuild when Dockerfile changes
  triggers = {
    dockerfile_hash = filesha256("${path.module}/app/Dockerfile")
    source_hash     = sha256(join("", [
      for f in fileset("${path.module}/app/src", "**") :
      filesha256("${path.module}/app/src/${f}")
    ]))
  }
}
```

## Outputs

Export useful information about your images.

```hcl
# Output image details
output "app_image_id" {
  description = "The ID of the built application image"
  value       = docker_image.custom_app.image_id
}

output "app_image_name" {
  description = "The full name of the application image"
  value       = docker_image.custom_app.name
}

output "variant_images" {
  description = "Map of variant names to image IDs"
  value = {
    for k, v in docker_image.app_variants : k => v.image_id
  }
}
```

## Best Practices

When managing Docker images with Terraform, keep these practices in mind. Pin image versions instead of using `latest` tags for production workloads. Use the `triggers` block to rebuild images when source files change. Set `keep_locally = false` for images you do not need after destroying the Terraform resource. Use build arguments to create environment-specific image variants from a single Dockerfile. Store registry credentials in variables marked as sensitive and never commit them to version control.

## Monitoring Containers with OneUptime

Once your images are built and deployed as containers, monitor their health and performance with [OneUptime](https://oneuptime.com). Track container uptime, resource usage, and application-level metrics from a centralized dashboard.

## Conclusion

The Terraform Docker provider bridges the gap between infrastructure management and container management. While it may not replace dedicated CI/CD pipelines for complex build workflows, it is excellent for managing Docker images as part of your infrastructure code. Whether you are pulling images from registries, building custom images from Dockerfiles, or managing multiple image variants, the Docker provider gives you declarative control over your container images.

For the next step, learn how to use these images in [Docker containers with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-containers-with-terraform/view) and [Docker networks](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-networks-with-terraform/view).
