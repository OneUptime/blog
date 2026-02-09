# How to configure seccomp profiles for syscall filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Seccomp

Description: Learn how to implement seccomp profiles to filter system calls and restrict container behavior reducing attack surface and preventing exploitation techniques.

---

Seccomp (secure computing mode) is a Linux kernel feature that filters system calls made by processes. By restricting which syscalls containers can make, you prevent entire classes of attacks and limit what attackers can do even if they achieve code execution. Seccomp profiles define allow lists or deny lists of system calls, with violations causing the kernel to terminate the process or return errors.

Implementing seccomp in Kubernetes adds a critical security layer that operates at the kernel level, below the container runtime. Even if an attacker compromises your application, seccomp prevents them from making dangerous syscalls that could lead to privilege escalation or host compromise.

## Understanding seccomp modes

Seccomp operates in several modes:

**Disabled**: No filtering (insecure, default for some container runtimes)

**RuntimeDefault**: Uses the container runtime's default profile (good baseline)

**Localhost**: Uses a custom profile from the host filesystem (maximum control)

Most deployments should use RuntimeDefault as a minimum, with Localhost for specialized needs.

## Using the RuntimeDefault profile

The simplest secure configuration uses the runtime's default profile:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:v1.0
```

The RuntimeDefault profile blocks dangerous syscalls like:
- `mount` - Mounting filesystems
- `reboot` - Rebooting the system
- `ptrace` - Tracing other processes
- `swapon`/`swapoff` - Managing swap
- `delete_module` - Removing kernel modules

Most applications work fine with these restrictions.

## Container-level seccomp profiles

Apply profiles per-container for fine-grained control:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault  # Default for all containers
  containers:
  - name: app
    image: app:v1.0
    # Uses pod default

  - name: privileged-tool
    image: debug-tool:v1.0
    securityContext:
      seccompProfile:
        type: Unconfined  # No restrictions for this container
```

The app container uses RuntimeDefault while the debug tool runs unconfined. Use this pattern sparingly and only for debugging.

## Creating custom seccomp profiles

