# How to Deploy Docker Containers on Nomad

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nomad, Docker, HashiCorp, Containers, DevOps, Orchestration, Service Discovery, Infrastructure

Description: A comprehensive guide to deploying and managing Docker containers on HashiCorp Nomad, covering job specifications, networking, service discovery, and production best practices.

---

> Nomad strikes the balance between Kubernetes complexity and Docker Compose simplicity. It runs containers, binaries, and VMs with a single binary and a declarative job spec. If you want orchestration without the overhead, Nomad deserves a serious look.

## Job Specification Basics

Nomad uses HCL (HashiCorp Configuration Language) for job specifications. A job defines the desired state of your workloads, and Nomad ensures that state is maintained across your cluster.

```hcl
# job.nomad - Basic structure of a Nomad job file
job "web-api" {
  # Datacenter where this job should run
  datacenters = ["dc1"]

  # Job type: service (long-running), batch, or system (runs on every node)
  type = "service"

  # Update strategy for rolling deployments
  update {
    max_parallel     = 2          # Deploy 2 instances at a time
    min_healthy_time = "30s"      # Wait 30s before marking healthy
    healthy_deadline = "5m"       # Fail if not healthy within 5 minutes
    auto_revert      = true       # Rollback on deployment failure
  }

  # Group defines a set of tasks that run together on the same node
  group "api" {
    count = 3                     # Run 3 instances of this group

    # Task definitions go here (see next section)
  }
}
```

The hierarchy is: Job > Group > Task. Groups are scheduled together on the same node, which is useful for sidecar patterns like log shippers or service meshes.

## Docker Task Driver

The Docker task driver is Nomad's most popular driver. It pulls images, manages container lifecycle, and handles restarts automatically.

```hcl
group "api" {
  count = 3

  task "server" {
    # Use the Docker driver for container workloads
    driver = "docker"

    config {
      # Container image to pull and run
      image = "ghcr.io/acme/api:v2.1.0"

      # Port mappings - reference the port label defined in network block
      ports = ["http", "metrics"]

      # Mount configuration files from Nomad templates
      volumes = [
        "local/config.yaml:/app/config.yaml:ro"
      ]

      # Container arguments (optional)
      args = [
        "--config", "/app/config.yaml",
        "--log-level", "info"
      ]

      # Docker logging configuration
      logging {
        type = "json-file"
        config {
          max-size = "10m"
          max-file = "3"
        }
      }
    }

    # Environment variables for the container
    env {
      NODE_ENV    = "production"
      LOG_FORMAT  = "json"
    }

    # Template for dynamic configuration (Consul/Vault integration)
    template {
      data = <<EOF
database:
  host: {{ key "config/db/host" }}
  port: {{ key "config/db/port" }}
  name: {{ key "config/db/name" }}
EOF
      destination = "local/config.yaml"
      change_mode = "signal"       # Signal task on config change
      change_signal = "SIGHUP"     # Send SIGHUP to reload config
    }
  }
}
```

Key configuration options include image pull policies, auth credentials for private registries, and volume mounts for persistent data or configuration.

## Resource Allocation

Proper resource allocation ensures fair scheduling and prevents noisy neighbors. Nomad reserves resources and enforces limits.

```hcl
task "server" {
  driver = "docker"

  config {
    image = "ghcr.io/acme/api:v2.1.0"
    ports = ["http"]
  }

  # Resource reservations and limits
  resources {
    # CPU in MHz - Nomad bins tasks based on available CPU
    cpu = 500                      # Reserve 500 MHz

    # Memory in MB - hard limit, container is killed if exceeded
    memory = 512                   # Reserve 512 MB RAM

    # Memory max allows bursting above reservation (soft limit)
    memory_max = 1024              # Can burst to 1 GB if available
  }

  # Scaling block for horizontal pod autoscaling (requires Nomad Autoscaler)
  scaling {
    enabled = true
    min     = 2                    # Minimum 2 instances
    max     = 10                   # Maximum 10 instances

    policy {
      # Scale based on CPU utilization
      check "cpu" {
        source = "nomad-apm"
        query  = "avg_cpu"
        strategy "target-value" {
          target = 70              # Target 70% CPU utilization
        }
      }
    }
  }
}
```

