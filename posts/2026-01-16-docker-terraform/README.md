# How to Manage Docker with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Terraform, IaC, DevOps, Infrastructure

Description: Learn how to manage Docker containers, images, networks, and volumes using Terraform for infrastructure as code, including remote Docker hosts and CI/CD integration.

---

Terraform's Docker provider enables managing Docker resources declaratively as infrastructure as code. This approach brings version control, reproducibility, and automation to container deployments.

## Provider Setup

### Basic Configuration

```hcl
# main.tf
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  # Uses local Docker socket by default
}
```

### Remote Docker Host

```hcl
provider "docker" {
  host = "tcp://remote-docker:2376/"

  # With TLS
  cert_path = pathexpand("~/.docker/certs")
}
```

### SSH Connection

```hcl
provider "docker" {
  host = "ssh://user@remote-host:22"
}
```

## Managing Images

### Pull Images

```hcl
resource "docker_image" "nginx" {
  name         = "nginx:latest"
  keep_locally = false
}

resource "docker_image" "postgres" {
  name         = "postgres:15"
  keep_locally = true
}
```

### Build Images

```hcl
resource "docker_image" "app" {
  name = "myapp:latest"

  build {
    context    = "${path.module}/app"
    dockerfile = "Dockerfile"

    build_args = {
      VERSION = var.app_version
    }

    labels = {
      maintainer = "team@example.com"
    }
  }
}
```

### Registry Authentication

```hcl
resource "docker_registry_image" "app" {
  name = "registry.example.com/myapp:${var.version}"

  build {
    context = "${path.module}/app"
  }
}

# Pull from private registry
resource "docker_image" "private_app" {
  name = "registry.example.com/myapp:latest"
}
```

## Managing Containers

### Basic Container

```hcl
resource "docker_container" "nginx" {
  name  = "nginx"
  image = docker_image.nginx.image_id

  ports {
    internal = 80
    external = 8080
  }
}
```

### Container with Volumes

```hcl
resource "docker_container" "app" {
  name  = "app"
  image = docker_image.app.image_id

  volumes {
    volume_name    = docker_volume.app_data.name
    container_path = "/data"
  }

  volumes {
    host_path      = "${path.cwd}/config"
    container_path = "/app/config"
    read_only      = true
  }
}
```

### Environment and Commands

```hcl
resource "docker_container" "api" {
  name  = "api"
  image = docker_image.app.image_id

  env = [
    "NODE_ENV=production",
    "DATABASE_URL=${var.database_url}",
    "SECRET_KEY=${var.secret_key}"
  ]

  command = ["node", "server.js"]

  working_dir = "/app"
  user        = "node"
}
```

### Health Checks

```hcl
resource "docker_container" "web" {
  name  = "web"
  image = docker_image.nginx.image_id

  healthcheck {
    test         = ["CMD", "curl", "-f", "http://localhost/health"]
    interval     = "30s"
    timeout      = "5s"
    retries      = 3
    start_period = "10s"
  }
}
```

### Resource Limits

```hcl
resource "docker_container" "worker" {
  name  = "worker"
  image = docker_image.app.image_id

  memory      = 512  # MB
  memory_swap = 1024 # MB
  cpu_shares  = 1024

  # CPU quota (in microseconds per 100ms period)
  cpu_set = "0-1"
}
```

### Restart Policy

```hcl
resource "docker_container" "service" {
  name  = "service"
  image = docker_image.app.image_id

  restart = "unless-stopped"
  # Options: no, on-failure, always, unless-stopped
}
```

## Managing Networks

### Create Network

```hcl
resource "docker_network" "app_network" {
  name   = "app-network"
  driver = "bridge"

  ipam_config {
    subnet  = "172.28.0.0/16"
    gateway = "172.28.0.1"
  }
}
```

### Connect Containers to Network

```hcl
resource "docker_container" "api" {
  name  = "api"
  image = docker_image.app.image_id

  networks_advanced {
    name         = docker_network.app_network.name
    aliases      = ["api", "backend"]
    ipv4_address = "172.28.0.10"
  }
}

resource "docker_container" "web" {
  name  = "web"
  image = docker_image.nginx.image_id

  networks_advanced {
    name = docker_network.app_network.name
  }

  depends_on = [docker_container.api]
}
```

## Managing Volumes

### Create Volume

```hcl
resource "docker_volume" "data" {
  name = "app-data"

  labels {
    label = "project"
    value = "myapp"
  }
}
```

