# How to Configure Docker Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, Providers, Containers, DevOps, Infrastructure as Code

Description: Learn how to configure the Terraform Docker provider to manage Docker containers, images, networks, and volumes as infrastructure code on local and remote Docker hosts.

---

The Docker provider for Terraform lets you manage Docker resources - containers, images, networks, and volumes - using the same declarative approach you use for cloud infrastructure. This is useful for local development environments, Docker-based CI/CD setups, and situations where you want Docker resources managed alongside your cloud infrastructure.

## When to Use the Docker Provider

The Docker provider fits well in these scenarios:

- **Local development environments** - Spin up databases, message queues, and other services for development
- **Integration testing** - Create and tear down containerized test environments
- **CI/CD infrastructure** - Manage Docker-based build agents and tools
- **Edge deployments** - Configure Docker on remote servers that are not running Kubernetes
- **Learning and prototyping** - Experiment with infrastructure-as-code concepts locally

For production container orchestration, you would typically use Kubernetes, ECS, or Cloud Run instead. But for everything else, the Docker provider is handy.

## Prerequisites

You need Docker installed and the Docker daemon running:

```bash
# Verify Docker is running
docker version

# Check the Docker socket exists (Linux/macOS)
ls -la /var/run/docker.sock
```

## Basic Provider Configuration

The minimum configuration connects to the local Docker daemon:

```hcl
# versions.tf
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# provider.tf
provider "docker" {
  # Connects to the local Docker daemon via the default socket
}
```

Note that the Docker provider is maintained by `kreuzwerker`, not by HashiCorp. The old `hashicorp/docker` provider is deprecated.

## Connecting to a Remote Docker Host

You can manage Docker on a remote machine by specifying the host:

```hcl
# Connect via TCP
provider "docker" {
  host = "tcp://docker-host.example.com:2376"
}

# Connect via SSH
provider "docker" {
  host = "ssh://user@docker-host.example.com"
}

# Connect to a specific Docker socket
provider "docker" {
  host = "unix:///var/run/docker.sock"
}
```

### Secure Remote Connection with TLS

For TCP connections, always use TLS:

```hcl
provider "docker" {
  host = "tcp://docker-host.example.com:2376"

  # TLS configuration
  registry_auth {
    address = "docker-host.example.com:2376"
  }

  # Alternatively, specify cert paths
  cert_path = pathexpand("~/.docker/certs")
}
```

Create the certificates directory with the required files:

```bash
# Your cert directory should contain:
# ca.pem     - CA certificate
# cert.pem   - Client certificate
# key.pem    - Client private key

ls ~/.docker/certs/
# ca.pem  cert.pem  key.pem
```

Or set environment variables:

```bash
export DOCKER_HOST="tcp://docker-host.example.com:2376"
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH="$HOME/.docker/certs"
```

```hcl
# Provider reads from environment variables when no host is specified
provider "docker" {}
```

## Managing Docker Images

Pull and manage Docker images:

```hcl
# Pull an image from Docker Hub
resource "docker_image" "nginx" {
  name = "nginx:1.27-alpine"

  # Keep the image locally even if the resource is removed from config
  keep_locally = false
}

# Pull from a private registry
resource "docker_image" "app" {
  name = "registry.example.com/myorg/app:latest"
}

# Build an image from a Dockerfile
resource "docker_image" "custom_app" {
  name = "my-custom-app:latest"

  build {
    context    = "${path.module}/docker"
    dockerfile = "Dockerfile"
    tag        = ["my-custom-app:latest", "my-custom-app:v1.0"]

    # Build arguments
    build_arg = {
      NODE_VERSION = "20"
      APP_ENV      = "production"
    }

    # Labels
    label = {
      "maintainer" = "team@example.com"
    }
  }
}
```

## Running Containers

Create and manage containers:

```hcl
# Simple container
resource "docker_container" "nginx" {
  name  = "nginx-web"
  image = docker_image.nginx.image_id

  ports {
    internal = 80
    external = 8080
  }

  # Restart policy
  restart = "unless-stopped"
}

# Container with volumes and environment variables
resource "docker_container" "postgres" {
  name  = "postgres-db"
  image = docker_image.postgres.image_id

  # Environment variables
  env = [
    "POSTGRES_USER=myapp",
    "POSTGRES_PASSWORD=secretpassword",
    "POSTGRES_DB=myapp_db",
  ]

  # Port mapping
  ports {
    internal = 5432
    external = 5432
  }

  # Mount a volume for data persistence
  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  # Health check
  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U myapp"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }

  # Resource limits
  memory = 512  # MB

  restart = "unless-stopped"
}

resource "docker_image" "postgres" {
  name = "postgres:16-alpine"
}
```

