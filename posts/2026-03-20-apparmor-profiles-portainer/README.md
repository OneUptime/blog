# How to Configure AppArmor Profiles for Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, AppArmor, Linux Security, Container Hardening

Description: Create and apply AppArmor profiles to restrict container capabilities at the kernel level, controlling file access, network operations, and capability usage via Portainer.

## Introduction

AppArmor is a Linux Security Module that enforces access control policies through profiles. On AppArmor-enabled Linux hosts, Docker applies a default AppArmor profile (`docker-default`) to containers unless you override it. Custom profiles let you restrict specific containers to only the filesystem paths, network operations, and capabilities they actually need. This guide covers creating and deploying custom AppArmor profiles for containers managed by Portainer.

## Prerequisites

```bash
# Check if AppArmor is enabled

sudo aa-status
# Should show: apparmor module is loaded

# Check if Docker is using AppArmor
docker info | grep "Security Options"
# Should include: apparmor

# Install AppArmor utilities
sudo apt-get install apparmor-utils apparmor-profiles
```

## Step 1: Check the Docker Default Profile

```bash
# Docker generates docker-default in tmpfs and loads it into the kernel,
# so you usually won't find it as /etc/apparmor.d/docker-default on disk.
# If a container is using it, aa-status will list it:
sudo aa-status | grep docker-default

# Check which profile a container is using
docker inspect my_container --format '{{.AppArmorProfile}}'
# Returns: docker-default
```

## Step 2: Create a Custom AppArmor Profile

```bash
# /etc/apparmor.d/docker-nginx
# Custom AppArmor profile for Nginx containers

#include <tunables/global>

profile docker-nginx flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Allow network access
  network inet tcp,
  network inet6 tcp,
  network inet udp,
  network inet6 udp,

  # Deny raw network access (containers shouldn't need this)
  deny network raw,
  deny network packet,

  # Allow reading nginx config and static files
  /etc/nginx/** r,
  /var/www/** r,
  /usr/share/nginx/** r,

  # Allow writing to log and cache directories
  /var/log/nginx/** rw,
  /var/cache/nginx/** rw,
  /run/nginx.pid w,
  /var/run/nginx.pid w,

  # Allow nginx to start under this profile and load its libraries
  /usr/sbin/nginx ix,
  /usr/lib/** mr,
  /lib/** mr,

  # Allow proc and sys reads (needed for system info)
  @{PROC}/sys/kernel/ngroups_max r,
  @{PROC}/sys/net/core/somaxconn r,

  # Deny sensitive system paths
  deny @{PROC}/sys/kernel/sysrq w,
  deny /sys/kernel/security/** rwklx,

  # Allow nginx processes under the same profile to signal each other
  signal (send, receive) set=(kill, term, usr1) peer=docker-nginx,

  # Deny ptrace (debugging other processes)
  deny ptrace (trace),

  # Capabilities
  capability net_bind_service,  # Bind to ports < 1024
  capability setuid,            # Drop privileges
  capability setgid,
  deny capability sys_admin,
  deny capability sys_module,
  deny capability sys_ptrace,
}
```

## Step 3: Load and Verify the Profile

```bash
# Load the profile
sudo apparmor_parser -r -W /etc/apparmor.d/docker-nginx

# Verify it's loaded
sudo aa-status | grep docker-nginx
# Should list docker-nginx under the loaded profiles

# If you want to test in complain mode first, replace the profile in complain mode
sudo apparmor_parser -r -C /etc/apparmor.d/docker-nginx
# or
sudo aa-complain /etc/apparmor.d/docker-nginx

# Check violations in complain mode
sudo aa-logprof  # Interactive tool to review and allow violations
journalctl -k | grep apparmor | tail -20
```

## Step 4: Apply Profile to Containers via Portainer

```yaml
# compose.yaml - Custom AppArmor profile for a Linux Docker environment

services:
  nginx:
    image: nginx:alpine
    entrypoint: ["/usr/sbin/nginx"]
    command: ["-g", "daemon off;"]
    security_opt:
      # Apply custom profile
      - apparmor=docker-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - nginx_logs:/var/log/nginx

  api:
    image: myapp/api:latest
    security_opt:
      # Use Docker's default profile (explicit)
      - apparmor=docker-default

  # Unconfined (no AppArmor) - NOT recommended for production
  legacy_app:
    image: legacy:latest
    security_opt:
      - apparmor=unconfined

volumes:
  nginx_logs:
```

## Step 5: Profile for a Node.js Application

```bash
# /etc/apparmor.d/docker-nodejs-api
# Example for a container that starts directly with node or a simple entrypoint script

#include <tunables/global>

profile docker-nodejs-api flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Network access for HTTP server and DNS lookups
  network inet tcp,
  network inet6 tcp,
  network inet udp,
  network inet6 udp,

  # Node.js entrypoint and binary
  /bin/sh ix,
  /bin/dash ix,
  /bin/busybox ix,
  /usr/local/bin/docker-entrypoint.sh ix,
  /usr/local/bin/node ix,

  # Application files (read-only)
  /app/** r,
  /app/node_modules/** mr,

  # Allow writing to specific directories only
  /app/logs/** rw,
  /tmp/** rw,

  # Node.js needs access to these
  /proc/*/status r,
  /proc/*/maps r,

  # Deny writes to application code (immutable app)
  deny /app/*.js w,
  deny /app/package.json w,

  # Allow required libraries
  /usr/** mr,
  /lib/** mr,

  # Deny dangerous capabilities
  deny capability sys_admin,
  deny capability sys_module,
  deny capability mknod,
}
```

## Step 6: Enforce and Monitor

```bash
# Switch profile from complain to enforce mode
sudo aa-enforce /etc/apparmor.d/docker-nodejs-api

# Monitor AppArmor denials in real-time
sudo journalctl -k -f | grep "apparmor.*DENIED"

# If a container crashes after applying profile, check logs:
journalctl -k | grep apparmor | grep DENIED | tail -30
# Look for the denied operation and path, add it to profile if legitimate

# Reload profile after editing
sudo apparmor_parser -r /etc/apparmor.d/docker-nginx

# Verify container is using the profile
docker inspect nginx_container --format '{{.AppArmorProfile}}'
```

## Conclusion

AppArmor profiles complement seccomp profiles - AppArmor controls file system access and capabilities, while seccomp controls which system calls can be made. Together they provide defense-in-depth protection. Start with complain mode to discover what your container legitimately needs, review the logs, then enforce the profile in production. Docker's default profile is a good baseline, but a custom profile tailored to your specific application eliminates entire categories of potential exploit paths. On Linux Portainer deployments that use Docker Compose-compatible stacks, the `security_opt` service setting makes it simple to deploy different AppArmor profiles per service.
