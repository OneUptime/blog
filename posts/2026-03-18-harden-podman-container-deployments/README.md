# How to Harden Podman Container Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Hardening, Production

Description: Learn how to apply comprehensive hardening measures to Podman container deployments for production-grade security.

---

> Hardening is not a single step but a systematic application of every available defense. Each layer you add makes your deployment exponentially harder to compromise.

Hardening a Podman container deployment means applying security best practices across every layer: the host, the runtime configuration, the container image, the network, and the operational procedures. This guide brings together all the key hardening techniques into a comprehensive checklist and practical configuration.

---

## Host-Level Hardening

The security of your containers starts with the host operating system.

```bash
# Ensure Podman and dependencies are up to date

sudo dnf update -y podman containers-common 2>/dev/null || \
(sudo apt-get update && sudo apt-get install --only-upgrade -y podman) 2>/dev/null

# Verify Podman version
podman version
```

```bash
# Check that SELinux is in enforcing mode (RHEL/Fedora)
getenforce 2>/dev/null || echo "SELinux not available on this system"

# Enable SELinux enforcing mode if it is not
# sudo setenforce 1
# sudo sed -i 's/SELINUX=permissive/SELINUX=enforcing/' /etc/selinux/config
```

```bash
# Verify user namespace support is enabled
sysctl user.max_user_namespaces

# Verify subordinate UID/GID ranges are configured for rootless operation
cat /etc/subuid
cat /etc/subgid
```

## Image Hardening

Build minimal, secure container images.

```bash
# Example of a hardened Containerfile
cat > /tmp/Containerfile.hardened << 'EOF'
# Use a minimal base image
FROM docker.io/library/alpine:3.19

# Install only required packages
RUN apk add --no-cache curl tini && \
    # Remove package manager cache
    rm -rf /var/cache/apk/*

# Create a non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup -h /app -s /sbin/nologin

# Copy application files
COPY --chown=appuser:appgroup . /app/

# Set working directory
WORKDIR /app

# Run as non-root user
USER appuser

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Define the application command
CMD ["sh", "-c", "echo 'Hardened container running' && sleep 3600"]
EOF
```

```bash
# Build the hardened image
podman build -t hardened-app:latest -f /tmp/Containerfile.hardened /tmp
```

## Runtime Hardening Configuration

Apply all available runtime security options.

```bash
# Run a fully hardened container
podman run --rm -d \
  --name hardened-deployment \
  --read-only \
  --tmpfs /tmp:rw,size=64m,noexec,nosuid,nodev \
  --cap-drop=ALL \
  --security-opt no-new-privileges \
  --userns=auto \
  --memory=256m \
  --memory-swap=512m \
  --cpus=1 \
  --pids-limit=100 \
  --ulimit nofile=1024:2048 \
  --ulimit nproc=64:128 \
  -p 127.0.0.1:8080:8080 \
  hardened-app:latest
```

```bash
# Verify the hardening settings
podman inspect hardened-deployment --format '
  ReadOnly: {{.HostConfig.ReadonlyRootfs}}
  Privileged: {{.HostConfig.Privileged}}
  Memory: {{.HostConfig.Memory}}
  MemorySwap: {{.HostConfig.MemorySwap}}
  PidsLimit: {{.HostConfig.PidsLimit}}
  Capabilities: {{.EffectiveCaps}}
  SecurityOpts: {{.HostConfig.SecurityOpt}}
'
```

## Network Hardening

Minimize network exposure and isolate services.

```bash
# Create isolated networks for different services
podman network create --internal backend
podman network create frontend

# Run a database on the internal network only
podman run --rm -d \
  --network=backend \
  --name hardened-db \
  --read-only \
  --tmpfs /tmp:rw,size=32m \
  --cap-drop=ALL \
  --security-opt no-new-privileges \
  docker.io/library/alpine:latest sleep 3600

# Run the app with access to both networks
podman run --rm -d \
  --network=backend \
  --network=frontend \
  --name hardened-web \
  --read-only \
  --tmpfs /tmp:rw,size=32m \
  --tmpfs /var/cache/nginx:rw,size=64m \
  --tmpfs /var/run:rw,size=8m \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --security-opt no-new-privileges \
  -p 127.0.0.1:8080:80 \
  docker.io/library/nginx:alpine
```

Resource Limit Hardening

Prevent resource exhaustion attacks with strict limits.

```bash
# Apply comprehensive resource limits
podman run --rm -d \
  --name resource-limited \
  --memory=128m \
  --memory-swap=256m \
  --memory-reservation=64m \
  --cpus=0.5 \
  --pids-limit=50 \
  --ulimit nofile=512:1024 \
  --ulimit nproc=32:64 \
  --ulimit core=0:0 \
  docker.io/library/alpine:latest sleep 3600

# Verify resource limits
podman stats --no-stream resource-limited
```

