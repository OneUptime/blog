# How to Implement Nomad Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nomad, Service Discovery, Consul, Networking, DevOps

Description: Learn how to set up service discovery in Nomad using Consul, including service registration, health checks, and DNS-based discovery.

---

Nomad does not provide built-in service discovery on its own. The standard pattern is to integrate Nomad with Consul so services register automatically and can be discovered via DNS or API. This guide shows the setup and core configuration.

## Prerequisites

- Nomad cluster running
- Consul cluster available
- Nomad clients able to reach Consul

## Step 1: Configure Nomad to Use Consul

Add Consul integration in the Nomad client config:

```hcl
consul {
  address = "127.0.0.1:8500"
  auto_advertise = true
  server_auto_join = true
  client_auto_join = true
}
```

Restart Nomad clients after updating the config.

## Step 2: Register Services in a Job

Define a service stanza in your job file. Nomad will register it in Consul.

```hcl
job "api" {
  datacenters = ["dc1"]

  group "api" {
    network {
      port "http" { to = 8080 }
    }

    service {
      name = "api"
      port = "http"
      tags = ["v1", "http"]

      check {
        name     = "api-health"
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "api" {
      driver = "docker"
      config {
        image = "example/api:1.0.0"
        ports = ["http"]
      }
    }
  }
}
```

## Step 3: Discover Services via DNS

Consul provides DNS entries like:

```
api.service.consul
```

Within the same network, your apps can call `http://api.service.consul` to reach healthy instances.

## Step 4: Use Consul API for Discovery

Consul also exposes an HTTP API for service lookup. This is useful for custom routing or advanced logic.

```bash
curl http://localhost:8500/v1/health/service/api?passing=true
```

## Best Practices

- Use health checks to avoid routing traffic to unhealthy instances.
- Add version tags for canary routing or blue/green deployments.
- Use Consul ACLs if your environment requires strict access control.

## Troubleshooting

- **Service missing in Consul**: Check Nomad client logs and service stanza.
- **DNS not resolving**: Verify Consul DNS is running and reachable.
- **Health checks failing**: Confirm the service endpoint is correct and reachable from the Nomad client.

## Conclusion

Nomad service discovery is clean and reliable when backed by Consul. With a simple service stanza and health checks, you get dynamic discovery, load balancing, and safer deployments.
