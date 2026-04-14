# How to Configure SQLite Name Resolution in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SQLite, Name Resolution, Self-Hosted, Service Discovery

Description: Learn how to configure Dapr's SQLite name resolution component for reliable service discovery in self-hosted environments where mDNS is unavailable.

---

## Why Use SQLite for Name Resolution?

Dapr's default self-hosted name resolution uses mDNS, which relies on multicast networking. In many environments - Docker containers, cloud VMs, or systems with restrictive firewalls - multicast is unavailable. SQLite name resolution solves this by storing service registrations in a local SQLite database file accessible to all Dapr sidecars on the same host.

This is ideal for development environments, single-host deployments, and CI/CD pipelines.

## Configuring SQLite Name Resolution

Name resolution in Dapr is configured through a **Configuration** resource, not a Component resource. Create a configuration file:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "sqlite"
    version: "v1"
    configuration:
      connectionString: "/tmp/dapr-nameresolution.db"
      timeout: "1s"
      cleanupInterval: "1h"
      updateInterval: "5s"
```

Place this file as your Dapr configuration (e.g., `~/.dapr/config.yaml`), or pass it explicitly with the `--config` flag when running Dapr.

## Running Multiple Services with SQLite Resolution

All services on the same host share the same SQLite database file. Start multiple services pointing to the same configuration:

```bash
# Terminal 1
dapr run --app-id order-service \
  --app-port 8080 \
  --config ~/.dapr/config.yaml \
  --resources-path ~/.dapr/components \
  -- ./order-service

# Terminal 2
dapr run --app-id payment-service \
  --app-port 8081 \
  --config ~/.dapr/config.yaml \
  --resources-path ~/.dapr/components \
  -- ./payment-service
```

Both services register themselves in the shared SQLite database and can discover each other.

## Verifying Service Registration

Inspect the SQLite database to confirm services are registered:

```bash
sqlite3 /tmp/dapr-nameresolution.db \
  "SELECT app_id, address, last_update FROM hosts;"
```

Expected output:

```text
order-service|127.0.0.1:50001|1743339600
payment-service|127.0.0.1:50002|1743339601
```

Note that `address` includes the port (as `host:port`), and `last_update` is stored as a Unix epoch timestamp.

## Using SQLite in Docker Compose

Mount a shared volume so all containers use the same database. In Docker Compose, each application needs a separate `daprd` sidecar container:

```yaml
version: "3.8"
services:
  order-service:
    image: myapp/order-service

  order-service-dapr:
    image: "daprio/daprd:latest"
    command:
      [
        "./daprd",
        "--app-id", "order-service",
        "--app-port", "8080",
        "--resources-path", "/components",
        "--config", "/config/config.yaml",
      ]
    volumes:
      - dapr-db:/tmp
      - ./components:/components
      - ./config:/config
    network_mode: "service:order-service"

  payment-service:
    image: myapp/payment-service

  payment-service-dapr:
    image: "daprio/daprd:latest"
    command:
      [
        "./daprd",
        "--app-id", "payment-service",
        "--app-port", "8081",
        "--resources-path", "/components",
        "--config", "/config/config.yaml",
      ]
    volumes:
      - dapr-db:/tmp
      - ./components:/components
      - ./config:/config
    network_mode: "service:payment-service"

volumes:
  dapr-db:
```

Note: SQLite name resolution is designed for scenarios where all Dapr instances access the database through the same locally-mounted disk. Using it with a database file accessed over the network (e.g., NFS/SMB) is not supported and may cause data corruption.

## Configuration Parameters Explained

| Parameter | Description | Default |
|-----------|-------------|---------|
| `connectionString` | Path to the SQLite database file | Required |
| `timeout` | Database operation timeout | `1s` |
| `cleanupInterval` | How often stale entries are removed | `1h` |
| `updateInterval` | How often the host entry is refreshed | `5s` |

Tune `updateInterval` and `cleanupInterval` based on your deployment. For fast-cycling containers, use shorter intervals to ensure stale entries are cleared quickly:

```yaml
spec:
  nameResolution:
    component: "sqlite"
    version: "v1"
    configuration:
      connectionString: "/tmp/dapr-nameresolution.db"
      updateInterval: "2s"
      cleanupInterval: "10s"
```

## Limitations

SQLite name resolution is limited to services that share access to the database file. It is not suitable for distributed, multi-host environments. For multi-host setups, use Consul or Kubernetes DNS instead.

## Summary

Dapr's SQLite name resolution component stores service registrations in a local SQLite file, making it a reliable alternative to mDNS in Docker or containerized environments. Configure a shared volume so all services access the same database, and tune the update and cleanup intervals for your deployment's needs.
