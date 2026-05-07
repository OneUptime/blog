# How to Use No-New-Privileges with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, Hardening, Privilege

Description: Learn how to use the no-new-privileges flag in Podman to prevent container processes from gaining additional privileges through setuid binaries or other escalation mechanisms.

---

> No-new-privileges is a simple kernel-level guarantee that `execve()` will not grant a process privileges it did not already have.

The `no-new-privileges` flag is a Linux kernel feature that prevents a process and its children from gaining additional privileges through `execve()`. When enabled, setuid and setgid binaries cannot escalate permissions through `execve()`, and file capabilities cannot add to the process's permitted capability set. Podman supports this flag as a critical hardening measure for containers.

This guide explains how no-new-privileges works, how to enable it in Podman, and why it should be part of your container security baseline.

---

## How No-New-Privileges Works

The `no_new_privs` bit is a process attribute in the Linux kernel. Once set, it applies to the current process and all its descendants and cannot be unset.

```bash
# Check if no_new_privs is set inside a default container

# A value of 0 means it is not set; 1 means it is active
podman run --rm docker.io/library/alpine:latest \
  sh -c "cat /proc/self/status | grep NoNewPrivs"
```

When `no_new_privs` is set:
- On `execve()`, setuid and setgid bits on executables are ignored
- `execve()` cannot grant additional privileges through file capabilities
- Child processes inherit the restriction

## Enabling No-New-Privileges

Use the `--security-opt no-new-privileges` flag when running a container.

```bash
# Run a container with no-new-privileges enabled
podman run --rm \
  --security-opt no-new-privileges \
  docker.io/library/alpine:latest \
  sh -c "cat /proc/self/status | grep NoNewPrivs"

# The output should show NoNewPrivs: 1
```

## Demonstrating Protection Against Privileged Executables

The primary benefit of no-new-privileges is blocking `execve()`-based privilege escalation through setuid, setgid, or file-capability-enabled executables.

```bash
# Without no-new-privileges, executables that rely on setuid bits
# or file capabilities can gain privileges on exec
podman run --rm \
  docker.io/library/alpine:latest \
  sh -c 'command -v ping >/dev/null && ls -la "$(command -v ping)" 2>/dev/null; ping -c 1 127.0.0.1'

# With no-new-privileges, execve() will not honor setuid/setgid bits
# or add file capabilities to the new process
podman run --rm \
  --security-opt no-new-privileges \
  docker.io/library/alpine:latest \
  sh -c 'ping -c 1 127.0.0.1 2>&1 || echo "If ping depends on setuid or file capabilities, it may fail here"'
```

## Combining with Capability Restrictions

No-new-privileges works best when combined with dropped capabilities for defense in depth.

```bash
# Drop all capabilities and enable no-new-privileges
# This creates a heavily restricted container environment
podman run --rm \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  docker.io/library/alpine:latest \
  sh -c "
    echo 'Capabilities:' && \
    cat /proc/self/status | grep -E 'Cap|NoNewPrivs'
  "

# Add back only needed capabilities while keeping no-new-privileges
podman run --rm \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges \
  docker.io/library/alpine:latest \
  sh -c "cat /proc/self/status | grep -E 'Cap|NoNewPrivs'"
```

## Practical Example: Hardened Web Server

Apply no-new-privileges to a production web server container.

```bash
# Run nginx with no-new-privileges enabled
podman run -d \
  --name hardened-nginx \
  --security-opt no-new-privileges \
  -p 8080:80 \
  docker.io/library/nginx:alpine

# Verify the security settings
podman inspect hardened-nginx --format '{{.HostConfig.SecurityOpt}}'

# Confirm no-new-privileges is active for the container's main process
podman exec hardened-nginx \
  sh -c "cat /proc/1/status | grep NoNewPrivs"

# Test that the web server still works
curl -s http://localhost:8080 | head -3

# Clean up
podman stop hardened-nginx && podman rm hardened-nginx
```

## Using with Non-Root Containers

No-new-privileges is especially important for containers that run as non-root.

```bash
# Run as a non-root user with no-new-privileges
# Even if a setuid binary exists, it cannot escalate to root
podman run --rm \
  --user 1000:1000 \
  --security-opt no-new-privileges \
  docker.io/library/alpine:latest \
  sh -c "
    echo 'Running as:' && id
    echo 'NoNewPrivs:' && cat /proc/self/status | grep NoNewPrivs
  "
```

## Configuring in Podman Compose

Apply no-new-privileges across all services in a compose file. Because `podman compose` delegates to an external compose provider, this syntax follows the Compose specification.

```bash
# Create a compose file with no-new-privileges for all services
cat > /tmp/hardened-compose.yml << 'EOF'
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    security_opt:
      - no-new-privileges:true
  app:
    image: docker.io/library/python:3-slim
    command: python3 -m http.server 8000
    security_opt:
      - no-new-privileges:true
EOF

echo "Hardened compose file created at /tmp/hardened-compose.yml"
```

## Summary

The `--security-opt no-new-privileges` flag is one of the most effective container hardening measures available. It prevents `execve()`-based privilege escalation through setuid binaries, setgid binaries, and file capabilities. Enable it on production containers, combine it with dropped capabilities and non-root users where appropriate, and use it consistently in your run or compose configuration. The security benefit is substantial, and the operational cost is low.