### Volume with Driver Options

```hcl
resource "docker_volume" "nfs_volume" {
  name   = "nfs-data"
  driver = "local"

  driver_opts = {
    type   = "nfs"
    o      = "addr=nfs-server.example.com,rw"
    device = ":/exports/data"
  }
}
```

## Complete Application Stack

```hcl
# variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# main.tf
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

# Network
resource "docker_network" "app" {
  name = "app-${var.environment}"
}

# Volumes
resource "docker_volume" "postgres_data" {
  name = "postgres-data-${var.environment}"
}

resource "docker_volume" "redis_data" {
  name = "redis-data-${var.environment}"
}

# Images
resource "docker_image" "postgres" {
  name = "postgres:15"
}

resource "docker_image" "redis" {
  name = "redis:7"
}

resource "docker_image" "nginx" {
  name = "nginx:alpine"
}

resource "docker_image" "app" {
  name = "myapp:latest"
  build {
    context = "${path.module}/app"
  }
}

# Database
resource "docker_container" "postgres" {
  name  = "postgres-${var.environment}"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_PASSWORD=${var.db_password}",
    "POSTGRES_DB=myapp"
  ]

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name    = docker_network.app.name
    aliases = ["db", "postgres"]
  }

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U postgres"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }

  restart = "unless-stopped"
}

# Redis
resource "docker_container" "redis" {
  name  = "redis-${var.environment}"
  image = docker_image.redis.image_id

  volumes {
    volume_name    = docker_volume.redis_data.name
    container_path = "/data"
  }

  networks_advanced {
    name    = docker_network.app.name
    aliases = ["redis", "cache"]
  }

  command = ["redis-server", "--appendonly", "yes"]
  restart = "unless-stopped"
}

# Application
resource "docker_container" "app" {
  count = 2
  name  = "app-${var.environment}-${count.index}"
  image = docker_image.app.image_id

  env = [
    "NODE_ENV=${var.environment}",
    "DATABASE_URL=postgresql://postgres:${var.db_password}@db:5432/myapp",
    "REDIS_URL=redis://redis:6379"
  ]

  networks_advanced {
    name    = docker_network.app.name
    aliases = ["app"]
  }

  depends_on = [
    docker_container.postgres,
    docker_container.redis
  ]

  restart = "unless-stopped"
}

# Nginx Load Balancer
resource "docker_container" "nginx" {
  name  = "nginx-${var.environment}"
  image = docker_image.nginx.image_id

  ports {
    internal = 80
    external = 8080
  }

  volumes {
    host_path      = "${path.cwd}/nginx.conf"
    container_path = "/etc/nginx/nginx.conf"
    read_only      = true
  }

  networks_advanced {
    name = docker_network.app.name
  }

  depends_on = [docker_container.app]
  restart    = "unless-stopped"
}

# outputs.tf
output "nginx_url" {
  value = "http://localhost:8080"
}

output "container_ids" {
  value = {
    nginx    = docker_container.nginx.id
    postgres = docker_container.postgres.id
    redis    = docker_container.redis.id
    app      = docker_container.app[*].id
  }
}
```

## Using Data Sources

### Query Existing Resources

```hcl
# Get existing network
data "docker_network" "existing" {
  name = "existing-network"
}

# Get existing image
data "docker_image" "nginx" {
  name = "nginx:latest"
}

# Use in container
resource "docker_container" "app" {
  name  = "app"
  image = data.docker_image.nginx.id

  networks_advanced {
    name = data.docker_network.existing.name
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy with Terraform

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -var="db_password=${{ secrets.DB_PASSWORD }}"

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve -var="db_password=${{ secrets.DB_PASSWORD }}"
```

## Best Practices

### State Management

```hcl
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "docker/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Sensitive Variables

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

# Use in environment
env = [
  "DB_PASSWORD=${var.db_password}"
]
```

### Module Structure

```
modules/
├── docker-app/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── docker-database/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

## Summary

| Resource | Use Case |
|----------|----------|
| docker_image | Pull or build images |
| docker_container | Create and manage containers |
| docker_network | Define container networks |
| docker_volume | Persistent storage |
| docker_registry_image | Push to registries |

Terraform provides declarative, version-controlled Docker infrastructure management. Use it for reproducible deployments, multi-environment management, and CI/CD integration. For deploying with Ansible as an alternative, see our post on [Deploying Docker with Ansible](https://oneuptime.com/blog/post/2026-01-16-docker-ansible/view).

