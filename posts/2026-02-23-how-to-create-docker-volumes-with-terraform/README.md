# How to Create Docker Volumes with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, VOLUME, Persistent Storage, Docker Provider, Infrastructure as Code

Description: Learn how to create and manage Docker volumes with Terraform for persistent data storage including named volumes, NFS mounts, and volume lifecycle management.

---

Containers are ephemeral by nature. When a container is removed, all data written inside it is lost. Docker volumes solve this problem by providing persistent storage that exists independently of container lifecycles. With Terraform, you can manage these volumes declaratively, ensuring your storage configuration is reproducible and version-controlled. This guide covers creating Docker volumes with Terraform, from basic named volumes to advanced configurations with custom drivers and NFS mounts.

## Why Docker Volumes Matter

Without volumes, database containers lose their data on restart, application containers lose uploaded files, and log data vanishes when containers are recreated. Docker volumes provide a mechanism to persist data beyond the container lifecycle. They are also the preferred way to share data between containers and to achieve better I/O performance compared to bind mounts on some platforms.

## Prerequisites

You need the following:

- Terraform 1.0 or later
- Docker Engine installed and running
- Basic understanding of Docker storage concepts

## Provider Configuration

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
```

## Creating a Basic Named Volume

Named volumes are the simplest and most common volume type. Docker manages the storage location on the host filesystem.

```hcl
# Create a named volume for database storage
resource "docker_volume" "postgres_data" {
  name = "postgres-data"

  # Labels for organization and identification
  labels {
    label = "service"
    value = "postgresql"
  }

  labels {
    label = "environment"
    value = "production"
  }
}
```

## Attaching Volumes to Containers

Once created, attach volumes to containers using the `volumes` block.

```hcl
# Pull the PostgreSQL image
resource "docker_image" "postgres" {
  name = "postgres:15-alpine"
}

# Create the database volume
resource "docker_volume" "db_data" {
  name = "database-data"
}

# Create a volume for database logs
resource "docker_volume" "db_logs" {
  name = "database-logs"
}

# Attach volumes to the database container
resource "docker_container" "postgres" {
  name  = "postgres-server"
  image = docker_image.postgres.image_id

  # Mount the data volume
  volumes {
    volume_name    = docker_volume.db_data.name
    container_path = "/var/lib/postgresql/data"
  }

  # Mount the logs volume
  volumes {
    volume_name    = docker_volume.db_logs.name
    container_path = "/var/log/postgresql"
  }

  env = [
    "POSTGRES_DB=myapp",
    "POSTGRES_USER=admin",
    "POSTGRES_PASSWORD=secretpassword",
    "PGDATA=/var/lib/postgresql/data/pgdata",
  ]

  ports {
    internal = 5432
    external = 5432
  }

  must_run = true
}
```

## Volume with Custom Driver Options

Docker supports different volume drivers that provide various storage backends. The local driver supports options for creating special mount types.

```hcl
# Volume with tmpfs driver options (RAM-backed storage)
resource "docker_volume" "tmpfs_volume" {
  name = "fast-cache"

  driver = "local"

  driver_opts = {
    type   = "tmpfs"
    device = "tmpfs"
    o      = "size=100m,uid=1000"  # 100MB RAM disk
  }

  labels {
    label = "storage-type"
    value = "tmpfs"
  }
}

# Use the tmpfs volume for cache-heavy workloads
resource "docker_container" "cache_worker" {
  name  = "cache-worker"
  image = docker_image.app.image_id

  volumes {
    volume_name    = docker_volume.tmpfs_volume.name
    container_path = "/tmp/cache"
  }

  must_run = true
}
```

## NFS Volume for Shared Storage

NFS volumes allow multiple containers across multiple hosts to access the same storage.

```hcl
# NFS-backed volume for shared file access
resource "docker_volume" "nfs_shared" {
  name   = "shared-files"
  driver = "local"

  driver_opts = {
    type   = "nfs"
    device = ":/exports/shared"
    o      = "addr=192.168.1.100,rw,nfsvers=4"
  }

  labels {
    label = "storage-type"
    value = "nfs"
  }

  labels {
    label = "nfs-server"
    value = "192.168.1.100"
  }
}

# Container using NFS shared storage
resource "docker_container" "file_processor" {
  name  = "file-processor"
  image = docker_image.app.image_id

  volumes {
    volume_name    = docker_volume.nfs_shared.name
    container_path = "/data/shared"
  }

  must_run = true
}
```

## Bind Mounts for Development

While not technically Docker volumes, bind mounts are common in development for live code reloading.

```hcl
# Development container with bind mount for live code reloading
resource "docker_container" "dev_app" {
  name  = "dev-application"
  image = docker_image.app.image_id

  # Bind mount the local source code directory
  volumes {
    host_path      = "${path.cwd}/src"
    container_path = "/app/src"
    read_only      = false
  }

  # Bind mount the node_modules as a named volume to avoid overwriting
  volumes {
    volume_name    = docker_volume.node_modules.name
    container_path = "/app/node_modules"
  }

  # Bind mount configuration files as read-only
  volumes {
    host_path      = "${path.cwd}/config"
    container_path = "/app/config"
    read_only      = true
  }

  env = [
    "NODE_ENV=development",
  ]

  ports {
    internal = 3000
    external = 3000
  }

  must_run = true
}

