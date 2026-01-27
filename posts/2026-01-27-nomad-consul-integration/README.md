# How to Use Nomad with Consul

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nomad, Consul, HashiCorp, Service Discovery, Service Mesh, DevOps, Infrastructure

Description: A comprehensive guide to integrating HashiCorp Nomad with Consul for service discovery, health checks, service mesh connectivity, and dynamic configuration.

---

> When Nomad and Consul work together, you get a powerful orchestration platform where services automatically discover each other, health checks propagate instantly, and secure service-to-service communication happens without manual configuration. This integration is the foundation of production-grade HashiCorp deployments.

---

## Why Integrate Nomad with Consul

Nomad is a workload orchestrator that schedules containers, VMs, and standalone applications. Consul provides service discovery, health checking, and service mesh capabilities. Together, they form a complete platform for running distributed applications.

Key benefits of the integration:

- **Automatic service registration** - Services deployed by Nomad register themselves in Consul automatically.
- **Health check propagation** - Nomad health checks sync to Consul, enabling intelligent load balancing.
- **Service mesh with Connect** - Secure mTLS communication between services without application changes.
- **Dynamic configuration** - Use Consul KV and templates to inject configuration at runtime.
- **DNS-based discovery** - Services find each other using simple DNS queries.

Without this integration, you would need to manually register services, manage certificates, and build your own service discovery layer.

---

## Service Discovery

Service discovery is the most fundamental integration between Nomad and Consul. When you define a service block in your Nomad job, the allocation automatically registers with Consul.

### Basic Service Registration

```hcl
# web-app.nomad
# A simple web application with Consul service registration

job "web-app" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 3

    network {
      port "http" {
        to = 8080
      }
    }

    # Define the service that will be registered in Consul
    service {
      name = "web-app"
      port = "http"

      # Tags help with service organization and routing
      tags = [
        "web",
        "frontend",
        "urlprefix-/web"  # Example tag for Fabio load balancer
      ]

      # Meta fields appear in Consul service catalog
      meta {
        version = "1.2.3"
        team    = "platform"
      }
    }

    task "server" {
      driver = "docker"

      config {
        image = "nginx:alpine"
        ports = ["http"]
      }

      resources {
        cpu    = 256
        memory = 128
      }
    }
  }
}
```

### Verifying Service Registration

After deploying the job, verify the service appears in Consul:

```bash
# List all registered services
consul catalog services

# Get detailed info about a specific service
consul catalog service web-app

# Query service via DNS
dig @127.0.0.1 -p 8600 web-app.service.consul

# Query with specific tag
dig @127.0.0.1 -p 8600 frontend.web-app.service.consul
```

### Address Modes

Nomad supports different address modes for service registration. Choose based on your network topology:

```hcl
# Address mode options in service block

service {
  name = "api"
  port = "http"

  # "auto" - Uses bridge network address for bridge mode,
  #          host address for host mode (default)
  address_mode = "auto"

  # "host" - Always use the host IP address
  # address_mode = "host"

  # "driver" - Use the address from the driver (container IP)
  # address_mode = "driver"

  # "alloc" - Use the allocation network address
  # address_mode = "alloc"
}
```

---

## Health Checks

Consul uses health checks to determine service availability. Nomad can define checks that automatically sync to Consul, ensuring traffic only routes to healthy instances.

### HTTP Health Checks

```hcl
# api-service.nomad
# API service with comprehensive health checks

job "api-service" {
  datacenters = ["dc1"]
  type        = "service"

  group "api" {
    count = 2

    network {
      port "http" {
        to = 3000
      }
    }

    service {
      name = "api-service"
      port = "http"

      # HTTP health check - most common for web services
      check {
        name     = "api-health"
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "3s"

        # Custom HTTP check configuration
        method = "GET"

        # Expected status codes (default is 2xx)
        # Useful when health endpoints return specific codes
        # success_before_passing = 2
        # failures_before_critical = 3

        header {
          Accept = ["application/json"]
        }
      }

      # Additional readiness check
      check {
        name     = "api-ready"
        type     = "http"
        path     = "/ready"
        interval = "5s"
        timeout  = "2s"
      }
    }

    task "api" {
      driver = "docker"

      config {
        image = "myregistry/api:latest"
        ports = ["http"]
      }

      resources {
        cpu    = 512
        memory = 256
      }
    }
  }
}
```

### TCP Health Checks

For services that do not expose HTTP endpoints:

