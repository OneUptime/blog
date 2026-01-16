# How to Drop Linux Capabilities in Docker Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Linux, Capabilities, Hardening

Description: Learn how to drop Linux capabilities in Docker containers to reduce the attack surface, understand which capabilities are safe to remove, and implement least-privilege security.

---

Linux capabilities divide root privileges into distinct units that can be independently enabled or disabled. Docker containers run with a reduced set of capabilities by default, but further restricting them significantly improves security.

## Understanding Linux Capabilities

Traditional Unix systems have a binary privilege model: processes run as either root (all privileges) or non-root (restricted). Capabilities break root privileges into smaller, manageable pieces.

```
Traditional Model:
┌─────────────────────────────────────────┐
│              ROOT (UID 0)                │
│   - All permissions                      │
│   - All system calls                     │
│   - Full access                          │
└─────────────────────────────────────────┘

Capabilities Model:
┌─────────────┬─────────────┬─────────────┐
│ CAP_NET_BIND│ CAP_CHOWN   │ CAP_SYS_ADMIN│
│ Low ports   │ Change owner│ Many syscalls│
├─────────────┼─────────────┼─────────────┤
│ CAP_KILL    │ CAP_SETUID  │ CAP_MKNOD   │
│ Send signals│ Change UID  │ Create devs │
└─────────────┴─────────────┴─────────────┘
```

## Docker Default Capabilities

Docker containers run with these capabilities by default:

| Capability | Description |
|------------|-------------|
| CHOWN | Change file ownership |
| DAC_OVERRIDE | Bypass file permissions |
| FSETID | Set file capabilities |
| FOWNER | Bypass ownership checks |
| MKNOD | Create special files |
| NET_RAW | Use raw sockets |
| SETGID | Change group ID |
| SETUID | Change user ID |
| SETFCAP | Set file capabilities |
| SETPCAP | Modify process capabilities |
| NET_BIND_SERVICE | Bind to low ports |
| SYS_CHROOT | Use chroot() |
| KILL | Send signals |
| AUDIT_WRITE | Write to audit log |

## Dropping Capabilities

### Drop All Capabilities

```bash
# Drop all capabilities
docker run --cap-drop=ALL alpine id
```

### Drop Specific Capabilities

```bash
# Drop network-related capabilities
docker run --cap-drop=NET_RAW --cap-drop=NET_BIND_SERVICE nginx

# Drop file permission bypass
docker run --cap-drop=DAC_OVERRIDE --cap-drop=CHOWN myapp
```

### Docker Compose

```yaml
services:
  app:
    image: myapp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### Drop All and Add Only Required

```bash
# Most secure approach: start with nothing
docker run \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  nginx
```

## Common Capability Requirements

### Web Servers (Nginx, Apache)

```yaml
services:
  nginx:
    image: nginx
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Bind to port 80/443
      - CHOWN             # Change file ownership
      - SETGID            # Switch to www-data group
      - SETUID            # Switch to www-data user
```

### Applications Without Special Requirements

```yaml
services:
  app:
    image: myapp
    cap_drop:
      - ALL
    # No cap_add needed for most applications
```

### Applications Needing Raw Sockets

```yaml
services:
  network-tool:
    image: network-utils
    cap_drop:
      - ALL
    cap_add:
      - NET_RAW   # For ping, tcpdump
      - NET_ADMIN # For network configuration
```

### Database Containers

```yaml
services:
  postgres:
    image: postgres:15
    cap_drop:
      - ALL
    cap_add:
      - CHOWN    # For data directory
      - FOWNER   # File ownership operations
      - SETGID   # Switch to postgres group
      - SETUID   # Switch to postgres user
```

## Capability Reference

### Safe to Drop for Most Applications

| Capability | Why Safe to Drop |
|------------|------------------|
| AUDIT_WRITE | Most apps don't need audit logging |
| MKNOD | Creating device files is rare |
| NET_RAW | Only needed for ping, tcpdump |
| SETFCAP | Setting file capabilities is rare |
| SETPCAP | Modifying capabilities is rare |
| SYS_CHROOT | chroot is rarely needed |

### Dangerous Capabilities (Never Add)

| Capability | Risk |
|------------|------|
| SYS_ADMIN | Near-root privileges, many syscalls |
| SYS_PTRACE | Debug other processes, read memory |
| SYS_MODULE | Load kernel modules |
| DAC_READ_SEARCH | Read any file |
| NET_ADMIN | Configure networking |

### Capability Descriptions

```bash
# CAP_CHOWN: Change file ownership
# Required by: Services that need to change file ownership during startup