## Managing Networks

Create Docker networks for container communication:

```hcl
# Create a bridge network
resource "docker_network" "app_network" {
  name   = "app-network"
  driver = "bridge"

  # Custom subnet
  ipam_config {
    subnet  = "172.20.0.0/16"
    gateway = "172.20.0.1"
  }

  # Labels
  labels {
    label = "environment"
    value = "development"
  }
}

# Attach containers to the network
resource "docker_container" "app" {
  name  = "my-app"
  image = docker_image.app.image_id

  networks_advanced {
    name    = docker_network.app_network.name
    aliases = ["app", "web"]
  }
}

resource "docker_container" "db" {
  name  = "my-db"
  image = docker_image.postgres.image_id

  networks_advanced {
    name    = docker_network.app_network.name
    aliases = ["db", "database"]
  }

  env = [
    "POSTGRES_PASSWORD=secretpassword",
  ]
}
```

## Managing Volumes

Create persistent volumes:

```hcl
# Named volume
resource "docker_volume" "postgres_data" {
  name = "postgres-data"

  labels {
    label = "service"
    value = "database"
  }
}

resource "docker_volume" "app_uploads" {
  name = "app-uploads"
}
```

## Registry Authentication

To pull images from private registries:

```hcl
provider "docker" {
  # Docker Hub authentication
  registry_auth {
    address  = "registry-1.docker.io"
    username = var.dockerhub_username
    password = var.dockerhub_token
  }

  # GitHub Container Registry
  registry_auth {
    address  = "ghcr.io"
    username = var.github_username
    password = var.github_token
  }

  # AWS ECR
  registry_auth {
    address  = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }

  # Google Artifact Registry
  registry_auth {
    address  = "${var.gcp_region}-docker.pkg.dev"
    username = "oauth2accesstoken"
    password = data.google_service_account_access_token.default.access_token
  }
}
```

## Full Development Environment Example

Here is a complete example that sets up a local development environment with a web app, database, and cache:

```hcl
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

# Network for all services
resource "docker_network" "dev" {
  name = "dev-network"
}

# PostgreSQL database
resource "docker_image" "postgres" {
  name = "postgres:16-alpine"
}

resource "docker_volume" "pg_data" {
  name = "dev-pg-data"
}

resource "docker_container" "postgres" {
  name  = "dev-postgres"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_USER=devuser",
    "POSTGRES_PASSWORD=devpassword",
    "POSTGRES_DB=myapp",
  ]

  ports {
    internal = 5432
    external = 5432
  }

  volumes {
    volume_name    = docker_volume.pg_data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name = docker_network.dev.name
  }

  restart = "unless-stopped"
}

# Redis cache
resource "docker_image" "redis" {
  name = "redis:7-alpine"
}

resource "docker_container" "redis" {
  name  = "dev-redis"
  image = docker_image.redis.image_id

  ports {
    internal = 6379
    external = 6379
  }

  networks_advanced {
    name = docker_network.dev.name
  }

  restart = "unless-stopped"
}

# Outputs for connection strings
output "postgres_connection" {
  value = "postgresql://devuser:devpassword@localhost:5432/myapp"
}

output "redis_connection" {
  value = "redis://localhost:6379"
}
```

Run it:

```bash
terraform init
terraform apply

# Your development services are now running
# Connect with the output connection strings

# Tear down when done
terraform destroy
```

## Troubleshooting

### "Cannot connect to the Docker daemon"

The Docker daemon is not running or the socket is not accessible:

```bash
# Check Docker status
sudo systemctl status docker

# Start Docker
sudo systemctl start docker

# Check socket permissions
ls -la /var/run/docker.sock
# Add your user to the docker group if needed
sudo usermod -aG docker $USER
```

### "Image not found" or Pull Errors

Registry authentication may be misconfigured:

```bash
# Test that Docker can pull the image directly
docker pull your-image:tag

# Log in to the registry
docker login registry.example.com
```

### Container Keeps Restarting

Check the container logs:

```bash
docker logs dev-postgres
```

The container may be failing due to configuration issues, missing environment variables, or port conflicts.

## Summary

The Docker provider brings infrastructure-as-code to your Docker resources. It is especially useful for local development environments and testing setups where you want repeatable, version-controlled container configurations. Configure it against the local socket for development, use TLS-secured TCP for remote hosts, and set up registry authentication for private images. While it is not a replacement for Kubernetes or cloud container services in production, it fills the gap nicely for local and edge use cases.
