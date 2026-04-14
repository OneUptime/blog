# How to Configure HashiCorp Consul Name Resolution in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Consul, Name Resolution, Service Discovery, HashiCorp

Description: Learn how to configure Dapr to use HashiCorp Consul for service discovery and name resolution in self-hosted and Kubernetes environments.

---

## Why Use Consul with Dapr?

HashiCorp Consul provides robust service discovery, health checking, and key-value storage. When running Dapr in environments where Kubernetes DNS is unavailable (multi-cloud, bare metal, or hybrid deployments), Consul provides a reliable alternative for name resolution. Dapr's `nameresolution.consul` component registers services with Consul and resolves app IDs through Consul's service catalog.

## Setting Up Consul

Start a local Consul agent for development:

```bash
consul agent -dev -bind=127.0.0.1
```

For production, deploy Consul as a cluster. Using Docker Compose:

```yaml
version: "3.8"
services:
  consul:
    image: hashicorp/consul:1.17
    ports:
      - "8500:8500"
      - "8600:8600/udp"
    command: "agent -server -bootstrap-expect=1 -ui -client=0.0.0.0 -bind=0.0.0.0"
```

Start it:

```bash
docker compose up -d consul
```

## Configuring Dapr for Consul Name Resolution

Consul name resolution is configured through a Dapr Configuration resource (not a Component resource). Create a configuration file (e.g., `consul-config.yaml`):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
    configuration:
      client:
        address: "127.0.0.1:8500"
        scheme: "http"
        datacenter: "dc1"
      selfRegister: true
      checks:
        - name: "Dapr Health Status"
          checkID: "daprHealth:${APP_ID}"
          interval: "15s"
          http: "http://${HOST_ADDRESS}:${DAPR_HTTP_PORT}/v1.0/healthz"
      tags:
        - "dapr"
      queryOptions:
        useCache: true
```

The `selfRegister: true` field is required for Dapr to register your service with Consul. The `${APP_ID}`, `${HOST_ADDRESS}`, and `${DAPR_HTTP_PORT}` placeholders are automatically resolved by Dapr at runtime.

## Starting Dapr with Consul

The default configuration file location is `~/.dapr/config.yaml`. You can also specify a custom path with the `--config` flag:

```bash
dapr run --app-id order-service \
  --app-port 8080 \
  --config ./consul-config.yaml \
  -- ./order-service
```

Dapr will register the service in Consul on startup. Verify registration:

```bash
curl http://localhost:8500/v1/catalog/services | jq .
```

You should see `order-service` in the service list.

## Service Invocation Through Consul

Once registered, invoke services by app ID as usual:

```bash
curl http://localhost:3500/v1.0/invoke/payment-service/method/pay
```

Dapr resolves `payment-service` by querying Consul's service catalog.

## ACL Token Authentication

For secure Consul clusters with ACLs enabled, add a `token` field to the `client` configuration:

```yaml
spec:
  nameResolution:
    component: "consul"
    configuration:
      client:
        address: "consul.example.com:8500"
        scheme: "https"
        token: "my-consul-acl-token"
      selfRegister: true
```

To avoid hardcoding the token, use an environment variable with Dapr's template substitution:

```yaml
      client:
        address: "consul.example.com:8500"
        scheme: "https"
        token: "${CONSUL_ACL_TOKEN}"
```

Set the `CONSUL_ACL_TOKEN` environment variable before running your Dapr application, sourcing it from a secrets manager or Kubernetes secret as appropriate.

## Health Checks and Deregistration

The health check configuration in the Dapr configuration ensures Consul monitors your service's health status. If the app restarts, Dapr re-registers with Consul on startup.

**Important:** Dapr's name resolution interface does not deregister services on shutdown. If a service stops, it remains registered in Consul until manually removed or until Consul's health checks mark it as critical. Plan accordingly for cleanup in production environments.

To manually deregister a service:

```bash
curl -X PUT http://localhost:8500/v1/agent/service/deregister/order-service
```

## Summary

Dapr's Consul name resolution component registers services with HashiCorp Consul and resolves app IDs through the service catalog. It is ideal for non-Kubernetes environments and hybrid deployments. Configure health checks so Consul can monitor service health, and use ACL tokens for secure Consul clusters. Note that Dapr does not deregister services on shutdown, so plan for manual or external cleanup of stale service entries.
