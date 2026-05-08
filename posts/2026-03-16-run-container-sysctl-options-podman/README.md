# How to Run a Container with Sysctl Options in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Sysctl, Kernel, Networking

Description: Learn how to tune kernel parameters inside Podman containers using sysctl options for network performance, security, and application-specific requirements.

---

> Sysctl options let you tune kernel parameters inside a container without affecting the host, giving applications the kernel behavior they need.

Sysctl parameters control various aspects of the Linux kernel's behavior: network stack tuning, memory management, security settings, and more. By default, containers inherit many kernel parameters from the host, but some applications require specific settings. Podman's `--sysctl` flag lets you set namespaced kernel parameters inside a container.

---

## Basic Sysctl Usage

Use the `--sysctl` flag to set kernel parameters:

```bash
# Set a network sysctl parameter

podman run --rm --sysctl net.ipv4.ip_forward=1 alpine sh -c "
  sysctl net.ipv4.ip_forward
"

# Set multiple parameters
podman run --rm \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv4.conf.all.forwarding=1 \
  alpine sh -c "
    sysctl net.ipv4.ip_forward
    sysctl net.ipv4.conf.all.forwarding
  "
```

## Namespaced vs Non-Namespaced Sysctls

Only namespaced sysctls can be set safely in containers. These include `net.*` parameters in a private network namespace and specific IPC-related `kernel.*` parameters:

```bash
# Namespaced sysctls (safe to set per container)
podman run --rm \
  --sysctl net.ipv4.ip_unprivileged_port_start=0 \
  alpine sh -c "
    sysctl net.ipv4.ip_unprivileged_port_start
  "

# Check which sysctls are available
podman run --rm alpine sysctl -a 2>/dev/null | head -20
```

## Network Performance Tuning

Optimize the network stack for high-throughput applications:

```bash
# High-performance network configuration
podman run -d --name high-perf-net \
  --sysctl net.core.somaxconn=65535 \
  --sysctl net.ipv4.tcp_max_syn_backlog=65535 \
  --sysctl net.ipv4.tcp_fin_timeout=30 \
  --sysctl net.ipv4.tcp_tw_reuse=1 \
  alpine sleep infinity

# Verify the settings
podman exec high-perf-net sh -c "
  echo 'somaxconn:' $(sysctl -n net.core.somaxconn)
  echo 'tcp_max_syn_backlog:' $(sysctl -n net.ipv4.tcp_max_syn_backlog)
  echo 'tcp_fin_timeout:' $(sysctl -n net.ipv4.tcp_fin_timeout)
  echo 'tcp_tw_reuse:' $(sysctl -n net.ipv4.tcp_tw_reuse)
"

podman stop high-perf-net && podman rm high-perf-net
```

## Web Server Optimization

Tune kernel parameters for web servers handling many connections:

```bash
# Nginx with optimized kernel parameters
podman run -d --name optimized-nginx \
  --sysctl net.core.somaxconn=65535 \
  --sysctl net.ipv4.tcp_max_syn_backlog=65535 \
  --sysctl net.ipv4.ip_local_port_range="1024 65535" \
  --sysctl net.ipv4.tcp_fin_timeout=15 \
  -p 8080:80 \
  nginx:latest

podman stop optimized-nginx && podman rm optimized-nginx
```

## Allowing Unprivileged Port Binding

By default on Linux, ports below 1024 require root. You can change this inside the container's network namespace:

```bash
# Allow binding to any port without root
podman run --rm \
  --sysctl net.ipv4.ip_unprivileged_port_start=0 \
  --user 1000:1000 \
  alpine sh -c "
    sysctl -n net.ipv4.ip_unprivileged_port_start
    echo 'Non-root users can now bind to ports starting from 0'
  "

# Allow binding to ports 80 and above
podman run --rm \
  --sysctl net.ipv4.ip_unprivileged_port_start=80 \
  alpine sh -c "
    sysctl -n net.ipv4.ip_unprivileged_port_start
  "
```

## IP Forwarding for Router/VPN Containers

Enable IP forwarding for containers that act as routers or VPN gateways:

```bash
# Enable IPv4 and IPv6 forwarding
podman run -d --name router \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv4.conf.all.forwarding=1 \
  --sysctl net.ipv6.conf.all.forwarding=1 \
  alpine sleep infinity

podman exec router sysctl net.ipv4.ip_forward

podman stop router && podman rm router
```

