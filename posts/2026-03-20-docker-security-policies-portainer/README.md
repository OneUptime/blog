# How to Set Up Docker Security Policies in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Docker, Policies, Container Security

Description: Learn how to configure comprehensive Docker security policies in Portainer to enforce a secure baseline for all container deployments.

## Overview of Docker Security Policies in Portainer

Portainer's environment security settings let administrators define a security baseline that non-admin users cannot override. Portainer API access is scoped to the user's permissions, so requests made through Portainer are subject to the same restrictions.

## Accessing Security Settings

1. Go to **Environments** in Portainer.
2. Select your Docker environment.
3. Open the **Host** or **Swarm** page for that environment.
4. Click the **Setup** tab.
5. Scroll to the **Docker Security Settings** section.

## Recommended Security Policy Configuration

### Disable Privileged Containers

Privileged containers have full access to the host kernel. Disable for all non-admin users:

```bash
# What a privileged container can do (and why it's dangerous)

docker run --privileged ubuntu \
  mount /dev/sda1 /mnt  # Mount host disk
```

Toggle: **Disable privileged mode for non-administrators** → **ON**

### Disable Host PID Namespace Access

Prevent non-admin users from running containers in the host PID namespace:

Toggle: **Disable the use of host PID 1 for non-administrators** → **ON**

### Disable Bind Mounts

Prevent host filesystem exposure via bind mounts.

Toggle: **Disable bind mounts for non-administrators** → **ON**

### Restrict Docker Socket Access

Never allow mounting `/var/run/docker.sock` in containers - it provides Docker daemon control:

```bash
# This is effectively root on the host - should never be allowed
docker run -v /var/run/docker.sock:/var/run/docker.sock ubuntu
```

## Applying Linux Capabilities Restrictions

Use Docker's default seccomp profile and capability restrictions for additional hardening:

```yaml
# docker-compose.yml with restricted capabilities
services:
  app:
    image: my-app:latest
    # Docker applies the default seccomp profile unless you override it
    security_opt:
      - no-new-privileges:true     # Prevent privilege escalation
    cap_drop:
      - ALL                        # Drop ALL capabilities
    cap_add:
      - NET_BIND_SERVICE           # Only add what's needed
    read_only: true                # Read-only root filesystem
    tmpfs:
      - /tmp                       # Writable tmp in memory
```

## Per-User Policy Exceptions

For trusted power users who legitimately need elevated capabilities, grant them administrator access to that environment or create specific service accounts.

## Auditing Policy Compliance

```bash
# Check for containers running with privileged mode
docker inspect $(docker ps -q) | \
  jq '[.[] | select(.HostConfig.Privileged == true) | {name: .Name, privileged: .HostConfig.Privileged}]'

# Check for host network mode containers
docker inspect $(docker ps -q) | \
  jq '[.[] | select(.HostConfig.NetworkMode == "host") | .Name]'

# Check for bind mounts
docker inspect $(docker ps -q) | \
  jq '[.[] | {name: .Name, binds: [.Mounts[]? | select(.Type == "bind") | {source: .Source, destination: .Destination, rw: .RW}]} | select(.binds | length > 0)]'
```

## Conclusion

Docker security policies in Portainer provide a centrally managed, enforceable security baseline for container deployments managed through Portainer. Implement these settings on day one and audit regularly to catch any containers that were deployed before policies were enabled.
