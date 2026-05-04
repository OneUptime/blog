# How to Configure Container Isolation in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Container Isolation, Network Segmentation, Namespace Isolation

Description: Configure network, process, and filesystem isolation for Docker containers to prevent lateral movement between services in your Portainer environment.

## Introduction

Container isolation prevents a compromised container from affecting other containers, the host, or sensitive data. Docker uses Linux namespaces for isolation by default, but the defaults leave several communication paths open: shared default bridge network, host filesystem mounts, and inter-container process visibility. This guide covers hardening isolation across all dimensions - network, process, filesystem, and IPC - in Portainer-managed deployments.

## Step 1: Network Isolation with Internal Networks

```yaml
# docker-compose.yml - Network isolation by tier

version: "3.8"

networks:
  # Public-facing network (internet access)
  dmz:
    driver: bridge

  # Application tier (no internet)
  app_tier:
    driver: bridge
    internal: false  # Has internet via NAT

  # Database tier (completely isolated from internet)
  db_tier:
    driver: bridge
    internal: true  # Blocks all external traffic

services:
  nginx:
    image: nginx:alpine
    networks:
      - dmz
    # nginx only talks to internet and api

  api:
    image: myapp/api:latest
    networks:
      - dmz       # Receive requests from nginx
      - app_tier  # Talk to other app services
      - db_tier   # Access databases
    # api bridges all tiers

  database:
    image: postgres:15-alpine
    networks:
      - db_tier   # ONLY accessible from db_tier
    # database cannot initiate outbound connections
    # cannot reach internet even if compromised
```

## Step 2: IPC Namespace Isolation

```yaml
# Prevent containers from sharing IPC namespace
version: "3.8"

services:
  api:
    image: myapp/api:latest
    ipc: private  # Default: private IPC namespace (recommended)
    # Alternative: ipc: shareable - allow specific containers to share

  # Disable shared memory between containers
  worker:
    image: myapp/worker:latest
    ipc: private  # Cannot access api's shared memory segments
    shm_size: 64m  # Limit /dev/shm size
```

## Step 3: PID Namespace Isolation

```yaml
version: "3.8"

services:
  api:
    image: myapp/api:latest
    # PID namespace is private by default - the container cannot see
    # host processes unless you opt in. Only "host" or "container:<id>"
    # are accepted as explicit values.

  # Dangerous: don't do this in production
  # debug_container:
  #   pid: "host"  # Shares host PID namespace - very dangerous
```

## Step 4: Restrict Container Capabilities and Syscalls

```yaml
version: "3.8"

services:
  api:
    image: myapp/api:latest

    # Run as non-root user
    user: "1000:1000"

    # Read-only root filesystem
    read_only: true

    # Drop all capabilities
    cap_drop:
      - ALL

    # Only add back what's needed
    cap_add:
      - NET_BIND_SERVICE  # Only if binding port < 1024

    # Prevent privilege escalation
    security_opt:
      - no-new-privileges:true  # Cannot escalate via setuid
      - seccomp:/etc/docker/seccomp/api-profile.json

    # tmpfs for writable directories
    tmpfs:
      - /tmp:size=50m
      - /var/run:size=5m
```

## Step 5: Restrict Host Filesystem Access

```yaml
version: "3.8"

services:
  api:
    image: myapp/api:latest
    volumes:
      # Mount only required directories
      - app_data:/app/data           # Named volume (isolated)
      - ./config/api.yml:/app/config/api.yml:ro  # Read-only config

      # AVOID mounting:
      # - /etc:/etc  (host etc)
      # - /var/run/docker.sock  (docker daemon access)
      # - /:/host  (entire host filesystem)
      # - /proc:/host-proc  (host process info)

  # If Docker socket IS needed (e.g., Watchtower)
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      # Limit access with read-only socket
      - /var/run/docker.sock:/var/run/docker.sock:ro
    # Note: even read-only socket access is a risk

volumes:
  app_data:
```

## Step 6: Container Resource Limits

Resource limits prevent one container from consuming all host resources (DoS):

```yaml
version: "3.8"

services:
  api:
    image: myapp/api:latest
    deploy:
      resources:
        limits:
          cpus: "0.5"        # Max 50% of one CPU
          memory: 512M       # Max 512MB RAM
        reservations:
          cpus: "0.1"        # Guaranteed 10% CPU
          memory: 128M       # Guaranteed 128MB RAM

    # For non-swarm deployments:
    mem_limit: 512m
    memswap_limit: 512m     # Disable swap (same as mem_limit)
    cpu_quota: 50000        # 50% of one CPU (100000 = 1 CPU)
    pids_limit: 100         # Maximum 100 processes/threads
    ulimits:
      nproc: 100            # Per-user process limit (RLIMIT_NPROC)
      nofile:
        soft: 1024
        hard: 2048          # File descriptor limits
```

## Step 7: Audit Isolation Settings

```bash
# Check isolation settings for all running containers
docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  user=$(docker inspect "$id" --format '{{.Config.User}}')
  privs=$(docker inspect "$id" --format '{{.HostConfig.Privileged}}')
  readonly=$(docker inspect "$id" --format '{{.HostConfig.ReadonlyRootfs}}')
  ipc=$(docker inspect "$id" --format '{{.HostConfig.IpcMode}}')
  echo "$name | user:$user | privileged:$privs | readonly:$readonly | ipc:$ipc"
done

# Flag privileged containers (highest risk)
docker ps -q | while read id; do
  if docker inspect "$id" --format '{{.HostConfig.Privileged}}' | grep -q "true"; then
    name=$(docker inspect "$id" --format '{{.Name}}')
    echo "WARNING: $name is running privileged!"
  fi
done
```

## Conclusion

Container isolation is layered - network isolation prevents lateral movement, capability dropping limits what a compromised process can do, and resource limits prevent denial of service. No single control is sufficient; the combination creates defense-in-depth. Start with `internal: true` networks for databases, `no-new-privileges: true` for all services, and `cap_drop: [ALL]` with explicit additions. Portainer's container inspection and stack YAML editor make it easy to review and enforce isolation policies across your entire environment.
