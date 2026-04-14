# How to Use Dapr with Nomad

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Nomad, HashiCorp, Sidecar, Container Orchestration

Description: Deploy Dapr microservices on HashiCorp Nomad by running daprd as a sidecar task in Nomad task groups with shared network namespaces.

---

HashiCorp Nomad's task group model supports running multiple containers in a shared network namespace, making it well-suited for the Dapr sidecar pattern. The `daprd` process runs as a companion task alongside your application task.

## Nomad Task Group Structure

In Nomad, a task group defines co-located tasks that share a network namespace. This enables the Dapr sidecar pattern:

```hcl
job "order-service" {
  datacenters = ["dc1"]
  type        = "service"

  group "order-service" {
    count = 2

    network {
      mode = "bridge"
      port "app" {
        to = 8080
      }
      port "dapr-http" {
        to = 3500
      }
      port "dapr-grpc" {
        to = 50001
      }
    }

    # Application task
    task "app" {
      driver = "docker"

      config {
        image = "myrepo/order-service:1.0.0"
        ports = ["app"]
      }

      env {
        DAPR_HTTP_PORT = "3500"
        DAPR_GRPC_PORT = "50001"
      }

      resources {
        cpu    = 200
        memory = 256
      }
    }

    # Dapr sidecar task
    task "daprd" {
      driver = "docker"

      config {
        image = "daprio/daprd:1.14.0"
        args = [
          "./daprd",
          "--app-id",            "order-service",
          "--app-port",          "8080",
          "--dapr-http-port",    "3500",
          "--dapr-grpc-port",    "50001",
          "--resources-path",    "/dapr/components",
          "--config",            "/dapr/config/config.yaml",
          "--log-level",         "info",
        ]
        ports   = ["dapr-http", "dapr-grpc"]
        volumes = [
          "local/components:/dapr/components",
          "local/config:/dapr/config",
        ]
      }

      template {
        data = <<EOF
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "{{ env "NOMAD_HOST_ADDR_redis" }}"
EOF
        destination = "local/components/statestore.yaml"
      }

      resources {
        cpu    = 100
        memory = 128
      }
    }
  }
}
```

## Consul Service Discovery Integration

Nomad and Consul work together natively. Register Dapr-enabled services in Consul:

```hcl
service {
  name = "order-service"
  port = "app"
  tags = ["dapr-enabled"]

  check {
    type     = "http"
    path     = "/v1.0/healthz"
    port     = "dapr-http"
    interval = "10s"
    timeout  = "2s"
  }
}
```

## Using Consul as Dapr Name Resolver

Configure Dapr to use Consul for service resolution in non-Kubernetes environments:

```yaml
# config/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: config
spec:
  nameResolution:
    component: consul
    configuration:
      selfRegister: true
      queryOptions:
        useCache: true
      daprPortMetaKey: DAPR_PORT
```

## Deploying the Nomad Job

```bash
# Validate the job spec
nomad job validate order-service.hcl

# Plan the deployment
nomad job plan order-service.hcl

# Run the job
nomad job run order-service.hcl

# Check job status
nomad job status order-service

# View task logs
nomad alloc logs -task daprd <alloc-id>
```

## Scaling and Updates

Scale the number of service instances:

```bash
# Scale order-service to 4 instances
nomad job scale order-service order-service 4
```

For rolling updates, Nomad's update stanza controls the deployment:

```hcl
update {
  max_parallel      = 1
  min_healthy_time  = "10s"
  healthy_deadline  = "5m"
  progress_deadline = "10m"
  auto_revert       = true
}
```

## Summary

Dapr on Nomad leverages task groups with shared network namespaces to run `daprd` alongside application tasks. Nomad's template engine generates Dapr component configuration files dynamically, while Consul provides service discovery for Dapr name resolution. The self-hosted Dapr mode on Nomad supports all core Dapr building blocks including state management, pub/sub, and service invocation.