Start with conservative limits and monitor actual usage. Nomad's allocation metrics help you right-size resources over time.

## Networking

Nomad supports multiple networking modes. Bridge mode provides container isolation with port mapping, while host mode gives direct access to the host network.

```hcl
group "api" {
  count = 3

  # Network configuration for the group
  network {
    # Bridge mode creates an isolated network namespace
    mode = "bridge"

    # Dynamic port allocation - Nomad assigns available ports
    port "http" {
      to = 8080                    # Container listens on 8080
      # 'static' would pin to a specific host port (avoid in production)
    }

    port "metrics" {
      to = 9090                    # Prometheus metrics endpoint
    }

    # DNS configuration for service discovery
    dns {
      servers = ["172.17.0.1"]     # Use host DNS resolver
    }
  }

  # Service mesh integration with Consul Connect (optional)
  service {
    name = "api"
    port = "http"

    # Enable Consul Connect service mesh
    connect {
      sidecar_service {
        proxy {
          # Allow outbound connections to these services
          upstreams {
            destination_name = "postgres"
            local_bind_port  = 5432
          }
          upstreams {
            destination_name = "redis"
            local_bind_port  = 6379
          }
        }
      }
    }
  }

  task "server" {
    driver = "docker"
    config {
      image = "ghcr.io/acme/api:v2.1.0"
      ports = ["http", "metrics"]
    }
  }
}
```

Bridge mode with dynamic ports is recommended for most workloads. Use Consul Connect for encrypted service-to-service communication.

## Service Discovery

Nomad integrates natively with Consul for service discovery. Services are automatically registered and deregistered based on health status.

```hcl
group "api" {
  count = 3

  network {
    mode = "bridge"
    port "http" { to = 8080 }
    port "grpc" { to = 9000 }
  }

  # Register with Consul for service discovery
  service {
    name = "api"                   # Service name in Consul
    port = "http"                  # Port label to register
    tags = [
      "traefik.enable=true",                           # Enable Traefik routing
      "traefik.http.routers.api.rule=Host(`api.example.com`)",
      "urlprefix-/api"                                 # Fabio routing tag
    ]

    # Metadata for service catalog
    meta {
      version = "2.1.0"
      team    = "platform"
    }

    # Health check configuration (see next section)
    check {
      type     = "http"
      path     = "/health"
      interval = "10s"
      timeout  = "3s"
    }
  }

  # Register a separate service for gRPC endpoints
  service {
    name = "api-grpc"
    port = "grpc"
    tags = ["grpc", "internal"]

    check {
      type            = "grpc"
      interval        = "10s"
      timeout         = "3s"
      grpc_use_tls    = true
    }
  }

  task "server" {
    driver = "docker"
    config {
      image = "ghcr.io/acme/api:v2.1.0"
      ports = ["http", "grpc"]
    }
  }
}
```

Services become discoverable via Consul DNS (api.service.consul) or the Consul API. Load balancers like Traefik, Fabio, or HAProxy can route traffic based on service tags.

## Health Checks

Health checks determine when a service is ready to receive traffic. Nomad supports HTTP, TCP, gRPC, and script-based checks.

