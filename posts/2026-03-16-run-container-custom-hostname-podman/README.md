# How to Run a Container with Custom Hostname in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Hostname

Description: Learn how to set custom hostnames and domain names for Podman containers to match your application requirements and network conventions.

---

> Setting a meaningful hostname makes containers identifiable in logs, monitoring systems, and network communications.

By default, Podman assigns a random container ID as the hostname. This is rarely useful for debugging or when applications use the hostname for identification. Setting a custom hostname helps with log correlation, service discovery, and applications that use the hostname for configuration or licensing.

---

## Setting a Custom Hostname

Use the `--hostname` (or `-h`) flag to assign a custom hostname:

```bash
# Set a custom hostname

podman run --rm --hostname my-web-server alpine hostname

# Verify the full hostname configuration
podman run --rm --hostname app-server-01 alpine sh -c '
  echo "hostname: $(hostname)"
  echo "hosts file:"
  cat /etc/hosts
'
```

## Hostname with Domain Name

Use a fully qualified name with `--hostname` when you want the hostname to include a domain name:

```bash
# Set a hostname that includes a domain name
podman run --rm \
  --hostname web01.example.com \
  alpine sh -c '
    echo "Hostname: $(hostname)"
    echo "Short hostname: $(hostname | cut -d. -f1)"
    cat /etc/hosts
  '
```

## Hostname in /etc/hosts

Podman automatically adds the hostname to `/etc/hosts`:

```bash
# Check how the hostname appears in /etc/hosts
podman run --rm --hostname myserver alpine sh -c '
  echo "--- /etc/hosts ---"
  cat /etc/hosts
  echo ""
  echo "--- hostname resolution ---"
  ping -c 1 myserver
'
```

## Custom Hostname with Networking

When using custom networks, use a network alias when other containers need to resolve the same name through Podman's network DNS:

```bash
# Create a network
podman network create hostname-demo

# Start a container with a custom hostname
podman run -d --name server \
  --network hostname-demo \
  --hostname db-primary \
  --network-alias db-primary \
  alpine sleep infinity

# Another container can resolve both the container name and network alias
podman run --rm \
  --network hostname-demo \
  alpine sh -c '
    ping -c 1 server && echo "Resolved by container name"
    ping -c 1 db-primary && echo "Resolved by network alias"
  '

# Clean up
podman stop server && podman rm server
podman network rm hostname-demo
```

## Practical Patterns for Hostname Naming

```bash
# Pattern: environment-role-number
podman run -d --hostname prod-web-01 --name web1 alpine sleep infinity
podman run -d --hostname prod-web-02 --name web2 alpine sleep infinity

# Pattern: application-component
podman run -d --hostname myapp-frontend --name frontend alpine sleep infinity
podman run -d --hostname myapp-backend --name backend alpine sleep infinity

# Pattern: datacenter-rack-service
podman run -d --hostname us-east-1a-cache --name cache alpine sleep infinity
```

## Using Hostname in Application Configuration

Many applications read the hostname at startup:

```bash
# Application that uses hostname for identification
podman run --rm --hostname worker-node-5 alpine sh -c '
  # Simulate an application that logs its identity
  echo "[$(date)] Worker $(hostname) starting up"
  echo "[$(date)] Worker $(hostname) processing jobs"
  echo "[$(date)] Worker $(hostname) shutting down"
'

# PostgreSQL uses hostname in its logs
podman run -d \
  --hostname postgres-primary \
  --name pg \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

podman logs pg 2>&1 | head -5

podman stop pg && podman rm pg
```

## Combining Hostname with Other Networking Options

```bash
# Full networking setup with custom hostname
podman run -d \
  --name full-network \
  --hostname api-gateway.services.local \
  --dns 8.8.8.8 \
  --dns-search services.local \
  --add-host db.services.local:10.0.0.50 \
  alpine sleep infinity

# Verify all settings
podman exec full-network sh -c '
  echo "Hostname: $(hostname)"
  echo ""
  echo "--- /etc/hosts ---"
  cat /etc/hosts
  echo ""
  echo "--- /etc/resolv.conf ---"
  cat /etc/resolv.conf
'

podman stop full-network && podman rm full-network
```

## Hostname in Pods

When using pods with the default shared UTS namespace, containers use the pod's hostname:

```bash
# Create a pod with a hostname
podman pod create --name my-pod --hostname pod-host

# Containers in the pod share the pod's hostname
podman run -d --pod my-pod --name c1 alpine sleep infinity
podman exec c1 hostname

# Clean up
podman pod stop my-pod && podman pod rm my-pod
```

## Inspecting a Container's Hostname

```bash
# Check the configured hostname via inspect
podman run -d --hostname custom-host --name inspect-test alpine sleep infinity

podman inspect inspect-test --format '
  Hostname: {{.Config.Hostname}}
'

podman stop inspect-test && podman rm inspect-test
```

## Summary

Custom hostnames in Podman improve container identity and network operations:

- Use `--hostname` to set a meaningful container hostname
- Use a fully qualified name with `--hostname` when you need a domain-qualified hostname
- Podman automatically adds the hostname to `/etc/hosts`
- Custom network DNS resolves container names and configured network aliases
- Applications can read the hostname for logging, configuration, and identification
- Follow consistent naming conventions for easier management

A well-chosen hostname makes debugging, monitoring, and log analysis significantly easier in multi-container environments.
