# How to Configure Container Isolation in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Container Isolation, Security, Docker, Network Isolation, Namespace

Description: Learn how to configure container isolation in Portainer using network segmentation, user namespaces, PID isolation, and IPC isolation to prevent containers from affecting each other.

---

Container isolation ensures that a compromised or misbehaving container cannot access data or affect the behavior of other containers. Docker provides several isolation mechanisms that Portainer can apply through stack configuration and container settings, while daemon-level options such as user namespace remapping are configured on the Docker host.

## Network Isolation

The primary isolation boundary for containers is the network. Containers on different networks cannot communicate by default:

```yaml
services:
  frontend:
    image: nginx:alpine
    networks:
      - public      # Internet-facing

  api:
    image: my-api:latest
    networks:
      - public      # Receives traffic from frontend
      - private     # Can reach database

  database:
    image: postgres:15
    networks:
      - private     # Completely isolated from internet and frontend

  redis:
    image: redis:7-alpine
    networks:
      - private     # Only reachable from api

networks:
  public:
    driver: bridge
  private:
    driver: bridge
    internal: true   # Externally isolated network
```

## User Namespace Remapping

User namespace remapping prevents containers from running as root on the host, even if they run as root inside the container:

Enable it in `/etc/docker/daemon.json`:

```json
{
  "userns-remap": "default"
}
```

This maps container UID 0 (root) to an unprivileged user on the host. Restart Docker after changing this setting.

Verify remapping is active:

```bash
id dockremap
grep dockremap /etc/subuid /etc/subgid
# Should show the dockremap user and subordinate UID/GID ranges

```

## PID Namespace Isolation

By default, containers have their own PID namespace. Verify a container cannot see host processes:

```bash
docker exec -it $(docker ps -qf name=api) ps aux
# Should only show processes inside the container
```

To prevent containers from seeing each other's processes, ensure they don't share the PID namespace (never use `pid: host` unless specifically required):

```yaml
services:
  api:
    # Do NOT use: pid: "host"  - this shares the host's PID namespace
    image: my-api:latest
```

## IPC Namespace Isolation

Prevent containers from communicating via shared memory by keeping IPC namespaces separate:

```yaml
services:
  api:
    image: my-api:latest
    ipc: private   # Explicit private IPC namespace
    # Avoid shared IPC namespaces unless required
```

## Seccomp + Capabilities Combination

Apply the full isolation stack:

```yaml
services:
  api:
    image: my-api:latest
    user: "1000:1000"              # Non-root user
    cap_drop:
      - ALL                        # Drop all capabilities
    cap_add:
      - NET_BIND_SERVICE           # Add back only what's needed
    read_only: true                # Read-only filesystem
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true     # Prevent privilege escalation
      - seccomp:/etc/docker/seccomp/api.json
    networks:
      - private
```

## Container Resource Isolation

Prevent one container from starving others by setting resource limits:

```yaml
services:
  api:
    image: my-api:latest
    deploy:
      resources:
        limits:
          cpus: "0.5"      # Max 50% of one CPU core
          memory: 256M     # Max 256 MB RAM
        reservations:
          cpus: "0.1"
          memory: 64M
```

Or for non-Swarm:

```yaml
services:
  api:
    mem_limit: 256m
    memswap_limit: 256m    # Disable swap
    cpus: "0.5"
    cpu_shares: 512
```

## Verifying Isolation

Test that containers cannot reach each other across isolated networks:

```bash
# From frontend, try to reach database directly (should fail)
docker exec -it $(docker ps -qf name=frontend) nc -zv database 5432
# Expected: Name resolution fails because frontend is not on the private network

# From api, verify it can reach the database on the private network
docker exec -it $(docker ps -qf name=api) nc -zv database 5432
# Expected: Connection succeeded
```

## Container Isolation Checklist

- [ ] Separate networks per stack; `internal: true` for database networks
- [ ] No containers running with `--privileged`
- [ ] No `pid: host`, `ipc: host`, or `network: host` unless required
- [ ] All containers run as non-root users
- [ ] `no-new-privileges: true` set on all services
- [ ] Resource limits applied to prevent noisy-neighbor issues
- [ ] User namespace remapping enabled at daemon level
