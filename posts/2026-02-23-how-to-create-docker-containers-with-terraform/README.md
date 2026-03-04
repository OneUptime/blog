# How to Create Docker Containers with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, Containers, Docker Provider, Infrastructure as Code, DevOps

Description: Learn how to create and manage Docker containers using Terraform including container configuration, networking, volumes, health checks, and resource limits.

---

Managing Docker containers with Terraform brings the same declarative infrastructure-as-code approach to your container workloads that you use for cloud resources. Instead of running imperative `docker run` commands, you define your desired container state in HCL and let Terraform handle the rest. This guide covers everything from basic container creation to advanced configurations including health checks, resource limits, and restart policies.

## Why Manage Containers with Terraform

Using Terraform for Docker containers makes sense when you want a unified workflow for both infrastructure and container management. It is especially useful for local development environments, single-host Docker deployments, and testing scenarios where you need reproducible container configurations. Terraform tracks the state of your containers, making updates and teardowns predictable.

## Prerequisites

You need the following to follow along:

- Terraform 1.0 or later
- Docker Engine installed and running
- The Docker provider for Terraform (kreuzwerker/docker)
- Basic knowledge of Docker and Terraform

## Provider Configuration

```hcl
# Configure Terraform with the Docker provider
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Use the local Docker daemon
provider "docker" {}
```

## Creating a Basic Container

The simplest container configuration pulls an image and runs it.

```hcl
# Pull the nginx image
resource "docker_image" "nginx" {
  name = "nginx:1.25-alpine"
}

# Create and run an nginx container
resource "docker_container" "web" {
  name  = "web-server"
  image = docker_image.nginx.image_id

  # Map container port 80 to host port 8080
  ports {
    internal = 80
    external = 8080
    protocol = "tcp"
  }

  # Container will start automatically
  must_run = true
}
```

## Container with Environment Variables

Pass configuration to your container through environment variables.

```hcl
# Pull the application image
resource "docker_image" "app" {
  name = "node:20-alpine"
}

# Container with environment variables
resource "docker_container" "app" {
  name  = "my-application"
  image = docker_image.app.image_id

  # Set environment variables
  env = [
    "NODE_ENV=production",
    "PORT=3000",
    "DATABASE_URL=postgresql://db:5432/myapp",
    "REDIS_URL=redis://cache:6379",
    "LOG_LEVEL=info",
  ]

  # Port mapping
  ports {
    internal = 3000
    external = 3000
  }

  # Override the default command
  command = ["node", "server.js"]

  # Set the working directory inside the container
  working_dir = "/app"

  must_run = true
}
```

## Container with Volume Mounts

Mount host directories or Docker volumes into your container.

```hcl
# Create a Docker volume for persistent data
resource "docker_volume" "postgres_data" {
  name = "postgres-data"
}

# Pull PostgreSQL image
resource "docker_image" "postgres" {
  name = "postgres:15-alpine"
}

# PostgreSQL container with volume mount
resource "docker_container" "postgres" {
  name  = "postgres-db"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_DB=myapp",
    "POSTGRES_USER=admin",
    "POSTGRES_PASSWORD=secretpassword",
  ]

  # Mount the named volume for data persistence
  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  # Mount a local directory for initialization scripts
  volumes {
    host_path      = "${path.cwd}/init-scripts"
    container_path = "/docker-entrypoint-initdb.d"
    read_only      = true
  }

  ports {
    internal = 5432
    external = 5432
  }

  must_run = true
}
```

## Container with Health Checks

Health checks let Docker monitor whether your container is functioning correctly.

```hcl
# Container with health check configuration
resource "docker_container" "api" {
  name  = "api-server"
  image = docker_image.app.image_id

  env = [
    "PORT=3000",
  ]

  ports {
    internal = 3000
    external = 3000
  }

  # Health check configuration
  healthcheck {
    # Command to check container health
    test = ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]

    # Time between health checks
    interval = "30s"

    # Time to wait for a health check to complete
    timeout = "10s"

    # Number of retries before marking unhealthy
    retries = 3

    # Grace period before health checks start
    start_period = "40s"
  }

  must_run = true
}
```

## Container with Resource Limits

Control how much CPU and memory your containers can use.

```hcl
# Container with resource constraints
resource "docker_container" "worker" {
  name  = "background-worker"
  image = docker_image.app.image_id

  command = ["node", "worker.js"]

  env = [
    "WORKER_CONCURRENCY=4",
  ]

  # Memory limits
  memory      = 512    # Hard limit in MB
  memory_swap = 1024   # Memory + swap limit in MB

  # CPU limits
  cpu_shares = 512     # Relative CPU weight (default 1024)
  cpu_set    = "0,1"   # Pin to specific CPU cores

  # Restart policy
  restart = "unless-stopped"

  must_run = true
}
```

## Container with Network Configuration

Connect containers to Docker networks for inter-container communication.