```hcl
service {
  name = "api"
  port = "http"

  # HTTP health check - most common for web services
  check {
    name     = "api-health"
    type     = "http"
    path     = "/health"           # Endpoint to check
    interval = "10s"               # Check every 10 seconds
    timeout  = "3s"                # Fail if no response in 3 seconds
    method   = "GET"               # HTTP method

    # Optional: check response body
    check_restart {
      limit = 3                    # Restart after 3 consecutive failures
      grace = "60s"                # Wait 60s after start before checking
    }
  }

  # TCP check for non-HTTP services
  check {
    name     = "api-tcp"
    type     = "tcp"
    port     = "http"
    interval = "10s"
    timeout  = "2s"
  }

  # Script check for custom validation logic
  check {
    name     = "api-ready"
    type     = "script"
    task     = "server"            # Run inside this task
    command  = "/app/healthcheck"  # Script to execute
    args     = ["--full"]
    interval = "30s"
    timeout  = "10s"
  }
}

# Task-level restart policy (separate from service checks)
task "server" {
  driver = "docker"

  config {
    image = "ghcr.io/acme/api:v2.1.0"
    ports = ["http"]
  }

  # Restart policy for task failures
  restart {
    attempts = 3                   # Retry 3 times
    interval = "5m"                # Within a 5-minute window
    delay    = "15s"               # Wait 15s between restarts
    mode     = "fail"              # Fail allocation after max attempts
  }

  # Kill timeout - grace period for graceful shutdown
  kill_timeout = "30s"
}
```

Health checks should be lightweight and test actual readiness, not just that the process is running. Include database connectivity and downstream dependencies in readiness probes.

## Constraints and Affinity

Constraints control where tasks can run. Use them to target specific hardware, avoid co-location, or spread workloads across failure domains.

```hcl
job "web-api" {
  datacenters = ["dc1", "dc2"]
  type        = "service"

  # Job-level constraint - applies to all groups
  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"            # Only run on Linux nodes
  }

  group "api" {
    count = 6

    # Spread allocations across availability zones
    spread {
      attribute = "${node.datacenter}"
      weight    = 100              # Maximize spread

      target "dc1" { percent = 50 }
      target "dc2" { percent = 50 }
    }

    # Prefer nodes with SSD storage (soft preference)
    affinity {
      attribute = "${meta.storage_type}"
      value     = "ssd"
      weight    = 75               # Strong preference, not required
    }

    # Hard constraint - GPU workloads
    constraint {
      attribute = "${attr.driver.docker.volumes.enabled}"
      value     = "true"           # Require Docker volume support
    }

    # Anti-affinity - avoid co-locating with other instances
    constraint {
      operator  = "distinct_hosts"
      value     = "true"           # Each instance on different host
    }

    task "server" {
      driver = "docker"

      config {
        image = "ghcr.io/acme/api:v2.1.0"
        ports = ["http"]
      }

      # Task-level constraint for specific requirements
      constraint {
        attribute = "${attr.cpu.arch}"
        value     = "amd64"        # Only amd64 architecture
      }

      resources {
        cpu    = 500
        memory = 512
      }
    }
  }
}
```

Use `distinct_hosts` for high availability. Spread across datacenters for disaster recovery. Affinities are preferences; constraints are requirements.

## Best Practices Summary

1. **Version your images explicitly** - Never use `latest` in production. Pin to specific versions for reproducible deployments.

2. **Use dynamic ports** - Let Nomad allocate ports to avoid conflicts and enable dense packing.

3. **Configure resource limits** - Set both `memory` and `memory_max` to prevent OOM kills while allowing bursting.

4. **Implement health checks** - Every service needs HTTP or TCP checks. Use `check_restart` for automatic recovery.

5. **Spread across failure domains** - Use `spread` and `distinct_hosts` to survive node and datacenter failures.

6. **Enable auto-revert** - Set `auto_revert = true` in update blocks to automatically rollback failed deployments.

7. **Use Consul Connect** - Enable the service mesh for mTLS and fine-grained access control between services.

8. **Template sensitive data** - Use Vault integration for secrets instead of hardcoding credentials in job specs.

9. **Set kill timeouts** - Give containers time for graceful shutdown with appropriate `kill_timeout` values.

10. **Monitor with OpenTelemetry** - Ship metrics, logs, and traces to your observability platform for visibility into container performance.

---

Nomad provides a simpler path to container orchestration without sacrificing production-grade features. Combined with Consul for service discovery and Vault for secrets, it forms a complete platform for running containerized workloads. Start with the basics, add health checks and constraints, then layer in service mesh as your needs grow.

For comprehensive monitoring of your Nomad deployments, check out [OneUptime](https://oneuptime.com) - an open-source observability platform that integrates with HashiCorp tools for metrics, logs, and alerting.