```hcl
# database-proxy.nomad
# TCP health check for database proxy

service {
  name = "db-proxy"
  port = "postgres"

  # TCP check verifies the port is accepting connections
  check {
    name     = "tcp-alive"
    type     = "tcp"
    interval = "10s"
    timeout  = "2s"
  }
}
```

### Script Health Checks

For complex health verification logic:

```hcl
# worker-service.nomad
# Script-based health check for worker processes

service {
  name = "worker"
  port = "metrics"

  # Script check runs a command inside the task
  check {
    name     = "worker-health"
    type     = "script"
    command  = "/bin/health-check.sh"
    args     = ["--verbose"]
    interval = "30s"
    timeout  = "10s"

    # Task to run the script in (required for script checks)
    task = "worker"
  }
}
```

### gRPC Health Checks

For gRPC services implementing the standard health protocol:

```hcl
# grpc-service.nomad
# gRPC health check using the standard health protocol

service {
  name = "grpc-api"
  port = "grpc"

  check {
    name            = "grpc-health"
    type            = "grpc"
    interval        = "10s"
    timeout         = "3s"

    # Optional: specify service name for health check
    grpc_service    = "myapp.HealthCheck"

    # Use TLS for the health check
    grpc_use_tls    = true
  }
}
```

### Check Restart Configuration

Automatically restart unhealthy tasks:

```hcl
service {
  name = "critical-service"
  port = "http"

  check {
    name     = "http-health"
    type     = "http"
    path     = "/health"
    interval = "10s"
    timeout  = "3s"

    # Restart the task after consecutive failures
    check_restart {
      limit           = 3       # Restart after 3 consecutive failures
      grace           = "60s"   # Wait 60s after start before checking
      ignore_warnings = false   # Treat warnings as failures
    }
  }
}
```

---

## Connect (Service Mesh)

Consul Connect provides service mesh capabilities with automatic mTLS encryption and authorization. Nomad integrates deeply with Connect, making secure service-to-service communication straightforward.

### Enabling Connect Sidecar

```hcl
# secure-api.nomad
# API service with Consul Connect sidecar for mTLS

job "secure-api" {
  datacenters = ["dc1"]
  type        = "service"

  group "api" {
    count = 2

    network {
      mode = "bridge"

      port "http" {
        to = 8080
      }
    }

    service {
      name = "secure-api"
      port = "8080"

      # Enable Connect sidecar proxy
      connect {
        sidecar_service {
          # Proxy configuration (optional)
          proxy {
            # Local service port the proxy listens on
            local_service_port = 8080

            # Configure upstreams - services this app needs to call
            upstreams {
              destination_name = "database"
              local_bind_port  = 5432
            }

            upstreams {
              destination_name = "cache"
              local_bind_port  = 6379
            }

            # Expose paths through the mesh for health checks
            expose {
              path {
                path            = "/health"
                protocol        = "http"
                local_path_port = 8080
                listener_port   = "http"
              }
            }
          }
        }

        # Sidecar task configuration (optional)
        sidecar_task {
          resources {
            cpu    = 100
            memory = 64
          }
        }
      }
    }

    task "api" {
      driver = "docker"

      config {
        image = "myregistry/secure-api:latest"
      }

      # Application connects to upstreams via localhost
      env {
        DATABASE_URL = "postgres://localhost:5432/mydb"
        REDIS_URL    = "redis://localhost:6379"
      }

      resources {
        cpu    = 512
        memory = 256
      }
    }
  }
}
```

### Native Connect Integration

For applications with native Consul Connect support:

```hcl
# native-connect.nomad
# Application with native Connect integration (no sidecar needed)

job "native-app" {
  datacenters = ["dc1"]
  type        = "service"

  group "app" {
    network {
      mode = "bridge"
      port "http" {
        to = 8080
      }
    }

    service {
      name = "native-app"
      port = "http"

      connect {
        # Native mode for apps that integrate directly with Connect
        native = true
      }
    }

    task "app" {
      driver = "docker"

      config {
        image = "myregistry/connect-native-app:latest"
        ports = ["http"]
      }

      resources {
        cpu    = 256
        memory = 128
      }
    }
  }
}
```

### Consul Connect Gateway

For ingress traffic from outside the mesh:

