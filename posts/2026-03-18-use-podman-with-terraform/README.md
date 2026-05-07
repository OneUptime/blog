# How to Use Podman with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Terraform, Infrastructure as Code, Container, DevOps

Description: Learn how to use Podman with Terraform to manage container infrastructure as code, provision containerized services, and integrate container deployments into your IaC workflow.

---

> Combining Podman with Terraform lets you manage container infrastructure alongside your cloud resources using the same declarative, state-managed approach that makes Terraform powerful.

Terraform is the industry standard for infrastructure as code, and while it is commonly associated with cloud providers, it also works well for managing local container infrastructure. Using Terraform with Podman lets you define your container topology declaratively, track state changes, and manage the complete lifecycle of containers, networks, and volumes through the same workflow you use for cloud resources. This is particularly useful when your application spans both cloud infrastructure and local container services.

---

## Setting Up the Terraform Docker Provider

While the Terraform Registry includes community Podman providers, the Docker provider also works with Podman through its Docker-compatible API socket. On Linux systems that use systemd, first enable the Podman socket:

```bash
# Enable rootless Podman socket

systemctl --user enable --now podman.socket

# Verify Podman is available
podman info

# Verify the API socket
curl --unix-socket "$XDG_RUNTIME_DIR/podman/podman.sock" http://d/_ping
```

Configure the Terraform provider to use the Podman socket:

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
  host = "unix:///run/user/${var.uid}/podman/podman.sock"
}

variable "uid" {
  description = "User ID for Podman socket path"
  type        = string
  default     = "1000"
}
```

If your user ID is not `1000`, set `uid` to match your actual user ID so the socket path resolves correctly.

Initialize Terraform:

```bash
terraform init
```

## Managing Container Images

Pull and manage container images through Terraform:

```hcl
# images.tf
resource "docker_image" "app" {
  name         = "myapp:${var.app_version}"
  keep_locally = true
}

resource "docker_image" "postgres" {
  name         = "postgres:16"
  keep_locally = true
}

resource "docker_image" "redis" {
  name         = "redis:7-alpine"
  keep_locally = true
}

resource "docker_image" "nginx" {
  name         = "nginx:1.25"
  keep_locally = true
}
```

## Defining Networks and Volumes

Create the networking and storage infrastructure:

```hcl
# infrastructure.tf
resource "docker_network" "app_network" {
  name   = "app-network"
  driver = "bridge"

  ipam_config {
    subnet  = "172.20.0.0/16"
    gateway = "172.20.0.1"
  }
}

resource "docker_network" "db_network" {
  name     = "db-network"
  driver   = "bridge"
  internal = true
}

resource "docker_volume" "postgres_data" {
  name = "postgres-data"
}

resource "docker_volume" "redis_data" {
  name = "redis-data"
}

resource "docker_volume" "app_uploads" {
  name = "app-uploads"
}
```

## Deploying a Full Application Stack

Define containers with proper dependencies and configuration:

```hcl
# containers.tf
resource "docker_container" "postgres" {
  name  = "app-postgres"
  image = docker_image.postgres.image_id

  restart = "always"

  networks_advanced {
    name = docker_network.db_network.name
  }

  env = [
    "POSTGRES_USER=app",
    "POSTGRES_PASSWORD=${var.db_password}",
    "POSTGRES_DB=production",
  ]

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  memory = 1024

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U app"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }
}

resource "docker_container" "redis" {
  name  = "app-redis"
  image = docker_image.redis.image_id

  restart = "always"

  networks_advanced {
    name = docker_network.db_network.name
  }

  command = ["redis-server", "--requirepass", var.redis_password]

  volumes {
    volume_name    = docker_volume.redis_data.name
    container_path = "/data"
  }

  memory = 512
}

resource "docker_container" "app" {
  name  = "app-web"
  image = docker_image.app.image_id

  restart = "always"

  networks_advanced {
    name = docker_network.app_network.name
  }

  networks_advanced {
    name = docker_network.db_network.name
  }

  ports {
    internal = 3000
    external = 8080
  }

  env = [
    "DATABASE_URL=postgresql://app:${var.db_password}@app-postgres:5432/production",
    "REDIS_URL=redis://:${var.redis_password}@app-redis:6379",
    "NODE_ENV=production",
  ]

  volumes {
    volume_name    = docker_volume.app_uploads.name
    container_path = "/app/uploads"
  }

  memory = 2048

  depends_on = [
    docker_container.postgres,
    docker_container.redis,
  ]
}

resource "docker_container" "nginx" {
  name  = "app-nginx"
  image = docker_image.nginx.image_id

  restart = "always"

  networks_advanced {
    name = docker_network.app_network.name
  }

  ports {
    internal = 80
    external = 80
  }

  ports {
    internal = 443
    external = 443
  }

  volumes {
    host_path      = "${path.root}/nginx/conf.d"
    container_path = "/etc/nginx/conf.d"
    read_only      = true
  }

  depends_on = [
    docker_container.app,
  ]
}
```

## Variables and Secrets

Manage configuration with Terraform variables. Marking a variable as `sensitive` redacts it in CLI output, but Terraform still stores the value in state:

```hcl
# variables.tf
variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
}

variable "app_version" {
  description = "Application version tag"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
```

Create a `terraform.tfvars` file (excluded from version control):

```hcl
# terraform.tfvars
db_password    = "secure-db-password"
redis_password = "secure-redis-password"
app_version    = "v2.1.0"
```

## Outputs

Export useful information about the deployed infrastructure:

```hcl
# outputs.tf
output "app_url" {
  value = "http://localhost:${docker_container.nginx.ports[0].external}"
}

output "container_ids" {
  value = {
    app      = docker_container.app.id
    postgres = docker_container.postgres.id
    redis    = docker_container.redis.id
    nginx    = docker_container.nginx.id
  }
}

output "network_info" {
  value = {
    app_network = docker_network.app_network.id
    db_network  = docker_network.db_network.id
  }
}
```

## Using Terraform Modules

Organize reusable container patterns into modules:

```hcl
# modules/web-app/main.tf
variable "name" {
  type = string
}

variable "image_id" {
  type = string
}

variable "port" {
  type = number
}

variable "env" {
  type    = map(string)
  default = {}
}

variable "network_name" {
  type = string
}

resource "docker_container" "app" {
  name    = var.name
  image   = var.image_id
  restart = "always"

  networks_advanced {
    name = var.network_name
  }

  ports {
    internal = var.port
    external = var.port
  }

  env = [for k, v in var.env : "${k}=${v}"]
}

output "container_id" {
  value = docker_container.app.id
}
```

Use the module:

```hcl
# main.tf
module "api_service" {
  source       = "./modules/web-app"
  name         = "api-service"
  image_id     = docker_image.app.image_id
  port         = 3000
  network_name = docker_network.app_network.name
  env = {
    NODE_ENV     = "production"
    DATABASE_URL = "postgresql://..."
  }
}
```

## Deployment Workflow

Apply the infrastructure:

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply

# View state
terraform state list

# Destroy everything
terraform destroy
```

## Conclusion

Using Terraform with Podman brings infrastructure-as-code practices to container management. The Docker provider's compatibility with Podman's API socket means you can manage containers, networks, and volumes through the same declarative workflow used for cloud infrastructure. State management ensures that Terraform knows exactly what is deployed and can make incremental changes. For teams already using Terraform for cloud resources, extending it to manage Podman containers creates a unified infrastructure management approach that reduces tooling complexity.
