# How to Drop Linux Capabilities from a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, Capabilities, Hardening

Description: Learn how to remove unnecessary Linux capabilities from Podman containers to minimize the attack surface and follow the principle of least privilege.

---

> Dropping capabilities you do not need is one of the simplest and most effective ways to harden a container.

By default, Podman grants containers a configurable set of Linux capabilities that covers common use cases. However, many containers do not need all of these default capabilities. Dropping unused ones reduces the attack surface and limits what a compromised container can do. Podman's `--cap-drop` flag makes this straightforward.

This guide explains how to identify and drop unnecessary capabilities from your Podman containers.

---

## Default Capabilities in Podman

Podman grants a baseline set of capabilities to every container. Understanding this baseline is the first step to deciding what to drop.

```bash
# View the default capabilities granted to a Podman container

# The CapEff line shows the effective capability bitmask
podman run --rm docker.io/library/alpine:latest \
  sh -c "cat /proc/self/status | grep Cap"

# Decode the bitmask to see human-readable capability names
podman run --rm docker.io/library/alpine:latest \
  sh -c "apk add --no-cache libcap && getpcaps 1"
```

The current default capabilities configured by containers-common are `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `FSETID`, `KILL`, `NET_BIND_SERVICE`, `SETFCAP`, `SETGID`, `SETPCAP`, `SETUID`, and `SYS_CHROOT`.

## Dropping a Single Capability

Use `--cap-drop` to remove a specific capability from the container.

```bash
# Drop the CHOWN capability so the container cannot change file ownership
# Useful when the container should not modify file permissions
podman run --rm \
  --cap-drop CHOWN \
  docker.io/library/alpine:latest \
  sh -c "chown nobody /tmp && echo 'success'" || echo "chown failed - capability dropped"

# Drop SETUID to prevent the container from changing user IDs
# This prevents processes from making arbitrary setuid calls
podman run --rm \
  --cap-drop SETUID \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache libcap && getpcaps 1"
```

## Dropping Multiple Capabilities

Pass `--cap-drop` multiple times to remove several capabilities at once.

```bash
# Drop multiple capabilities for a hardened container
# SETFCAP prevents setting file capabilities
# SETPCAP prevents changing process capability sets
# SYS_CHROOT prevents using the chroot system call
podman run --rm \
  --cap-drop SETFCAP \
  --cap-drop SETPCAP \
  --cap-drop SYS_CHROOT \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache libcap && getpcaps 1"
```

## Dropping All Capabilities

The most secure approach is to drop all capabilities and then add back only what the container specifically needs.

```bash
# Drop all capabilities - the container runs with no Linux capabilities
podman run --rm \
  --cap-drop ALL \
  docker.io/library/alpine:latest \
  sh -c "echo 'Running with no capabilities'"

# Drop all, then add back only what is needed
# This follows the principle of least privilege
podman run --rm \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache libcap && getpcaps 1"
```

## Practical Example: Hardening an Nginx Container

A production web server needs very few capabilities. Here is how to lock one down.

```bash
# Run nginx with all capabilities dropped except NET_BIND_SERVICE
# NET_BIND_SERVICE allows binding to port 80 inside the container
podman run -d \
  --name secure-nginx \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  -p 8080:80 \
  docker.io/library/nginx:alpine

# Verify the container is running with minimal capabilities
podman exec secure-nginx sh -c \
  "apk add --no-cache libcap && getpcaps 1"

# Test that the web server still responds
curl -s http://localhost:8080 | head -5

# Clean up
podman stop secure-nginx && podman rm secure-nginx
```

## Preventing Network-Based Attacks

Dropping `NET_RAW` prevents containers from using raw and packet sockets, which mitigates ARP spoofing and other low-level network attacks. Current Podman defaults do not include `NET_RAW`, but you should still drop it explicitly if your site defaults or container options add it.

```bash
# Keep NET_RAW absent to prevent raw socket creation
# Alpine's ping uses raw sockets, so it will fail without NET_RAW
podman run --rm \
  --cap-drop NET_RAW \
  docker.io/library/alpine:latest \
  ping -c 1 8.8.8.8 || echo "ping failed - NET_RAW absent"

# Compare with a container that explicitly has NET_RAW
podman run --rm \
  --cap-add NET_RAW \
  docker.io/library/alpine:latest \
  ping -c 1 8.8.8.8
```

## Verifying Dropped Capabilities

Always verify that capabilities were actually removed from a running container.

```bash
# Start a container with several capabilities dropped
podman run -d --name drop-test \
  --cap-drop CHOWN \
  --cap-drop FOWNER \
  --cap-drop SETUID \
  docker.io/library/alpine:latest sleep 3600

# Inspect the container to see which capabilities were dropped
podman inspect drop-test --format '{{.HostConfig.CapDrop}}'

# Check the effective capabilities from inside the container
podman exec drop-test sh -c \
  "apk add --no-cache libcap && getpcaps 1"

# Clean up
podman stop drop-test && podman rm drop-test
```

## Summary

Dropping Linux capabilities with `--cap-drop` is a fundamental container hardening technique. Start by dropping all capabilities with `--cap-drop ALL`, then add back only what your application requires. This principle of least privilege limits the blast radius if a container is compromised and is a best practice for any production Podman deployment.
