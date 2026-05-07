# How to Prevent Container Escape with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Container Escape, Hardening

Description: Learn how to configure Podman to prevent container escape attacks and keep your host system secure.

---

> Many container escape exploits rely on some form of excessive privilege. Remove unnecessary privileges, and you close many escape routes.

Container escape is the most severe container security threat. It occurs when a process inside a container breaks out of its isolation boundaries and gains access to the host system. Podman's rootless architecture and extensive security options make it one of the most escape-resistant container runtimes available. This guide covers the key configurations to prevent container escape.

---

## Common Container Escape Vectors

Container escapes typically exploit one or more of these vectors: privileged mode, dangerous capabilities, writable host mounts, host namespace sharing, kernel vulnerabilities, or misconfigured security profiles. Understanding these vectors is the first step to preventing them.

## Never Run Privileged Containers

Privileged mode disables almost all container isolation. It is the easiest path to escape.

```bash
# DANGEROUS: This container has full host access

# podman run --privileged docker.io/library/alpine:latest  # DO NOT DO THIS IN PRODUCTION

# Instead, grant only the specific capability needed
podman run --rm \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  docker.io/library/alpine:latest \
  echo "Running with minimal privileges"
```

```bash
# Audit for any privileged containers
podman ps -q | while read cid; do
  priv=$(podman inspect "$cid" --format '{{.HostConfig.Privileged}}')
  name=$(podman inspect "$cid" --format '{{.Name}}')
  if [ "$priv" = "true" ]; then
    echo "CRITICAL: $name is privileged - potential escape risk"
  fi
done
```

## Drop All Unnecessary Capabilities

Capabilities like SYS_ADMIN, SYS_PTRACE, and DAC_READ_SEARCH have been used in escape exploits.

```bash
# Run with only essential capabilities
podman run --rm -d \
  --cap-drop=ALL \
  --cap-add=CHOWN \
  --cap-add=SETGID \
  --cap-add=SETUID \
  --cap-add=NET_BIND_SERVICE \
  --name escape-proof \
  docker.io/library/nginx:alpine

# Verify the restricted capability set
podman inspect escape-proof --format '{{.EffectiveCaps}}'
```

## Enable no-new-privileges

This flag prevents processes from gaining additional privileges through setuid binaries or capability inheritance.

```bash
# Run with no-new-privileges
podman run --rm \
  --security-opt no-new-privileges \
  docker.io/library/alpine:latest \
  sh -c "grep NoNewPrivs /proc/1/status"
# Expected output: NoNewPrivs: 1
```

```bash
# Demonstrate that setuid programs are neutered
podman run --rm \
  --security-opt no-new-privileges \
  docker.io/library/alpine:latest \
  sh -c "
    # Even if a setuid binary exists, it cannot gain privileges
    ls -la /bin/su
    su root -c 'whoami' 2>&1 || echo 'Privilege escalation blocked'
  "
```

## Use Read-Only Root Filesystem

Prevent attackers from writing tools or exploits to the filesystem.

```bash
# Read-only root with minimal writable tmpfs
podman run --rm -d \
  --read-only \
  --tmpfs /tmp:rw,size=32m,noexec,nosuid \
  --tmpfs /var/run:rw,size=8m,noexec,nosuid \
  --name readonly-escape-proof \
  docker.io/library/alpine:latest \
  sleep 3600

# Verify write attempts fail
podman exec readonly-escape-proof sh -c "touch /usr/bin/exploit 2>&1 || echo 'Write blocked'"
```

## Isolate with User Namespaces

User namespaces ensure root inside the container is unprivileged on the host.

```bash
# Run with user namespace remapping
podman run --rm \
  --userns=auto \
  docker.io/library/alpine:latest \
  sh -c "
    echo 'Container root UID mapping:'
    cat /proc/self/uid_map
    echo 'Even as root inside, we are unprivileged outside'
  "
```

## Restrict Dangerous Host Mounts

Never mount sensitive host paths into containers.

```bash
# DANGEROUS mounts to avoid:
# -v /:/host        # Full host filesystem
# -v /etc:/etc      # Host configuration
# -v /var/run/docker.sock  # Container runtime socket
# -v /proc:/host/proc  # Host proc filesystem
# -v /sys:/host/sys    # Host sys filesystem

# Instead, mount only the specific directory needed
mkdir -p /tmp/app-data
podman run --rm \
  -v /tmp/app-data:/data:Z,ro \
  docker.io/library/alpine:latest \
  ls /data
```

## Apply Seccomp Profiles

Block system calls that are commonly used in escape exploits.

```bash
# Create a small demo seccomp profile that blocks dangerous syscalls.
# For production, start from Podman's default seccomp profile and
# tighten it for your workload instead of replacing it with a short denylist.
cat > /tmp/anti-escape-seccomp.json << 'EOF'
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "syscalls": [
    {
      "names": [
        "mount", "umount2", "ptrace", "kexec_load",
        "open_by_handle_at", "init_module", "finit_module",
        "delete_module", "iopl", "ioperm", "swapon",
        "swapoff", "reboot", "settimeofday", "sethostname",
        "setdomainname", "pivot_root", "keyctl",
        "request_key", "add_key", "unshare",
        "userfaultfd", "perf_event_open", "bpf"
      ],
      "action": "SCMP_ACT_ERRNO"
    }
  ]
}
EOF

# Run with the demo seccomp profile
podman run --rm \
  --security-opt seccomp=/tmp/anti-escape-seccomp.json \
  docker.io/library/alpine:latest \
  sh -c "
    # Attempt a mount (should be blocked)
    mount -t tmpfs tmpfs /mnt 2>&1 || echo 'mount blocked by seccomp'
  "
```

## Prevent Namespace Sharing

Do not share host namespaces unless absolutely necessary.

```bash
# Verify a container is NOT sharing host namespaces
podman run --rm -d --name ns-isolated docker.io/library/alpine:latest sleep 3600

podman inspect ns-isolated --format '
  PID Mode: {{.HostConfig.PidMode}}
  Network Mode: {{.HostConfig.NetworkMode}}
  IPC Mode: {{.HostConfig.IpcMode}}
  UTS Mode: {{.HostConfig.UTSMode}}
'
# All should show container-specific or empty (not "host")
```

## Full Anti-Escape Configuration

Combine all protections for maximum resistance to container escape.

```bash
# Launch a container with all anti-escape measures
podman run --rm -d \
  --read-only \
  --tmpfs /tmp:rw,size=32m,noexec,nosuid \
  --cap-drop=ALL \
  --security-opt no-new-privileges \
  --userns=auto \
  --memory=512m \
  --pids-limit=100 \
  --name fortress \
  docker.io/library/alpine:latest \
  sleep 3600

echo "Fortress container is running with maximum escape prevention"
podman inspect fortress --format '{{.EffectiveCaps}}'
```

## Cleanup

```bash
podman stop escape-proof readonly-escape-proof ns-isolated fortress 2>/dev/null
podman rm escape-proof readonly-escape-proof ns-isolated fortress 2>/dev/null
rm -f /tmp/anti-escape-seccomp.json
```

## Summary

Preventing container escape requires a layered approach. Never use privileged mode, drop all unnecessary capabilities, enable no-new-privileges, use read-only filesystems, leverage user namespaces, restrict host mounts, apply seccomp filters, and avoid sharing host namespaces. Podman's rootless mode provides a strong baseline, and these additional configurations make container escape much harder. Apply all these measures together for defense in depth.