```hcl
# ingress-gateway.nomad
# Consul Connect ingress gateway for external traffic

job "ingress-gateway" {
  datacenters = ["dc1"]
  type        = "system"

  group "gateway" {
    network {
      mode = "bridge"

      port "inbound" {
        static = 8443
        to     = 8443
      }
    }

    service {
      name = "ingress-gateway"
      port = "inbound"

      connect {
        gateway {
          # Ingress gateway configuration
          ingress {
            # TLS configuration for the gateway
            tls {
              enabled = true
            }

            # Route external traffic to internal services
            listener {
              port     = 8443
              protocol = "http"

              service {
                name  = "web-app"
                hosts = ["web.example.com"]
              }

              service {
                name  = "api-service"
                hosts = ["api.example.com"]
              }
            }
          }
        }
      }
    }

    task "gateway" {
      driver = "docker"

      config {
        image   = "consul:latest"
        command = "consul"
        args    = ["connect", "envoy", "-gateway=ingress", "-register"]
      }

      resources {
        cpu    = 256
        memory = 128
      }
    }
  }
}
```

---

## Intentions

Consul intentions define which services are allowed to communicate. They work with Connect to enforce authorization policies.

### Defining Intentions

```bash
# Allow web-app to call api-service
consul intention create web-app api-service

# Deny all traffic from unknown sources to database
consul intention create -deny '*' database

# Allow specific service with description
consul intention create \
  -description "Allow API to access database" \
  api-service database
```

### Intention Configuration in HCL

```hcl
# intentions.hcl
# Define service intentions as infrastructure code

Kind = "service-intentions"
Name = "api-service"

Sources = [
  {
    Name   = "web-app"
    Action = "allow"
  },
  {
    Name   = "admin-dashboard"
    Action = "allow"
  },
  {
    # Deny all other sources
    Name   = "*"
    Action = "deny"
  }
]
```

Apply the configuration:

```bash
consul config write intentions.hcl
```

### L7 Intentions with HTTP Permissions

For fine-grained HTTP-level authorization:

```hcl
# l7-intentions.hcl
# Layer 7 intentions with HTTP path-based rules

Kind = "service-intentions"
Name = "api-service"

Sources = [
  {
    Name = "web-app"
    Permissions = [
      {
        Action = "allow"
        HTTP {
          PathPrefix = "/api/v1/"
          Methods    = ["GET", "POST"]
        }
      },
      {
        Action = "deny"
        HTTP {
          PathPrefix = "/api/admin/"
        }
      }
    ]
  }
]
```

### Verifying Intentions

```bash
# List all intentions
consul intention list

# Check specific intention
consul intention check web-app api-service

# Get intention details
consul intention get web-app api-service
```

---

## Templates

Consul Template integration allows Nomad to render configuration files dynamically using data from Consul KV, service catalog, and Vault secrets.

### Basic Template Usage

```hcl
# templated-app.nomad
# Application with dynamic configuration from Consul

job "templated-app" {
  datacenters = ["dc1"]
  type        = "service"

  group "app" {
    network {
      port "http" {
        to = 8080
      }
    }

    task "app" {
      driver = "docker"

      config {
        image = "myregistry/app:latest"
        ports = ["http"]
      }

      # Template renders config file from Consul data
      template {
        # Source template content (inline)
        data = <<EOF
# Application configuration
# Generated by Nomad template

{{- with secret "database/creds/app" }}
DATABASE_USERNAME={{ .Data.username }}
DATABASE_PASSWORD={{ .Data.password }}
{{- end }}

# Service endpoints from Consul
{{- range service "cache" }}
CACHE_HOST={{ .Address }}
CACHE_PORT={{ .Port }}
{{- end }}

# Configuration from Consul KV
{{- key "config/app/log_level" }}
LOG_LEVEL={{ . }}
{{- end }}
EOF

        # Destination path in the task
        destination = "secrets/app.env"

        # Environment file mode - exports as environment variables
        env = true

        # Change mode when template re-renders
        change_mode   = "restart"
        change_signal = "SIGTERM"
      }

      resources {
        cpu    = 256
        memory = 128
      }
    }
  }
}
```

### Service Discovery in Templates

```hcl
# nginx-upstream.nomad
# Nginx with dynamic upstream configuration

job "nginx-lb" {
  datacenters = ["dc1"]
  type        = "service"

  group "nginx" {
    network {
      port "http" {
        static = 80
      }
    }

    task "nginx" {
      driver = "docker"

      config {
        image = "nginx:alpine"
        ports = ["http"]
        volumes = [
          "local/nginx.conf:/etc/nginx/nginx.conf"
        ]
      }

      # Dynamic nginx configuration with upstream servers
      template {
        data = <<EOF
events {
    worker_connections 1024;
}

http {
    upstream api_servers {
        {{- range service "api-service" }}
        server {{ .Address }}:{{ .Port }};
        {{- else }}
        server 127.0.0.1:65535; # Fallback when no servers
        {{- end }}
    }

    upstream web_servers {
        {{- range service "web-app" }}
        server {{ .Address }}:{{ .Port }} weight=1;
        {{- end }}
    }

    server {
        listen 80;

        location /api/ {
            proxy_pass http://api_servers/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location / {
            proxy_pass http://web_servers/;
            proxy_set_header Host $host;
        }
    }
}
EOF

        destination = "local/nginx.conf"
        change_mode = "signal"
        change_signal = "SIGHUP"
      }

      resources {
        cpu    = 256
        memory = 64
      }
    }
  }
}
```

