# How to Configure Container Isolation Levels in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Isolation, Namespace

Description: Learn how to configure different isolation levels for Podman containers using namespaces, cgroups, and security options.

---

> Container isolation is not binary. You can dial it from minimal separation to near-VM-level isolation depending on your security needs.

Podman offers multiple layers of isolation that can be independently configured. From Linux namespaces and cgroups to seccomp profiles and SELinux labels, each layer adds another barrier between the container and the host. This guide covers how to configure isolation levels from the least to the most restrictive.

---

## Understanding Isolation Layers

Container isolation in Podman relies on several Linux kernel features working together: PID namespaces, network namespaces, mount namespaces, user namespaces, cgroups, seccomp filters, and SELinux. Each can be configured independently.

## Default Isolation

By default, Podman provides reasonable isolation without any special flags.

```bash
# Run a container with default isolation

podman run --rm -d --name default-isolation docker.io/library/alpine:latest sleep 3600

# Inspect the default isolation settings
podman inspect default-isolation --format '
  PID Namespace: {{.HostConfig.PidMode}}
  Network Mode: {{.HostConfig.NetworkMode}}
  User Namespace: {{.HostConfig.UsernsMode}}
  IPC Mode: {{.HostConfig.IpcMode}}
  UTS Mode: {{.HostConfig.UTSMode}}
'
```

## Minimal Isolation (Host Namespaces)

Sharing host namespaces reduces isolation. Use this only for debugging or monitoring tools.

```bash
# Run with host PID namespace (can see all host processes)
podman run --rm --pid=host docker.io/library/alpine:latest ps aux | head -10

# Run with host network namespace (uses host networking)
podman run --rm --network=host docker.io/library/alpine:latest ip addr show | head -20

# Run with host IPC namespace (share IPC mechanisms)
podman run --rm --ipc=host docker.io/library/alpine:latest ipcs
```

## Standard Isolation

The recommended configuration for most workloads.

```bash
# Run with standard isolation and additional hardening
podman run --rm -d \
  --read-only \
  --tmpfs /tmp:rw,size=64m,noexec \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --security-opt no-new-privileges \
  --name standard-isolation \
  docker.io/library/nginx:alpine
```

```bash
# Verify the isolation settings
podman inspect standard-isolation --format '
  ReadOnly: {{.HostConfig.ReadonlyRootfs}}
  Privileged: {{.HostConfig.Privileged}}
  NoNewPrivileges: {{range .HostConfig.SecurityOpt}}{{.}} {{end}}
  Capabilities: {{.EffectiveCaps}}
'
```

## Enhanced Isolation with Seccomp

Seccomp profiles filter system calls available to the container.

```bash
# View the default seccomp profile Podman uses
podman info --format '{{.Host.Security.SECCOMPProfilePath}}'
```

```bash
# Create a custom seccomp profile that blocks the keyctl syscall
cat > /tmp/block-keyctl-seccomp.json << 'EOF'
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["keyctl"],
      "action": "SCMP_ACT_ERRNO"
    }
  ]
}
EOF

# Run with the custom seccomp profile
podman run --rm \
  --security-opt seccomp=/tmp/block-keyctl-seccomp.json \
  docker.io/library/alpine:latest \
  echo "Running with a custom seccomp profile"
```

## Maximum Isolation with User Namespaces

User namespaces map container root to an unprivileged host user.

```bash
# Run with user namespace remapping
podman run --rm \
  --userns=auto \
  docker.io/library/alpine:latest \
  sh -c "id && cat /proc/self/uid_map"
```

```bash
# Run rootless Podman (inherently uses user namespaces)
podman run --rm \
  docker.io/library/alpine:latest \
  sh -c "whoami && id"
```

## Combining All Isolation Layers

Apply every available isolation mechanism for maximum security.

```bash
# Maximum isolation container
podman run --rm -d \
  --read-only \
  --tmpfs /tmp:rw,size=32m,noexec,nosuid \
  --cap-drop=ALL \
  --security-opt no-new-privileges \
  --security-opt seccomp=/tmp/block-keyctl-seccomp.json \
  --userns=auto \
  --memory=256m \
  --cpus=1 \
  --pids-limit=100 \
  --name max-isolation \
  docker.io/library/alpine:latest \
  sleep 3600
```

```bash
# Verify all isolation settings
podman inspect max-isolation --format '
  ReadOnly: {{.HostConfig.ReadonlyRootfs}}
  Privileged: {{.HostConfig.Privileged}}
  Memory Limit: {{.HostConfig.Memory}}
  CPU Quota: {{.HostConfig.CpuQuota}}
  PID Limit: {{.HostConfig.PidsLimit}}
  User Namespace: {{.HostConfig.UsernsMode}}
  Capabilities: {{.EffectiveCaps}}
'
```

## Comparing Isolation Levels

```bash
#!/bin/bash
# compare-isolation.sh - Compare different isolation configurations

echo "=== Default Isolation ==="
podman run --rm docker.io/library/alpine:latest \
  sh -c "cat /proc/1/status | grep -E 'Cap|Seccomp' | head -5"

echo ""
echo "=== Minimal Capabilities ==="
podman run --rm --cap-drop=ALL docker.io/library/alpine:latest \
  sh -c "cat /proc/1/status | grep -E 'Cap|Seccomp' | head -5"

echo ""
echo "=== No New Privileges ==="
podman run --rm --security-opt no-new-privileges docker.io/library/alpine:latest \
  sh -c "cat /proc/1/status | grep -E 'NoNewPrivs|Seccomp' | head -5"
```

```bash
chmod +x compare-isolation.sh
./compare-isolation.sh
```

## Cleanup

```bash
podman stop default-isolation standard-isolation max-isolation 2>/dev/null
podman rm default-isolation standard-isolation max-isolation 2>/dev/null
rm -f /tmp/block-keyctl-seccomp.json compare-isolation.sh
```

## Summary

Podman provides a spectrum of isolation levels that can be combined to match your security requirements. For most workloads, standard isolation with dropped capabilities and no-new-privileges is sufficient. For high-security environments, add user namespace remapping, custom seccomp profiles, and resource limits. Always start with the most restrictive configuration that your application can tolerate, and relax constraints only when necessary.
