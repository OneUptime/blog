# How to Add Linux Capabilities to a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, Capabilities

Description: Learn how to grant specific Linux capabilities to Podman containers for fine-grained privilege control without running as root.

---

> Linux capabilities let you grant only the exact privileges a container needs, avoiding the all-or-nothing trap of running fully privileged containers.

Containers run with a restricted set of Linux capabilities by default. Sometimes your workload needs additional privileges, such as binding to low-numbered ports after dropping defaults or modifying network settings, but running a fully privileged container is overkill. Podman's `--cap-add` flag lets you selectively add individual capabilities so your container gets precisely what it needs and nothing more.

This guide walks through listing, understanding, and adding Linux capabilities to Podman containers with practical examples.

---

## Understanding Linux Capabilities

Linux capabilities split the traditional root privilege into distinct units. Instead of giving a process all-or-nothing superuser power, you can assign only the specific capabilities it requires.

```bash
# Inspect the current shell's capability sets

# The capsh utility is part of the libcap package
capsh --print
```

Some commonly needed capabilities include:

- `NET_BIND_SERVICE` - bind to ports below 1024 (commonly included in Podman's default capability set)
- `NET_ADMIN` - configure network interfaces and routing
- `SYS_PTRACE` - trace and debug processes
- `SYS_ADMIN` - broad administrative operations (use with caution)
- `CHOWN` - change file ownership
- `DAC_OVERRIDE` - bypass file read/write/execute permission checks

## Checking Default Capabilities

Podman containers already come with a baseline set of capabilities. You can inspect what a container gets by default.

```bash
# Run a container and check its current capabilities
# The /proc/self/status file contains capability bitmasks
podman run --rm docker.io/library/alpine:latest sh -c \
  "cat /proc/self/status | grep Cap"

# Decode the capability bitmask into human-readable names
# CapEff is the effective capability set
podman run --rm docker.io/library/alpine:latest sh -c \
  "apk add --no-cache libcap && capsh --decode=\$(cat /proc/self/status | grep CapEff | awk '{print \$2}')"
```

## Adding a Single Capability

Use the `--cap-add` flag to grant one additional capability to a container.

```bash
# Start from no capabilities and add NET_BIND_SERVICE so the container can bind to port 80
# This is useful for hardened web server containers
podman run --rm \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  docker.io/library/alpine:latest \
  sh -c "echo 'Can now bind to low ports'"

# Add NET_ADMIN to allow network configuration changes
# Useful for VPN containers or network debugging tools
podman run --rm \
  --cap-add NET_ADMIN \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache iproute2 && ip link show"
```

## Adding Multiple Capabilities

You can pass `--cap-add` multiple times or combine capabilities.

```bash
# Add multiple capabilities for a monitoring container
# SYS_PTRACE allows attaching to processes for debugging
# NET_ADMIN allows network administration tasks
podman run --rm \
  --cap-add SYS_PTRACE \
  --cap-add NET_ADMIN \
  docker.io/library/alpine:latest \
  sh -c "echo 'Running with SYS_PTRACE and NET_ADMIN'"

# Verify the added capabilities inside the container
podman run --rm \
  --cap-add SYS_PTRACE \
  --cap-add NET_ADMIN \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache libcap && getpcaps 1"
```

## Practical Example: Running a Web Server on Port 80

A common use case is running a hardened web server that needs to bind to port 80 after default capabilities have been dropped.

```bash
# Without NET_BIND_SERVICE, binding to port 80 fails when privileged ports start at 1024
# This command will produce a permission denied error
podman run --rm \
  --cap-drop ALL \
  --sysctl net.ipv4.ip_unprivileged_port_start=1024 \
  docker.io/library/python:3-slim \
  python3 -m http.server 80 || echo "Failed as expected"

# With NET_BIND_SERVICE added, the same operation succeeds
# The container can now serve traffic on port 80
podman run --rm -d \
  --name web-server \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --sysctl net.ipv4.ip_unprivileged_port_start=1024 \
  -p 8080:80 \
  docker.io/library/python:3-slim \
  python3 -m http.server 80

# Verify the server is running
podman ps --filter name=web-server

# Clean up when done
podman stop web-server
```

## Adding All Capabilities

In rare cases during development or debugging, you may want to grant all capabilities.

```bash
# Add all capabilities - use only for debugging, never in production
# This grants every capability available to the container, but is still not the same as --privileged
podman run --rm \
  --cap-add ALL \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache libcap && capsh --print"
```

## Inspecting Container Capabilities

You can check which capabilities a running container has been granted.

```bash
# Start a long-running container with added capabilities
podman run -d --name cap-test \
  --cap-add NET_ADMIN \
  --cap-add SYS_PTRACE \
  docker.io/library/alpine:latest sleep 3600

# Inspect the container configuration for capability details
# EffectiveCaps shows the resulting effective capability set
podman inspect cap-test --format '{{.HostConfig.CapAdd}}'
podman inspect cap-test --format '{{.EffectiveCaps}}'

# Clean up
podman stop cap-test && podman rm cap-test
```

## Summary

Adding Linux capabilities to Podman containers with `--cap-add` gives you fine-grained control over container privileges. Always prefer adding specific capabilities over running with `--privileged` or `--cap-add ALL`. Audit which capabilities your application actually needs, add only those, and document your choices so future maintainers understand why each capability was granted.
