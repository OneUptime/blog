# How to Drop Unnecessary Linux Capabilities in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Linux Capabilities, Container Security, Docker Hardening, Security

Description: Learn how to drop Linux capabilities from containers in Portainer to follow the principle of least privilege and reduce the container attack surface.

---

Linux capabilities divide root privileges into fine-grained units. Docker containers start with a limited set of capabilities by default. Dropping even more capabilities reduces the damage a compromised container can cause.

## Default Container Capabilities

Docker grants these capabilities by default:

| Capability | Purpose |
|------------|---------|
| `CHOWN` | Change file ownership |
| `DAC_OVERRIDE` | Bypass file permission checks |
| `FSETID` | Set SUID/SGID bits |
| `FOWNER` | Override file permission checks |
| `MKNOD` | Create device files |
| `NET_RAW` | Use raw and packet sockets |
| `SETGID` | Manipulate group IDs |
| `SETUID` | Manipulate user IDs |
| `SETFCAP` | Set file capabilities |
| `SETPCAP` | Manage process capabilities |
| `NET_BIND_SERVICE` | Bind to ports below 1024 |
| `SYS_CHROOT` | Use chroot |
| `KILL` | Send signals to processes |
| `AUDIT_WRITE` | Write to audit log |

## Dropping All Capabilities and Adding Back Only What's Needed

The most secure approach: drop everything, then explicitly add back what's required.

```yaml
services:
  api:
    image: my-api:latest
    user: "1000:1000"         # Run as non-root
    cap_drop:
      - ALL                   # Drop all default capabilities
    cap_add:
      - NET_BIND_SERVICE      # Only if binding to port < 1024
    read_only: true
    tmpfs:
      - /tmp
```

## Capabilities Reference by Use Case

Treat these as starting points, not guarantees. Images and startup scripts vary, so verify against the image documentation and test the workload.

| Application Type | Safe to Drop | May Need to Keep |
|------------------|--------------|-----------------|
| Web API (port 3000+) | ALL | None needed |
| Web server (port 80) | ALL except `NET_BIND_SERVICE` | `NET_BIND_SERVICE` |
| Monitoring agent | ALL | `SYS_PTRACE` (for some agents) |
| Database | `NET_RAW`, `MKNOD`, `AUDIT_WRITE` | `CHOWN` (for some init scripts) |
| Network tool | `MKNOD`, `SYS_CHROOT` | `NET_RAW`, `NET_ADMIN` |

## Dropping Specific High-Risk Capabilities

If you don't want to drop all, at minimum drop `NET_RAW`, and avoid granting these additional high-risk capabilities unless the workload explicitly requires them. If any were added, explicitly drop them:

```yaml
services:
  api:
    cap_drop:
      - NET_RAW        # Prevents raw socket access (used in ARP poisoning, ICMP flood)
      - NET_ADMIN      # Prevents network configuration changes
      - SYS_ADMIN      # Prevents many administrative operations (very broad)
      - SYS_PTRACE     # Prevents debugging other processes
      - SYS_MODULE     # Prevents loading kernel modules
      - DAC_READ_SEARCH  # Prevents bypassing file-read and directory-search permission checks
```

## Configuring via Portainer UI

For standalone containers:

1. Go to **Containers > Add container**.
2. Expand **Advanced container settings**.
3. Open the **Capabilities** section.
4. Use the capability controls to allow or drop individual capabilities.

## Verifying Dropped Capabilities

Check the effective capabilities of a running container:

```bash
# View capabilities from inside the container
docker exec $(docker ps -q --filter name=api) cat /proc/1/status | grep '^Cap'

# Decode the hex value from CapEff
capsh --decode=<hex-value>

# If getpcaps is installed in the container
docker exec $(docker ps -q --filter name=api) getpcaps 1
```

## Testing Capability Restrictions

Verify that dropped capabilities prevent the expected operations:

```bash
# If the image includes ping, it often fails when NET_RAW is dropped,
# but it is not a universal NET_RAW test on every distro/kernel combination.
docker exec $(docker ps -q --filter name=api) ping -c 1 8.8.8.8

# If the image includes mount, SYS_ADMIN being dropped should prevent mounting
docker exec $(docker ps -q --filter name=api) mkdir -p /tmp/test
docker exec $(docker ps -q --filter name=api) mount -t tmpfs none /tmp/test
# Should return: Operation not permitted
```

## Combining with No New Privileges

Prevent privilege escalation via SUID/SGID binaries and file capabilities:

```yaml
services:
  api:
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true   # Prevents privilege escalation via SUID/SGID binaries and file capabilities
    user: "1000:1000"
```