```hcl
# Create a custom Docker network
resource "docker_network" "app_network" {
  name   = "app-network"
  driver = "bridge"
}

# Application container on the custom network
resource "docker_container" "app_networked" {
  name  = "app-networked"
  image = docker_image.app.image_id

  # Connect to the custom network
  networks_advanced {
    name    = docker_network.app_network.name
    aliases = ["app", "api"]  # DNS aliases on this network
  }

  ports {
    internal = 3000
    external = 3000
  }

  env = [
    "DATABASE_URL=postgresql://postgres-db:5432/myapp",
    "REDIS_URL=redis://redis-cache:6379",
  ]

  must_run = true
}

# Database container on the same network
resource "docker_container" "db_networked" {
  name  = "postgres-networked"
  image = docker_image.postgres.image_id

  networks_advanced {
    name    = docker_network.app_network.name
    aliases = ["postgres-db", "database"]
  }

  env = [
    "POSTGRES_DB=myapp",
    "POSTGRES_USER=admin",
    "POSTGRES_PASSWORD=secretpassword",
  ]

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  must_run = true
}
```

## Container with Labels and Logging

Add metadata labels and configure logging drivers.

```hcl
# Container with labels and logging configuration
resource "docker_container" "labeled_app" {
  name  = "labeled-app"
  image = docker_image.app.image_id

  # Labels for service discovery and management
  labels {
    label = "com.example.service"
    value = "api"
  }

  labels {
    label = "com.example.version"
    value = "1.0.0"
  }

  labels {
    label = "com.example.environment"
    value = "production"
  }

  # Configure logging driver
  log_driver = "json-file"

  log_opts = {
    "max-size" = "10m"
    "max-file" = "3"
    "tag"      = "{{.Name}}/{{.ID}}"
  }

  ports {
    internal = 3000
    external = 3000
  }

  must_run = true
}
```

## Multi-Container Application Stack

Combine multiple containers into a complete application stack.

```hcl
# Network for the stack
resource "docker_network" "stack" {
  name = "app-stack"
}

# Redis cache
resource "docker_image" "redis" {
  name = "redis:7-alpine"
}

resource "docker_container" "redis" {
  name  = "stack-redis"
  image = docker_image.redis.image_id

  networks_advanced {
    name    = docker_network.stack.name
    aliases = ["redis", "cache"]
  }

  # Resource limits for cache
  memory = 256

  # Restart automatically
  restart = "unless-stopped"

  healthcheck {
    test     = ["CMD", "redis-cli", "ping"]
    interval = "10s"
    timeout  = "5s"
    retries  = 3
  }

  must_run = true
}

# Application container
resource "docker_container" "stack_app" {
  name  = "stack-app"
  image = docker_image.app.image_id

  networks_advanced {
    name    = docker_network.stack.name
    aliases = ["app", "api"]
  }

  env = [
    "NODE_ENV=production",
    "PORT=3000",
    "REDIS_URL=redis://redis:6379",
    "DATABASE_URL=postgresql://admin:secretpassword@postgres:5432/myapp",
  ]

  ports {
    internal = 3000
    external = 3000
  }

  memory  = 512
  restart = "unless-stopped"

  # Wait for dependencies to be ready
  depends_on = [
    docker_container.redis,
    docker_container.db_networked,
  ]

  must_run = true
}
```

## Outputs

Export useful container information.

```hcl
# Output container details
output "web_container_id" {
  description = "ID of the web container"
  value       = docker_container.web.id
}

output "web_url" {
  description = "URL to access the web server"
  value       = "http://localhost:${docker_container.web.ports[0].external}"
}

output "app_ip_address" {
  description = "IP address of the app container"
  value       = docker_container.app_networked.network_data[0].ip_address
}
```

## Best Practices

When managing Docker containers with Terraform, follow these guidelines. Always use specific image tags instead of `latest` to ensure reproducibility. Set resource limits on containers to prevent any single container from consuming all host resources. Use health checks for all application containers so Docker can detect and report failures. Configure restart policies for containers that should survive host reboots. Use Docker networks instead of container links for inter-container communication. Store sensitive environment variables in Terraform variables marked as sensitive.

## Monitoring with OneUptime

Keep track of your container health and performance with [OneUptime](https://oneuptime.com). Monitor container uptime, track resource utilization, and get alerted when containers become unhealthy or restart unexpectedly.

## Conclusion

Terraform provides a powerful declarative approach to managing Docker containers. From simple single-container deployments to complex multi-container stacks, you can define your entire container infrastructure as code. This makes your deployments reproducible, version-controlled, and easy to tear down and recreate. Combined with Docker networks and volumes, you can build complete application environments that are fully managed through Terraform.

For more Docker with Terraform content, check out our guides on [Docker images](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-images-with-terraform-docker-provider/view), [Docker networks](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-networks-with-terraform/view), and [Docker volumes](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-volumes-with-terraform/view).
