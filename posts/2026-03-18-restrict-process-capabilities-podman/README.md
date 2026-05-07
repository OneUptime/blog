# How to Restrict Process Capabilities in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Capabilities, Linux

Description: Learn how to drop and add Linux capabilities in Podman containers to enforce the principle of least privilege.

---

> Dropping unnecessary capabilities is the single most impactful step you can take to reduce the blast radius of a compromised container.

Linux capabilities break the monolithic root privilege into discrete units. Instead of giving a process full root access, you can grant only the specific privileges it needs. Podman supports fine-grained capability management, letting you drop dangerous capabilities and add only what your application requires.

---

## Understanding Linux Capabilities

Traditional Unix security gives root all privileges and regular users almost none. Linux capabilities split root privileges into about 40 distinct capabilities, such as NET_BIND_SERVICE (bind to ports below 1024) and SYS_ADMIN (perform administrative operations).

```bash
# List the default capabilities of a Podman container

podman run --rm docker.io/library/alpine:latest sh -c "cat /proc/1/status | grep Cap"
```

```bash
# Decode the capability bitmask to human-readable names
podman run --rm docker.io/library/alpine:latest sh -c "
  apk add -q libcap-utils &&
  capsh --decode=\$(cat /proc/1/status | grep CapEff | awk '{print \$2}')
"
```

## Viewing Default Container Capabilities

Podman containers start with a default set of capabilities that is already more restricted than full root.

```bash
# Show the default capabilities Podman grants
podman run --rm docker.io/library/fedora:latest sh -c "
  dnf install -y -q libcap &&
  getpcaps 1
"
```

## Dropping All Capabilities

The most secure approach is to drop all capabilities and add back only what you need.

```bash
# Drop all capabilities
podman run --rm \
  --cap-drop=ALL \
  docker.io/library/alpine:latest \
  sh -c "cat /proc/1/status | grep CapEff"
# Expected output: CapEff: 0000000000000000 (no capabilities)
```

```bash
# Verify the container cannot perform privileged operations
podman run --rm \
  --cap-drop=ALL \
  docker.io/library/alpine:latest \
  sh -c "chown nobody /etc/hostname 2>&1 || echo 'Operation denied - no capabilities'"
```

## Adding Specific Capabilities

After dropping all capabilities, add back only the ones your application needs.

```bash
# Drop all capabilities, then add only what nginx needs
podman run --rm -d \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --cap-add=SETGID \
  --cap-add=SETUID \
  --name minimal-nginx \
  -p 8080:80 \
  docker.io/library/nginx:alpine
```

```bash
# Verify the container is running with minimal capabilities
podman exec minimal-nginx sh -c "
  apk add -q libcap-utils &&
  getpcaps 1
"
```

## Common Capability Profiles

Different applications require different capabilities. Here are common profiles.

```bash
# Web server: needs to bind to privileged ports and switch worker user/group
podman run --rm -d \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --cap-add=CHOWN \
  --cap-add=SETGID \
  --cap-add=SETUID \
  --name web-profile \
  docker.io/library/nginx:alpine

# Network utility: needs raw sockets for ping
podman run --rm \
  --cap-drop=ALL \
  --cap-add=NET_RAW \
  docker.io/library/alpine:latest \
  ping -c 2 8.8.8.8

# Log manager: needs to change file ownership
podman run --rm \
  --cap-drop=ALL \
  --cap-add=CHOWN \
  --cap-add=DAC_OVERRIDE \
  --cap-add=FOWNER \
  docker.io/library/alpine:latest \
  sh -c "touch /tmp/logfile && chown nobody /tmp/logfile && ls -la /tmp/logfile"
```

## Dropping Dangerous Capabilities Selectively

If dropping all capabilities is too restrictive, you can selectively drop the most dangerous ones.

```bash
# Drop the most dangerous capabilities while keeping defaults
podman run --rm -d \
  --cap-drop=SYS_ADMIN \
  --cap-drop=NET_ADMIN \
  --cap-drop=SYS_PTRACE \
  --cap-drop=SYS_RAWIO \
  --cap-drop=MKNOD \
  --cap-drop=AUDIT_WRITE \
  --name selective-drop \
  docker.io/library/alpine:latest \
  sleep 3600
```

## Inspecting Container Capabilities

```bash
# Inspect capabilities of a running container
podman inspect minimal-nginx --format '{{.EffectiveCaps}}'
```

```bash
# Compare capabilities between two containers
echo "=== minimal-nginx ==="
podman inspect minimal-nginx --format '{{.EffectiveCaps}}'
echo "=== selective-drop ==="
podman inspect selective-drop --format '{{.EffectiveCaps}}'
```

## Capabilities in Podman Compose

```yaml
# docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
      - CHOWN
      - SETGID
      - SETUID
    ports:
      - "8080:80"
```

```bash
# Launch and verify
podman-compose up -d
podman inspect $(podman-compose ps -q web) --format '{{.EffectiveCaps}}'
```

## Cleanup

```bash
# Remove all test containers
podman stop minimal-nginx selective-drop web-profile 2>/dev/null
podman rm minimal-nginx selective-drop web-profile 2>/dev/null
```

## Summary

Restricting Linux capabilities in Podman containers enforces the principle of least privilege at the kernel level. By dropping all capabilities with `--cap-drop=ALL` and adding back only what your application genuinely requires, you dramatically reduce the potential damage from a container compromise. This practice should be standard in every production container configuration.