## TCP Keepalive Settings

Tune TCP keepalive for long-lived connections:

```bash
# Optimize keepalive for database connections
podman run -d --name db-client \
  --sysctl net.ipv4.tcp_keepalive_time=60 \
  --sysctl net.ipv4.tcp_keepalive_intvl=10 \
  --sysctl net.ipv4.tcp_keepalive_probes=6 \
  alpine sleep infinity

podman exec db-client sh -c "
  echo 'Keepalive time:' $(sysctl -n net.ipv4.tcp_keepalive_time) seconds
  echo 'Keepalive interval:' $(sysctl -n net.ipv4.tcp_keepalive_intvl) seconds
  echo 'Keepalive probes:' $(sysctl -n net.ipv4.tcp_keepalive_probes)
"

podman stop db-client && podman rm db-client
```

## Shared Memory Kernel Parameters

Tune shared memory settings for databases:

```bash
# Increase shared memory limits for PostgreSQL
podman run -d --name postgres-tuned \
  --sysctl kernel.shmmax=268435456 \
  --sysctl kernel.shmall=2097152 \
  --shm-size 256m \
  -e POSTGRES_PASSWORD=secret \
  postgres:16 2>/dev/null || echo "Note: kernel.shm* may not be namespaced on all systems"

podman stop postgres-tuned 2>/dev/null && podman rm postgres-tuned 2>/dev/null
```

## Verifying Sysctl Settings

```bash
# Compare default vs custom sysctl values
echo "=== Default ==="
podman run --rm alpine sysctl -n net.core.somaxconn

echo "=== Custom ==="
podman run --rm --sysctl net.core.somaxconn=4096 alpine sysctl -n net.core.somaxconn

# Inspect the container configuration
podman run -d --name sysctl-check \
  --sysctl net.core.somaxconn=4096 \
  --sysctl net.ipv4.tcp_fin_timeout=15 \
  alpine sleep infinity

podman inspect sysctl-check --format '{{json .HostConfig.Sysctls}}' | python3 -m json.tool

podman stop sysctl-check && podman rm sysctl-check
```

## Sysctl in Pods

```bash
# Create a pod with sysctl settings
podman pod create --name tuned-pod \
  --sysctl net.core.somaxconn=4096

# Containers in the pod share the network namespace and its sysctls
podman run -d --pod tuned-pod --name pod-web nginx:latest

podman exec pod-web sh -c "sysctl -n net.core.somaxconn"

podman pod stop tuned-pod && podman pod rm tuned-pod
```

## Common Sysctl Recipes

```bash
# High-traffic web server
podman run --rm \
  --sysctl net.core.somaxconn=65535 \
  --sysctl net.ipv4.tcp_max_syn_backlog=65535 \
  --sysctl net.ipv4.ip_local_port_range="1024 65535" \
  --sysctl net.ipv4.tcp_tw_reuse=1 \
  --sysctl net.ipv4.tcp_fin_timeout=15 \
  alpine sh -c "echo 'Web server sysctls configured'"

# Database server
podman run --rm \
  --sysctl net.core.somaxconn=4096 \
  --sysctl net.ipv4.tcp_keepalive_time=60 \
  --sysctl net.ipv4.tcp_keepalive_intvl=10 \
  --sysctl net.ipv4.tcp_keepalive_probes=6 \
  alpine sh -c "echo 'Database sysctls configured'"

# VPN/Router container
podman run --rm \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv4.conf.all.forwarding=1 \
  --sysctl net.ipv6.conf.all.forwarding=1 \
  alpine sh -c "echo 'Router sysctls configured'"
```

## Summary

Sysctl options in Podman let you tune kernel parameters per container:

- Use `--sysctl key=value` to set namespaced kernel parameters
- `net.*` parameters can be tuned per container when the container has its own network namespace
- Common tuning targets: connection backlog, TCP timeouts, port ranges, IP forwarding
- Sysctl changes are isolated to the container and do not affect the host
- Use `podman inspect` to verify configured sysctls
- Combine with other resource limits for comprehensive container tuning

Kernel parameter tuning is a key optimization for production containers handling significant network traffic or requiring specific kernel behavior.