# Named volume for node_modules to prevent host overwrite
resource "docker_volume" "node_modules" {
  name = "dev-node-modules"
}
```

## Creating Multiple Volumes Dynamically

Use `for_each` to create multiple volumes from a configuration map.

```hcl
# Define volumes needed for the application stack
variable "volumes" {
  description = "Map of volume names to their configurations"
  type = map(object({
    driver      = string
    driver_opts = map(string)
    labels      = map(string)
  }))
  default = {
    "app-data" = {
      driver      = "local"
      driver_opts = {}
      labels      = { service = "app", purpose = "data" }
    }
    "app-logs" = {
      driver      = "local"
      driver_opts = {}
      labels      = { service = "app", purpose = "logs" }
    }
    "db-data" = {
      driver      = "local"
      driver_opts = {}
      labels      = { service = "database", purpose = "data" }
    }
    "db-backups" = {
      driver      = "local"
      driver_opts = {}
      labels      = { service = "database", purpose = "backups" }
    }
    "redis-data" = {
      driver      = "local"
      driver_opts = {}
      labels      = { service = "redis", purpose = "data" }
    }
    "uploads" = {
      driver      = "local"
      driver_opts = {}
      labels      = { service = "app", purpose = "uploads" }
    }
  }
}

# Create all volumes
resource "docker_volume" "app_volumes" {
  for_each = var.volumes

  name   = each.key
  driver = each.value.driver

  dynamic "labels" {
    for_each = each.value.labels
    content {
      label = labels.key
      value = labels.value
    }
  }
}
```

## Sharing Volumes Between Containers

Multiple containers can mount the same volume, which is useful for sidecar patterns.

```hcl
# Shared volume for log aggregation
resource "docker_volume" "shared_logs" {
  name = "shared-logs"
}

# Application container writes logs to the shared volume
resource "docker_container" "app_with_logs" {
  name  = "app-with-logs"
  image = docker_image.app.image_id

  volumes {
    volume_name    = docker_volume.shared_logs.name
    container_path = "/var/log/app"
  }

  env = [
    "LOG_PATH=/var/log/app/application.log",
  ]

  must_run = true
}

# Log forwarder sidecar reads from the same volume
resource "docker_image" "fluentbit" {
  name = "fluent/fluent-bit:latest"
}

resource "docker_container" "log_forwarder" {
  name  = "log-forwarder"
  image = docker_image.fluentbit.image_id

  volumes {
    volume_name    = docker_volume.shared_logs.name
    container_path = "/var/log/app"
    read_only      = true  # Forwarder only needs read access
  }

  must_run = true

  depends_on = [docker_container.app_with_logs]
}
```

## Volume Backup Strategy

Create a backup container that accesses volumes for data protection.

```hcl
# Backup volume to store backup archives
resource "docker_volume" "backups" {
  name = "volume-backups"
}

# Backup container that archives database data
resource "docker_image" "alpine" {
  name = "alpine:3.19"
}

resource "docker_container" "backup" {
  name  = "volume-backup"
  image = docker_image.alpine.image_id

  # Mount the source volume (read-only)
  volumes {
    volume_name    = docker_volume.db_data.name
    container_path = "/source"
    read_only      = true
  }

  # Mount the backup volume
  volumes {
    volume_name    = docker_volume.backups.name
    container_path = "/backups"
  }

  # Run backup command
  command = [
    "sh", "-c",
    "tar czf /backups/db-backup-$(date +%Y%m%d).tar.gz -C /source ."
  ]

  # This container runs once and stops
  must_run = false
}
```

## Outputs

```hcl
output "volume_names" {
  description = "List of all created volume names"
  value = {
    for k, v in docker_volume.app_volumes : k => v.name
  }
}

output "db_volume_mountpoint" {
  description = "Mount point of the database volume"
  value       = docker_volume.db_data.mountpoint
}
```

## Best Practices

Follow these practices when managing Docker volumes with Terraform. Always use named volumes instead of anonymous volumes so they can be tracked and managed. Label your volumes with service name, purpose, and environment for easy identification. Use read-only mounts when containers only need to read data from a volume. Back up critical volumes regularly using sidecar containers or host-level tools. Avoid storing large temporary data in volumes - use tmpfs mounts instead for ephemeral data that benefits from fast I/O.

## Monitoring with OneUptime

Storage issues can silently cause application failures. Use [OneUptime](https://oneuptime.com) to monitor disk usage, track volume health, and get alerted before storage-related problems impact your services.

## Conclusion

Docker volumes are essential for any containerized application that needs to persist data. Terraform makes it easy to manage volumes as part of your infrastructure code, ensuring consistent storage configuration across environments. Whether you need simple named volumes for database storage, NFS volumes for shared access, or tmpfs volumes for high-performance caching, the Docker provider gives you full control. By combining volumes with proper container configuration and backup strategies, you can build reliable, data-safe container deployments.

For more Docker with Terraform content, check out our guides on [Docker containers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-containers-with-terraform/view) and [Docker networks](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-networks-with-terraform/view).
