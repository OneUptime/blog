# How to Configure Linux Capabilities for Containers in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Security, Linux

Description: Learn how to add and drop Linux capabilities for Docker containers in Portainer to implement least-privilege security without using privileged mode.

## Introduction

Linux capabilities break root's monolithic privilege into fine-grained units. Instead of running a container with full root privileges (`--privileged`), you can grant only the specific capabilities needed. Portainer lets you configure which capabilities to add or drop for each container, enabling a proper least-privilege security posture.

## Prerequisites

- Portainer installed with a connected Docker environment
- Basic understanding of Linux capabilities

## Default Docker Container Capabilities

By default, Docker grants containers a subset of Linux capabilities:

```text
# Default capabilities granted by Docker:

CAP_AUDIT_WRITE        - Write audit log
CAP_CHOWN              - Arbitrary file ownership changes
CAP_DAC_OVERRIDE       - Bypass file read/write/execute permission checks
CAP_FOWNER             - Bypass permission checks on file operations
CAP_FSETID             - Set UID/GID for file operations
CAP_KILL               - Send signals to any process
CAP_MKNOD              - Create special files
CAP_NET_BIND_SERVICE   - Bind to ports below 1024
CAP_NET_RAW            - Use RAW and PACKET sockets
CAP_SETFCAP            - Set file capabilities
CAP_SETGID             - Set GID for processes
CAP_SETPCAP            - Modify process capabilities
CAP_SETUID             - Set UID for processes
CAP_SYS_CHROOT         - Use chroot()
```

## Step 1: Configure Capabilities in Portainer

1. Navigate to **Containers > Add container**.
2. Scroll to the **Runtime & Resources** section.
3. Find the **Capabilities** section.
4. Choose capabilities to **add** or **drop**.

## Step 2: Drop All Capabilities (Hardest Security)

The most secure approach: drop all capabilities and add back only what's needed.

```yaml
# docker-compose.yml
services:
  minimal-app:
    image: myorg/myapp:latest
    # Drop all default capabilities
    cap_drop:
      - ALL
    # Add back only what the app needs
    cap_add:
      - NET_BIND_SERVICE   # Allow binding to port 80/443
    restart: unless-stopped
    # Also set non-root user for defense in depth
    user: "1000:1000"
    security_opt:
      - no-new-privileges:true
```

## Step 3: Common Capability Use Cases

### Web Server Binding to Port 80

On systems where privileged ports still start at 1024, non-root users can only bind to ports > 1024:

```yaml
services:
  nginx:
    image: nginx:alpine
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE   # Add when binding to port 80 requires this capability
    ports:
      - "80:80"
    user: "101"   # Run as nginx user
```

Alternatively, use a higher port and put a reverse proxy in front.

### Network Configuration Tool

```yaml
services:
  network-manager:
    image: myorg/net-manager:latest
    cap_drop:
      - ALL
    cap_add:
      - NET_ADMIN     # Configure network interfaces
      - NET_RAW       # Use raw sockets (ping, tcpdump)
      - SYS_PTRACE    # Debug network processes
```

### File System Operations

```yaml
services:
  backup-agent:
    image: myorg/backup:latest
    cap_drop:
      - ALL
    cap_add:
      - DAC_READ_SEARCH  # Read files regardless of permissions
```

### System Clock/Time Management

```yaml
services:
  ntp-client:
    image: myorg/ntp:latest
    cap_drop:
      - ALL
    cap_add:
      - SYS_TIME   # Set system clock
```

### Ping (ICMP) Tool

```yaml
services:
  monitoring:
    image: alpine:latest
    cap_drop:
      - ALL
    cap_add:
      - NET_RAW   # Needed when ping uses raw sockets
    command: ["ping", "-c", "4", "google.com"]
```

## Step 4: Reference of Useful Capabilities

| Capability | What it allows | Common use case |
|-----------|---------------|-----------------|
| `NET_ADMIN` | Network configuration | VPN clients, firewalls, network monitors |
| `NET_BIND_SERVICE` | Bind to ports < 1024 | Web servers on port 80/443 |
| `NET_RAW` | Raw/packet sockets | Ping, tcpdump, network diagnostics |
| `SYS_ADMIN` | System administration | FUSE mounts, namespaces |
| `SYS_PTRACE` | Process tracing | Debuggers, profilers |
| `SYS_TIME` | Set system time | NTP clients |
| `SYS_MODULE` | Load kernel modules | Driver containers |
| `DAC_OVERRIDE` | Bypass file permissions | Root-like file access |
| `DAC_READ_SEARCH` | Read any file | Backup agents |
| `CHOWN` | Change file ownership | Setup scripts |
| `SETUID`/`SETGID` | Change process UID/GID | su, sudo, setuid executables |
| `AUDIT_WRITE` | Write to audit log | Security agents |
| `MKNOD` | Create device files | Required for some init systems |

## Step 5: Verify Capabilities Inside Container

```bash
# In the container console (via Portainer Exec):

# Check current process capabilities:
cat /proc/1/status | grep Cap

# Decode capability bitmask:
capsh --decode=00000000a80425fb

# Or install capsh and use:
capsh --print
# Output shows current, bounded, and ambient capabilities
```

## Step 6: Using seccomp and AppArmor Together

Capabilities work best in combination with other security profiles:

```yaml
services:
  secure-app:
    image: myapp:latest
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true    # Prevent privilege escalation
      - seccomp:custom-profile.json  # Restrict system calls
      - apparmor:docker-default   # Apply an AppArmor profile
    read_only: true               # Read-only container filesystem
    tmpfs:
      - /tmp
      - /run
```

## Conclusion

Linux capabilities in Portainer provide a powerful way to implement least-privilege security for containers without resorting to full `--privileged` mode. By dropping all default capabilities and adding back only what your application needs, you significantly reduce the blast radius of container security incidents. Combine capability configuration with non-root users, `no-new-privileges`, seccomp profiles, and AppArmor policies for defense-in-depth security.