### KV Store Integration

```hcl
# config-template.nomad
# Application configuration from Consul KV

template {
  data = <<EOF
# Feature flags from Consul KV
{{- range ls "config/features" }}
FEATURE_{{ .Key | toUpper }}={{ .Value }}
{{- end }}

# Nested configuration tree
{{- range tree "config/app" }}
{{ .Key }}={{ .Value }}
{{- end }}

# Single value with default
LOG_LEVEL={{ keyOrDefault "config/log_level" "info" }}

# JSON configuration parsing
{{- with key "config/database" | parseJSON }}
DB_HOST={{ .host }}
DB_PORT={{ .port }}
DB_NAME={{ .name }}
{{- end }}
EOF

  destination = "local/config.env"
  env         = true
}
```

### Vault Integration via Templates

```hcl
# vault-secrets.nomad
# Secure secrets from Vault via Consul Template

job "secure-app" {
  datacenters = ["dc1"]
  type        = "service"

  group "app" {
    # Vault configuration for the group
    vault {
      policies = ["app-secrets"]
      change_mode = "restart"
    }

    task "app" {
      driver = "docker"

      config {
        image = "myregistry/app:latest"
      }

      # Database credentials from Vault
      template {
        data = <<EOF
{{- with secret "database/creds/readonly" }}
export DB_USER="{{ .Data.username }}"
export DB_PASS="{{ .Data.password }}"
{{- end }}

{{- with secret "secret/data/app/config" }}
export API_KEY="{{ .Data.data.api_key }}"
export ENCRYPTION_KEY="{{ .Data.data.encryption_key }}"
{{- end }}
EOF

        destination = "secrets/env.sh"
        env         = true
      }

      resources {
        cpu    = 256
        memory = 128
      }
    }
  }
}
```

---

## DNS Integration

Consul provides DNS-based service discovery. Nomad jobs can use Consul DNS to find other services without hardcoding addresses.

### Configuring DNS Resolution

```hcl
# dns-discovery.nomad
# Application using Consul DNS for service discovery

job "dns-app" {
  datacenters = ["dc1"]
  type        = "service"

  group "app" {
    network {
      # Use bridge mode with DNS configured
      mode = "bridge"

      dns {
        # Point to Consul DNS
        servers = ["172.17.0.1"]
        searches = [
          "service.consul",
          "node.consul"
        ]
        options = ["ndots:2"]
      }

      port "http" {
        to = 8080
      }
    }

    task "app" {
      driver = "docker"

      config {
        image = "myregistry/app:latest"
        ports = ["http"]
      }

      # Application can now resolve services via DNS
      env {
        # These resolve via Consul DNS
        DATABASE_HOST = "postgres.service.consul"
        CACHE_HOST    = "redis.service.consul"
        API_HOST      = "api-service.service.consul"
      }

      resources {
        cpu    = 256
        memory = 128
      }
    }
  }
}
```

### DNS Query Examples

```bash
# Standard service lookup
dig @127.0.0.1 -p 8600 web-app.service.consul

# SRV record for port information
dig @127.0.0.1 -p 8600 web-app.service.consul SRV

# Query specific datacenter
dig @127.0.0.1 -p 8600 web-app.service.dc2.consul

# Query with tag filter
dig @127.0.0.1 -p 8600 primary.postgres.service.consul

# Node lookup
dig @127.0.0.1 -p 8600 node1.node.consul
```

### DNS Forwarding Configuration

Configure your system DNS to forward `.consul` queries:

```hcl
# /etc/consul.d/dns.hcl
# Consul DNS configuration

dns_config {
  # Allow stale reads for better performance
  allow_stale = true
  max_stale   = "87600h"

  # Cache settings
  node_ttl          = "30s"
  service_ttl {
    "*" = "30s"
  }

  # Enable case-insensitive lookups
  enable_truncate = true

  # UDP response size
  udp_answer_limit = 3
}

# Recursors for non-Consul queries
recursors = ["8.8.8.8", "8.8.4.4"]
```

