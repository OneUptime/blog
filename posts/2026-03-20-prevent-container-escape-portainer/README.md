# How to Prevent Container Escape Attacks with Portainer Settings (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Container Escape, Privilege Escalation, Hardening

Description: Harden Docker containers against escape attacks by disabling privileged mode, restricting mounts, enabling seccomp, and applying the no-new-privileges flag via Portainer.

## Introduction

Container escape attacks allow a process inside a container to break out to the host system, potentially gaining elevated access to host resources. Common vectors include privileged container abuse, dangerous mounts (like `/var/run/docker.sock`), kernel exploit paths via dangerous syscalls, and setuid binary escalation. This guide covers specific configurations in Portainer that close the most common escape paths.

## Step 1: Never Use Privileged Mode

Privileged containers give a container nearly all the same access to the host as processes running outside containers on the host:

```yaml
services:
  api:
    image: myapp/api:latest

    # DANGEROUS - do not enable unless absolutely required
    # privileged: true

    # Prefer narrower alternatives instead:
    # cap_add:
    #   - NET_ADMIN
    # devices:
    #   - /dev/ttyUSB0:/dev/ttyUSB0
```

```bash
# Audit for privileged containers
docker ps -q | xargs -r docker inspect --format \
  '{{.Name}}: privileged={{.HostConfig.Privileged}}' | grep 'privileged=true$'
# Any output here is a security concern
```

## Step 2: Block Privilege Escalation

```yaml
# compose.yaml - Prevent setuid/setgid escalation
services:
  api:
    image: myapp/api:latest

    # Prevent gaining new privileges via setuid binaries
    security_opt:
      - no-new-privileges:true

    # Run as non-root user
    user: "1000:1000"

    # Explicitly drop capabilities (belt and suspenders)
    cap_drop:
      - ALL

    # Even if attacker finds a setuid binary inside the container,
    # no-new-privileges prevents it from elevating privileges
```

## Step 3: Secure or Avoid Docker Socket Mounts

Mounting the Docker socket inside a container gives that container control over the Docker daemon:

```yaml
services:
  app:
    image: myapp/api:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Avoid this

  docker_api_client:
    image: myapp/docker-api-client:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    # Read-only socket mounts can reduce risk for tools that support them.
    # Portainer Agent and Edge Agent deployments officially mount the socket
    # read-write, so treat them as highly privileged infrastructure components.

# Alternatives to Docker socket mounting:
# 1. Use Docker TCP API with TLS authentication
# 2. Use docker-proxy tools that restrict API access
# 3. Use Podman's rootless daemon socket
```

For Portainer specifically, direct Docker socket connections are a legacy option; Portainer recommends Edge Agent for most use cases.

## Step 4: Restrict Host Filesystem Mounts

```yaml
services:
  api:
    image: myapp/api:latest
    volumes:
      # SAFE: named volumes (isolated from host)
      - app_data:/app/data

      # SAFE: specific config file (read-only)
      - ./config.yml:/app/config.yml:ro

      # DANGEROUS: host path mounts (especially these):
      # - /etc:/etc              (host config)
      # - /proc:/host-proc       (kernel info)
      # - /sys:/sys              (kernel interface)
      # - /dev:/dev              (all devices)
      # - /boot:/boot            (kernel/bootloader)
      # - /var/lib/docker:/docker (container storage)

volumes:
  app_data:
```

## Step 5: Seccomp to Block Kernel Exploit Vectors

Docker already applies its default seccomp profile unless you disable or override it. Keep that default profile enabled: Docker documents it as an allowlist that blocks dozens of significant syscalls, and does not recommend changing it unless you have a tested reason to do so.

```yaml
services:
  api:
    security_opt:
      - no-new-privileges:true

      # DANGEROUS - disables seccomp entirely
      # - seccomp:unconfined

      # If you maintain a tested custom profile on the Docker host, use:
      # - seccomp:/etc/docker/seccomp/my-profile.json
```

## Step 6: User Namespace Remapping

User namespace remapping maps root inside the container to an unprivileged subordinate UID/GID range on the host. This reduces the blast radius of a breakout, but the Docker daemon itself still runs as root:

```json
{
  "userns-remap": "default"
}
```

```bash
# Apply daemon change
sudo systemctl restart docker

# Now root (UID 0) inside the container maps to a high subordinate UID/GID on the host

# Verify
docker run -d --name userns-test alpine sleep 300
docker exec userns-test id
# Inside container: uid=0(root) gid=0(root)

ps -o uid=,gid=,pid=,comm= -p "$(docker inspect -f '{{.State.Pid}}' userns-test)"
# Shows a high subordinate UID/GID from /etc/subuid and /etc/subgid on the host

docker rm -f userns-test
```

## Step 7: Runtime Security with Falco

```yaml
# compose.yaml - Falco runtime threat detection
services:
  falco:
    image: falcosecurity/falco:latest
    container_name: falco
    restart: unless-stopped
    cap_drop:
      - ALL
    cap_add:
      - SYS_ADMIN
      - SYS_RESOURCE
      - SYS_PTRACE
    volumes:
      - /sys/kernel/tracing:/sys/kernel/tracing:ro
      - /var/run/docker.sock:/host/var/run/docker.sock
      - /proc:/host/proc:ro
      - /etc:/host/etc:ro
    # On AppArmor-enabled hosts such as Ubuntu, also add:
    # security_opt:
    #   - apparmor:unconfined
    # On some systems, tracefs is /sys/kernel/debug/tracing instead.
    # Falco detects container escapes in real-time:
    # - Shell spawned in container
    # - Sensitive file reads (/etc/shadow, /etc/passwd)
    # - Unexpected outbound connections
    # - Privilege escalation attempts
```

## Conclusion

Container escape prevention is achieved through defense-in-depth: no privileged mode, no dangerous mounts, capability dropping, `no-new-privileges`, seccomp filtering, and optionally user namespace remapping. Each layer independently blocks different attack vectors. Regular audits using `docker inspect` to check for privileged mode and socket mounts are essential - these settings can drift as teams add new services. Portainer's stack YAML is the authoritative source of truth; reviewing it in code reviews catches security regressions before deployment.