Custom profiles give precise control over allowed syscalls:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_X86",
    "SCMP_ARCH_X32"
  ],
  "syscalls": [
    {
      "names": [
        "accept",
        "accept4",
        "access",
        "arch_prctl",
        "bind",
        "brk",
        "chmod",
        "chown",
        "close",
        "connect",
        "dup",
        "dup2",
        "epoll_create",
        "epoll_ctl",
        "epoll_wait",
        "exit",
        "exit_group",
        "fchmod",
        "fchown",
        "fcntl",
        "fstat",
        "futex",
        "getcwd",
        "getdents",
        "getpeername",
        "getpid",
        "getppid",
        "getsockname",
        "getsockopt",
        "getuid",
        "listen",
        "lseek",
        "mmap",
        "mprotect",
        "munmap",
        "open",
        "openat",
        "pipe",
        "poll",
        "read",
        "readv",
        "recvfrom",
        "recvmsg",
        "rt_sigaction",
        "rt_sigprocmask",
        "rt_sigreturn",
        "select",
        "sendmsg",
        "sendto",
        "setsockopt",
        "shutdown",
        "socket",
        "stat",
        "write",
        "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

This profile allows only specific syscalls needed for a basic network application. Any other syscall attempt returns an error.

## Loading custom profiles from files

Store custom profiles on nodes and reference them:

```yaml
# Create ConfigMap with seccomp profile
apiVersion: v1
kind: ConfigMap
metadata:
  name: seccomp-profiles
  namespace: kube-system
data:
  webapp-profile.json: |
    {
      "defaultAction": "SCMP_ACT_ERRNO",
      "architectures": ["SCMP_ARCH_X86_64"],
      "syscalls": [
        {
          "names": ["accept", "bind", "connect", "read", "write", "close"],
          "action": "SCMP_ACT_ALLOW"
        }
      ]
    }
```

Configure nodes to load profiles:

```bash
# On each node
mkdir -p /var/lib/kubelet/seccomp/profiles
# Copy profile from ConfigMap to node
kubectl get configmap seccomp-profiles -n kube-system -o json | \
  jq -r '.data["webapp-profile.json"]' > \
  /var/lib/kubelet/seccomp/profiles/webapp-profile.json
```

Reference the profile in pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/webapp-profile.json
  containers:
  - name: app
    image: webapp:v1.0
```

## Auditing syscall usage

Before creating restrictive profiles, audit what syscalls your application uses:

```yaml
# Audit profile - logs violations without blocking
{
  "defaultAction": "SCMP_ACT_LOG",
  "architectures": ["SCMP_ARCH_X86_64"]
}
```

Deploy with this profile and review kernel audit logs:

```bash
# View seccomp audit events
sudo ausearch -m SECCOMP

# Or check kernel logs
sudo dmesg | grep SECCOMP
```

The logs show which syscalls the application attempted, helping you build an accurate allow list.

## Gradually restricting profiles

Start permissive and tighten over time:

**Phase 1: Audit mode**
```yaml
securityContext:
  seccompProfile:
    type: Localhost
    localhostProfile: profiles/audit.json  # Logs but doesn't block
```

**Phase 2: RuntimeDefault**
```yaml
securityContext:
  seccompProfile:
    type: RuntimeDefault  # Blocks dangerous syscalls
```

**Phase 3: Custom profile**
```yaml
securityContext:
  seccompProfile:
    type: Localhost
    localhostProfile: profiles/app-minimal.json  # Minimal allow list
```

This progression prevents breaking applications while moving toward maximum restriction.

## Handling seccomp violations

When seccomp blocks syscalls, applications see errors:

```
Error: Operation not permitted
```

Check container logs for more specific information:

```bash
kubectl logs pod-name container-name
```

If legitimate functionality breaks, update the profile to allow the required syscalls. Always verify that the syscalls are actually needed before allowing them.

## Seccomp with Pod Security Standards

The Restricted Pod Security profile requires seccomp:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

Pods in this namespace must specify RuntimeDefault or Localhost seccomp profiles. Pods without seccomp profiles or using Unconfined are rejected.

## Common syscalls and their purposes

Understanding syscalls helps build appropriate profiles:

**File operations**:
- `open`, `openat`, `close`, `read`, `write`, `stat`, `fstat`

**Network operations**:
- `socket`, `bind`, `listen`, `accept`, `connect`, `send`, `recv`

**Memory operations**:
- `mmap`, `mprotect`, `munmap`, `brk`

**Process operations**:
- `fork`, `clone`, `execve`, `wait`, `exit`

**Dangerous operations** (usually blocked):
- `mount`, `umount` - Filesystem mounting
- `ptrace` - Process tracing
- `reboot` - System reboot
- `swapon`, `swapoff` - Swap management
- `delete_module`, `init_module` - Kernel module management

## Database containers with seccomp

Databases typically need broader syscall access:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-creds
          key: password
```

RuntimeDefault provides sufficient syscall access for PostgreSQL. Custom profiles for databases should include:
- File I/O syscalls (read, write, fsync)
- Memory management (mmap, munmap)
- Process management (fork, clone)
- Network syscalls (socket, bind, listen, accept)

## Web servers with minimal syscalls

Web servers can use quite restrictive profiles:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "accept", "accept4",
        "bind", "close", "connect",
        "epoll_create", "epoll_ctl", "epoll_wait",
        "fcntl", "fstat",
        "futex",
        "getdents", "getpeername", "getpid", "getsockname", "getsockopt",
        "listen", "lseek",
        "mmap", "mprotect", "munmap",
        "open", "openat",
        "poll", "read", "readv",
        "recvfrom", "recvmsg",
        "rt_sigaction", "rt_sigprocmask", "rt_sigreturn",
        "sendmsg", "sendto", "setsockopt", "shutdown",
        "socket", "stat",
        "write", "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

This minimal profile is sufficient for Nginx or similar web servers.

## Monitoring seccomp effectiveness

Track seccomp violations to ensure profiles work correctly:

```yaml
# ServiceMonitor for seccomp metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: seccomp-violations
spec:
  selector:
    matchLabels:
      app: node-exporter
  endpoints:
  - port: metrics
```

Create alerts for unexpected violations:

```yaml
# PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: seccomp-alerts
spec:
  groups:
  - name: seccomp
    rules:
    - alert: SeccompViolation
      expr: |
        rate(seccomp_violations_total[5m]) > 0
      annotations:
        summary: "Seccomp profile blocking syscalls"
        description: "Application attempting blocked syscalls"
```

Investigate violations promptly - they may indicate attacks or overly restrictive profiles.

## Testing profiles before deployment

Test custom profiles locally before deploying:

```bash
# Run container with custom profile
docker run --rm -it \
  --security-opt seccomp=/path/to/profile.json \
  myapp:v1.0

# Test functionality
# Check for blocked syscalls in dmesg
```

Iterate on the profile until the application works correctly without unnecessary syscalls.

## Distributing profiles to nodes

For large clusters, automate profile distribution:

```yaml
# DaemonSet to distribute seccomp profiles
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: seccomp-installer
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: seccomp-installer
  template:
    metadata:
      labels:
        name: seccomp-installer
    spec:
      hostPID: true
      containers:
      - name: installer
        image: busybox
        command:
        - sh
        - -c
        - |
          mkdir -p /host/var/lib/kubelet/seccomp/profiles
          cp /profiles/* /host/var/lib/kubelet/seccomp/profiles/
          sleep infinity
        volumeMounts:
        - name: profiles
          mountPath: /profiles
        - name: host-seccomp
          mountPath: /host/var/lib/kubelet/seccomp
      volumes:
      - name: profiles
        configMap:
          name: seccomp-profiles
      - name: host-seccomp
        hostPath:
          path: /var/lib/kubelet/seccomp
```

This ensures all nodes have the required profiles.

## Best practices for seccomp

Always use at minimum RuntimeDefault seccomp profiles. Never run production workloads without seccomp.

Build custom profiles through iteration: audit mode first, then restrict based on actual usage.

Document why specific syscalls are allowed in custom profiles. This helps security reviews.

Test profiles thoroughly in non-production environments before deploying to production.

Monitor for seccomp violations and investigate promptly - they may indicate security issues.

Version your seccomp profiles and treat them as infrastructure code requiring review and testing.

## Conclusion

Seccomp profiles provide kernel-level security that prevents entire classes of attacks by filtering system calls. Even if attackers achieve code execution in your containers, seccomp prevents them from making dangerous syscalls that could lead to further compromise.

The RuntimeDefault profile provides good security for most applications with zero configuration effort. For security-sensitive workloads, custom profiles with minimal syscall allow lists provide maximum protection. By gradually restricting syscall access and monitoring for violations, you can build highly secure container environments that maintain functionality while dramatically reducing attack surface.