# CAP_DAC_OVERRIDE: Bypass file read/write permission checks
# Required by: Services accessing files regardless of ownership

# CAP_FOWNER: Bypass permission checks for file owner
# Required by: Services modifying file permissions

# CAP_KILL: Send signals to any process
# Required by: Process managers, init systems

# CAP_SETGID: Change group ID
# Required by: Services dropping privileges

# CAP_SETUID: Change user ID
# Required by: Services dropping privileges

# CAP_NET_BIND_SERVICE: Bind to ports < 1024
# Required by: Web servers on port 80/443

# CAP_NET_RAW: Use raw sockets
# Required by: ping, network diagnostic tools
```

## Verifying Capabilities

### Check Container Capabilities

```bash
# Using capsh (install libcap-ng-utils)
docker run --rm --cap-drop=ALL alpine sh -c 'apk add libcap && capsh --print'

# Using getpcaps
docker run --rm alpine sh -c 'apk add libcap && getpcaps 1'

# Using /proc
docker exec container cat /proc/1/status | grep Cap
```

### Decode Capability Bits

```bash
# Install capsh
apt-get install libcap2-bin

# Decode capability hex
capsh --decode=00000000a80425fb
```

### Test Capability Requirements

```bash
# Start container with all capabilities dropped
docker run --cap-drop=ALL myapp

# If it fails, add capabilities one at a time
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myapp
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE --cap-add=CHOWN myapp
```

## Security Profiles

### Minimal Web Application

```yaml
version: '3.8'

services:
  app:
    image: myapp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

### API Service

```yaml
services:
  api:
    image: api-service
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    user: "1000:1000"
    read_only: true
    security_opt:
      - no-new-privileges:true
```

### Complete Security Hardening

```yaml
services:
  secure-app:
    image: myapp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
      - seccomp:seccomp-profile.json
    read_only: true
    tmpfs:
      - /tmp:size=100M,mode=1777
    user: "65534:65534"  # nobody user
    networks:
      - internal
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

## Debugging Capability Issues

### Common Error Messages

```bash
# Permission denied binding to port 80
# Solution: Add NET_BIND_SERVICE
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE nginx

# Permission denied changing file ownership
# Solution: Add CHOWN
docker run --cap-drop=ALL --cap-add=CHOWN myapp

# Operation not permitted for raw socket
# Solution: Add NET_RAW
docker run --cap-drop=ALL --cap-add=NET_RAW alpine ping localhost
```

### Trace System Calls

```bash
# Use strace to identify required capabilities
docker run --cap-add=SYS_PTRACE myapp strace -f /entrypoint.sh

# Look for EPERM errors to identify missing capabilities
```

## No New Privileges Flag

Prevent processes from gaining additional privileges through setuid binaries.

```bash
# Command line
docker run --security-opt=no-new-privileges:true myapp
```

```yaml
# Docker Compose
services:
  app:
    security_opt:
      - no-new-privileges:true
```

## Production Example

```yaml
version: '3.8'

x-security: &default-security
  cap_drop:
    - ALL
  security_opt:
    - no-new-privileges:true
  read_only: true

services:
  nginx:
    image: nginx:alpine
    <<: *default-security
    cap_add:
      - NET_BIND_SERVICE
      - CHOWN
      - SETGID
      - SETUID
    tmpfs:
      - /var/cache/nginx
      - /var/run
    ports:
      - "80:80"

  api:
    image: myapi
    <<: *default-security
    tmpfs:
      - /tmp
    user: "1000:1000"

  postgres:
    image: postgres:15
    <<: *default-security
    cap_add:
      - CHOWN
      - FOWNER
      - SETGID
      - SETUID
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Summary

| Workload | Capabilities Needed |
|----------|-------------------|
| Static web server | None |
| Web server (port 80) | NET_BIND_SERVICE |
| Database | CHOWN, FOWNER, SETGID, SETUID |
| Network tools | NET_RAW, NET_ADMIN |
| Most applications | None |

Always start with `--cap-drop=ALL` and add only the capabilities your application actually needs. Combine capability restrictions with other security measures like non-root users, read-only filesystems, and seccomp profiles for defense in depth. For more on running containers as non-root, see our post on [Running Docker Containers as Non-Root Users](https://oneuptime.com/blog/post/2026-01-15-docker-non-root-user/view).

