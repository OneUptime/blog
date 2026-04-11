# How to Deploy Redis with Nomad

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Nomad, HashiCorp, Deployment, Container

Description: Deploy Redis on HashiCorp Nomad using a job specification with health checks, resource limits, persistent storage, and Consul service discovery.

---

HashiCorp Nomad is a lightweight workload orchestrator that handles containers, binaries, and JVM apps with a single scheduler. Deploying Redis on Nomad gives you a simple job file, Consul-based service discovery, and rolling updates without Kubernetes overhead.

## Redis Nomad Job File

Create `redis.nomad`:

```hcl
job "redis" {
  datacenters = ["dc1"]
  type        = "service"

  group "redis" {
    count = 1

    network {
      port "redis" {
        static = 6379
      }
    }

    volume "redis-data" {
      type      = "host"
      read_only = false
      source    = "redis-data"
    }

    task "redis" {
      driver = "docker"

      config {
        image = "redis:7-alpine"
        ports = ["redis"]
        args  = [
          "redis-server",
          "--requirepass", "${REDIS_PASSWORD}",
          "--maxmemory", "512mb",
          "--maxmemory-policy", "allkeys-lru",
          "--appendonly", "yes",
          "--appendfsync", "everysec",
          "--save", "900 1",
        ]
      }

      volume_mount {
        volume      = "redis-data"
        destination = "/data"
        read_only   = false
      }

      template {
        data        = "REDIS_PASSWORD={{ key \"redis/password\" }}"
        destination = "${NOMAD_SECRETS_DIR}/redis.env"
        env         = true
      }

      resources {
        cpu    = 500
        memory = 768
      }

      service {
        name = "redis"
        port = "redis"

        check {
          name     = "redis-ping"
          type     = "script"
          command  = "redis-cli"
          args     = ["-a", "${REDIS_PASSWORD}", "ping"]
          interval = "10s"
          timeout  = "5s"
        }
      }
    }
  }

  update {
    max_parallel      = 1
    min_healthy_time  = "15s"
    healthy_deadline  = "2m"
    progress_deadline = "5m"
    auto_revert       = true
  }
}
```

## Host Volume Configuration

Configure the host volume in Nomad client config (`/etc/nomad.d/client.hcl`):

```hcl
client {
  enabled = true

  host_volume "redis-data" {
    path      = "/opt/nomad/volumes/redis"
    read_only = false
  }
}
```

```bash
mkdir -p /opt/nomad/volumes/redis
```

## Deploying the Job

```bash
# Store password in Consul KV
consul kv put redis/password "your-strong-password"

# Validate the job file
nomad job validate redis.nomad

# Run the job
nomad job run redis.nomad

# Check status
nomad job status redis
nomad alloc status <alloc-id>
```

## Service Discovery via Consul

Other services discover Redis through Consul DNS:

```bash
# Resolve Redis address via Consul
dig @127.0.0.1 -p 8600 redis.service.consul

# From application code
REDIS_URL="redis://:${REDIS_PASSWORD}@redis.service.consul:6379"
```

## Updating Redis

Nomad performs rolling updates automatically:

```bash
# Update image version in redis.nomad, then:
nomad job run redis.nomad

# Monitor the deployment
nomad deployment status <deployment-id>

# Rollback if needed
nomad job revert redis <previous-version>
```

## Summary

Nomad deploys Redis with a concise HCL job file that handles resource limits, persistent host volumes, health checks, and Consul service registration. Consul KV stores secrets securely, and Consul DNS provides service discovery for clients. Nomad's built-in rolling update and auto-revert capabilities make zero-downtime Redis updates straightforward.