### Prepared Queries for Advanced DNS

```hcl
# prepared-query.hcl
# Prepared query for failover across datacenters

{
  "Name": "api-geo",
  "Service": {
    "Service": "api-service",
    "Failover": {
      "Datacenters": ["dc2", "dc3"]
    },
    "OnlyPassing": true,
    "Near": "_agent"
  },
  "DNS": {
    "TTL": "10s"
  }
}
```

Register and use the prepared query:

```bash
# Register the query
curl -X POST -d @prepared-query.hcl \
  http://localhost:8500/v1/query

# Query via DNS
dig @127.0.0.1 -p 8600 api-geo.query.consul
```

---

## Best Practices Summary

### Service Registration

- **Always define health checks** - Services without health checks cannot be trusted by load balancers.
- **Use meaningful tags** - Tags enable routing, filtering, and organization of services.
- **Set appropriate check intervals** - Too frequent checks waste resources; too infrequent delays failure detection.
- **Include meta fields** - Version numbers and team ownership help with debugging and auditing.

### Connect and Security

- **Default to Connect for inter-service communication** - mTLS should be the baseline, not an exception.
- **Define explicit intentions** - Use deny-by-default and allow specific service pairs.
- **Use L7 intentions for HTTP services** - Path and method restrictions provide defense in depth.
- **Separate ingress gateways from application workloads** - Run gateways as system jobs for availability.

### Templates and Configuration

- **Prefer templates over environment variables for secrets** - File-based secrets are easier to rotate and audit.
- **Use change_mode wisely** - Restart for critical config changes, signal for reloadable configs.
- **Set appropriate template refresh intervals** - Balance freshness against Consul API load.
- **Always provide defaults** - Use `keyOrDefault` to prevent template render failures.

### DNS and Discovery

- **Use DNS for simple lookups, API for complex queries** - DNS is simpler but less flexible.
- **Configure DNS TTLs appropriately** - Short TTLs for dynamic services, longer for stable infrastructure.
- **Consider prepared queries for geo-failover** - They provide automatic datacenter failover.
- **Monitor DNS query latency** - Slow DNS affects all service communication.

### Operational Excellence

- **Run Consul agents on every Nomad client** - Local agents provide faster lookups and better resilience.
- **Use ACLs in production** - Both Nomad and Consul should require authentication.
- **Monitor integration health** - Alert on service registration failures and intention denials.
- **Test failover scenarios** - Verify services handle Consul unavailability gracefully.

---

## Complete Example: Microservices Application

Here is a complete example tying together all the concepts:

```hcl
# microservices-stack.nomad
# Complete microservices application with Consul integration

job "microservices" {
  datacenters = ["dc1"]
  type        = "service"

  # Web frontend group
  group "frontend" {
    count = 2

    network {
      mode = "bridge"
      port "http" { to = 3000 }
    }

    service {
      name = "frontend"
      port = "3000"
      tags = ["web", "public"]

      check {
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "3s"
      }

      connect {
        sidecar_service {
          proxy {
            upstreams {
              destination_name = "api"
              local_bind_port  = 8080
            }
          }
        }
      }
    }

    task "web" {
      driver = "docker"
      config {
        image = "myregistry/frontend:latest"
      }
      env {
        API_URL = "http://localhost:8080"
      }
      resources {
        cpu    = 256
        memory = 128
      }
    }
  }

  # API backend group
  group "api" {
    count = 3

    network {
      mode = "bridge"
      port "http" { to = 8080 }
    }

    service {
      name = "api"
      port = "8080"
      tags = ["api", "internal"]

      check {
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "3s"
      }

      connect {
        sidecar_service {
          proxy {
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

    task "api" {
      driver = "docker"
      config {
        image = "myregistry/api:latest"
      }

      template {
        data = <<EOF
DATABASE_URL=postgres://localhost:5432/app
REDIS_URL=redis://localhost:6379
LOG_LEVEL={{ keyOrDefault "config/api/log_level" "info" }}
EOF
        destination = "local/env"
        env         = true
      }

      resources {
        cpu    = 512
        memory = 256
      }
    }
  }
}
```

---

The Nomad and Consul integration transforms infrastructure management from manual service wiring to automatic, secure service discovery. Start with basic service registration, add health checks, then progressively adopt Connect for zero-trust networking. The investment pays dividends in operational simplicity and security posture.

For monitoring your Nomad and Consul deployments, consider using [OneUptime](https://oneuptime.com) to track service health, visualize dependencies, and alert on infrastructure issues before they impact users.
