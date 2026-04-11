# How to Configure Redis with Consul Connect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Consul, Service Mesh, mTLS, Infrastructure

Description: Learn how to configure Redis with Consul Connect service mesh - covering sidecar proxy setup, intentions for access control, mTLS encryption, and health checking.

---

Consul Connect provides service mesh capabilities for Redis, including automatic mTLS between services, intention-based access control, and service discovery. This guide covers configuring Redis as a Consul service with Connect enabled.

## Register Redis as a Consul Service with Connect

Create a service registration file for Redis:

```hcl
# /etc/consul.d/redis.hcl
service {
  name = "redis"
  id   = "redis-1"
  port = 6379
  tags = ["primary", "cache"]

  check {
    id       = "redis-health"
    name     = "Redis TCP Health Check"
    tcp      = "localhost:6379"
    interval = "10s"
    timeout  = "3s"
  }

  connect {
    sidecar_service {
      proxy {
        upstreams = []
        config {
          protocol = "tcp"
        }
      }
    }
  }
}
```

```bash
consul reload
```

## Start the Envoy Sidecar Proxy

Consul uses Envoy as the sidecar proxy for Connect:

```bash
consul connect envoy -sidecar-for redis-1 &
```

The sidecar listens on a local port and handles mTLS termination before forwarding to Redis.

## Register a Redis Client Service

Services that need to connect to Redis also need Connect configuration:

```hcl
# /etc/consul.d/app-service.hcl
service {
  name = "user-api"
  port = 8080

  connect {
    sidecar_service {
      proxy {
        upstreams = [
          {
            destination_name = "redis"
            local_bind_port  = 16379
          }
        ]
      }
    }
  }
}
```

The application connects to `localhost:16379`, and Consul handles mTLS to the Redis sidecar transparently.

Update your application to use the local upstream port:

```python
import redis

# Connect to Consul Connect upstream port, not Redis directly
client = redis.Redis(host='127.0.0.1', port=16379, decode_responses=True)
```

## Create Intentions for Access Control

Intentions define which services can communicate with Redis:

```bash
# Allow user-api to connect to Redis
consul intention create user-api redis

# Allow background-worker to connect to Redis
consul intention create background-worker redis

# Deny all other services (default deny)
consul intention create -deny '*' redis
```

List current intentions:

```bash
consul intention list
```

## Verify mTLS is Working

Check that connections are being proxied through Connect:

```bash
# View the Connect CA provider configuration
consul connect ca get-config

# Start Envoy sidecar with debug logging to inspect proxy activity
consul connect envoy -sidecar-for redis-1 -- -l debug
```

## Kubernetes Integration with Consul Helm

For Kubernetes deployments:

```yaml
# values.yaml for Consul Helm chart
global:
  name: consul
  datacenter: dc1

connectInject:
  enabled: true
  default: false  # Opt-in per pod

server:
  replicas: 3
```

Annotate Redis pods for Connect injection:

```yaml
metadata:
  annotations:
    consul.hashicorp.com/connect-inject: "true"
    consul.hashicorp.com/connect-service: "redis"
    consul.hashicorp.com/connect-service-port: "6379"
```

## Health Check and Service Discovery

Services discover Redis through Consul DNS:

```bash
# DNS lookup for healthy Redis instances
dig @127.0.0.1 -p 8600 redis.service.consul

# HTTP API query
curl http://localhost:8500/v1/health/service/redis?passing=true
```

## Summary

Consul Connect provides automatic mTLS, access control via intentions, and service discovery for Redis. Register Redis as a Consul service with a sidecar proxy, configure upstreams in client services, and use intentions to enforce least-privilege access. Applications connect to a local Consul proxy port instead of Redis directly, allowing the service mesh to handle encryption and authorization transparently.