## Hardening Checklist Script

```bash
#!/bin/bash
# hardening-check.sh - Check all containers against hardening best practices

echo "========================================"
echo "Podman Container Hardening Audit"
echo "Date: $(date)"
echo "========================================"

containers=$(podman ps -q)
if [ -z "$containers" ]; then
  echo "No running containers found."
  exit 0
fi

pass=0
warn=0
fail=0

for cid in $containers; do
  name=$(podman inspect "$cid" --format '{{.Name}}')
  echo ""
  echo "--- $name ---"

  # Check 1: Read-only root filesystem
  ro=$(podman inspect "$cid" --format '{{.HostConfig.ReadonlyRootfs}}')
  if [ "$ro" = "true" ]; then
    echo "[PASS] Read-only root filesystem"
    ((pass++))
  else
    echo "[WARN] Writable root filesystem"
    ((warn++))
  fi

  # Check 2: Not privileged
  priv=$(podman inspect "$cid" --format '{{.HostConfig.Privileged}}')
  if [ "$priv" = "false" ]; then
    echo "[PASS] Not privileged"
    ((pass++))
  else
    echo "[FAIL] Running in privileged mode"
    ((fail++))
  fi

  # Check 3: Non-root user
  user=$(podman inspect "$cid" --format '{{.Config.User}}')
  if [ -n "$user" ] && [ "$user" != "root" ] && [ "$user" != "0" ]; then
    echo "[PASS] Running as non-root user: $user"
    ((pass++))
  else
    echo "[WARN] Running as root"
    ((warn++))
  fi

  # Check 4: Memory limit set
  mem=$(podman inspect "$cid" --format '{{.HostConfig.Memory}}')
  if [ "$mem" != "0" ] && [ -n "$mem" ]; then
    echo "[PASS] Memory limit set: $((mem / 1048576))MB"
    ((pass++))
  else
    echo "[WARN] No memory limit"
    ((warn++))
  fi

  # Check 5: PID limit set
  pids=$(podman inspect "$cid" --format '{{.HostConfig.PidsLimit}}')
  if [ "$pids" != "0" ] && [ "$pids" != "-1" ] && [ -n "$pids" ]; then
    echo "[PASS] PID limit set: $pids"
    ((pass++))
  else
    echo "[WARN] No PID limit"
    ((warn++))
  fi

  # Check 6: No host network
  net=$(podman inspect "$cid" --format '{{.HostConfig.NetworkMode}}')
  if [ "$net" != "host" ]; then
    echo "[PASS] Not using host network"
    ((pass++))
  else
    echo "[FAIL] Using host network"
    ((fail++))
  fi

  # Check 7: Minimal capabilities
  caps=$(podman inspect "$cid" --format '{{.EffectiveCaps}}')
  cap_count=$(echo "$caps" | tr ' ' '\n' | grep -c '[A-Z]')
  if [ "$cap_count" -le 3 ]; then
    echo "[PASS] Minimal capabilities ($cap_count)"
    ((pass++))
  else
    echo "[WARN] $cap_count capabilities (consider reducing)"
    ((warn++))
  fi
done

echo ""
echo "========================================"
echo "Results: $pass passed, $warn warnings, $fail failures"
echo "========================================"
```

```bash
chmod +x hardening-check.sh
./hardening-check.sh
```

## Hardened Compose File

```yaml
# docker-compose.yml - Production hardened deployment
services:
  web:
    image: docker.io/library/nginx:alpine
    read_only: true
    tmpfs:
      - /tmp:size=32m,noexec,nosuid
      - /var/cache/nginx:size=64m
      - /var/run:size=8m
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges
    deploy:
      resources:
        limits:
          memory: 256m
          cpus: "1.0"
    ports:
      - "127.0.0.1:8080:80"
    networks:
      - frontend
networks:
  frontend:
    driver: bridge
```

## Cleanup

```bash
podman stop hardened-deployment hardened-db hardened-web resource-limited 2>/dev/null
podman rm hardened-deployment hardened-db hardened-web resource-limited 2>/dev/null
podman network rm backend frontend 2>/dev/null
rm -f /tmp/Containerfile.hardened hardening-check.sh
```

## Summary

Hardening Podman container deployments requires a systematic approach across every layer. Start with an updated, secure host with SELinux enforcing. Build minimal images that run as non-root users. Apply runtime restrictions including read-only filesystems, dropped capabilities, no-new-privileges, resource limits, and network isolation. Use the hardening checklist script to audit running containers regularly. Each layer adds defense in depth, and together they create a deployment that is resilient against a wide range of attacks.
