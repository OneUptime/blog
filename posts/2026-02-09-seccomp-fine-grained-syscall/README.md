# How to implement seccomp profiles with fine-grained syscall control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Seccomp, System Calls, Container Security

Description: Learn how to create and implement fine-grained seccomp profiles in Kubernetes that precisely control which system calls containers can execute, blocking dangerous operations at the kernel level.

---

Secure Computing Mode (seccomp) provides kernel-level enforcement of system call restrictions. While runtime/default profiles offer baseline security, custom seccomp profiles enable fine-grained control over exactly which system calls your containers can execute. This precision dramatically reduces the attack surface by blocking unnecessary kernel interfaces.

## Understanding Seccomp System Call Filtering

Linux applications interact with the kernel through system calls. A typical application uses only a small subset of the 300+ available system calls, yet containers usually can access all of them by default. Each unnecessary system call represents a potential exploitation vector.

Seccomp profiles define allow lists or deny lists of system calls. When a process attempts a blocked system call, the kernel kills the process or returns an error, preventing potential exploitation. This protection operates at the kernel level, making it impossible for attackers to bypass.

## Runtime Default Profile

Start with the runtime/default profile which blocks obviously dangerous system calls:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: runtime-default-demo
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: nginx:1.21
    securityContext:
      runAsUser: 101
      runAsNonRoot: true
      allowPrivilegeEscalation: false
```

The runtime/default profile blocks system calls like `reboot`, `swapon`, `mount`, and others that normal applications never need. This provides good baseline security without requiring custom profile development.

## Creating Custom Seccomp Profiles

Build custom profiles by analyzing your application's actual system call usage:

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
        "clone",
        "close",
        "connect",
        "dup",
        "dup2",
        "epoll_create",
        "epoll_create1",
        "epoll_ctl",
        "epoll_wait",
        "exit",
        "exit_group",
        "fcntl",
        "fstat",
        "futex",
        "getcwd",
        "getdents",
        "getdents64",
        "getpid",
        "getsockname",
        "getsockopt",
        "listen",
        "lseek",
        "mmap",
        "mprotect",
        "munmap",
        "open",
        "openat",
        "poll",
        "read",
        "readlink",
        "recvfrom",
        "rt_sigaction",
        "rt_sigprocmask",
        "rt_sigreturn",
        "select",
        "sendto",
        "set_robust_list",
        "set_tid_address",
        "setsockopt",
        "socket",
        "stat",
        "write"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

This profile uses a deny-by-default approach (SCMP_ACT_ERRNO), then explicitly allows required system calls. This minimalist allow list provides maximum security.

## Deploying Custom Profiles via ConfigMaps

Store custom seccomp profiles in ConfigMaps for easy distribution:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: seccomp-profiles
  namespace: default
data:
  minimal-profile.json: |
    {
      "defaultAction": "SCMP_ACT_ERRNO",
      "architectures": ["SCMP_ARCH_X86_64"],
      "syscalls": [
        {
          "names": ["read", "write", "open", "close", "exit_group"],
          "action": "SCMP_ACT_ALLOW"
        }
      ]
    }
---
apiVersion: v1
kind: Pod
metadata:
  name: custom-seccomp-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      seccompProfile:
        type: Localhost
        localhostProfile: profiles/minimal-profile.json
    volumeMounts:
    - name: seccomp-profiles
      mountPath: /var/lib/kubelet/seccomp/profiles
      readOnly: true
  volumes:
  - name: seccomp-profiles
    configMap:
      name: seccomp-profiles
```

The profile must exist at `/var/lib/kubelet/seccomp` on the node. Use DaemonSets or node configuration tools to distribute profiles.

## Discovering Required System Calls

Trace your application to discover which system calls it actually uses:

```bash
# Run application with strace to capture syscalls
strace -c -f -o syscalls.log ./myapp

# Extract unique system call names
grep -oP '^\s*\K[a-z_0-9]+(?=\()' syscalls.log | sort -u > required-syscalls.txt

# Generate seccomp profile from the list
cat required-syscalls.txt | jq -R -s 'split("\n") | map(select(length > 0))' | \
  jq '{defaultAction: "SCMP_ACT_ERRNO", architectures: ["SCMP_ARCH_X86_64"],
      syscalls: [{names: ., action: "SCMP_ACT_ALLOW"}]}'
```

This systematic approach ensures you allow only necessary system calls.

## Conditional System Call Arguments

Some system calls are safe with certain arguments but dangerous with others. Control this with argument conditions:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["socket"],
      "action": "SCMP_ACT_ALLOW",
      "args": [
        {
          "index": 0,
          "value": 2,
          "valueTwo": 0,
          "op": "SCMP_CMP_EQ"
        }
      ]
    },
    {
      "names": ["read", "write", "close"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

This profile allows socket creation only for AF_INET (value 2) sockets, blocking other socket types.

## Handling Seccomp Violations

When processes violate seccomp profiles, the kernel either kills them or returns errors:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: seccomp-test
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: test
    image: ubuntu:20.04
    command: ["sh", "-c"]
    args:
    - |
      # Try blocked system call
      reboot 2>&1 || echo "reboot blocked: $?"

      # Try allowed system call
      echo "Writing to stdout works"

      sleep 3600
```

Check pod logs and node kernel logs to diagnose seccomp violations.

## Progressive Profile Development

Develop seccomp profiles progressively:

```yaml
# Stage 1: Audit mode (log but don't block)
apiVersion: v1
kind: Pod
metadata:
  name: audit-stage
  annotations:
    seccomp.security.alpha.kubernetes.io/pod: "audit"
spec:
  containers:
  - name: app
    image: myapp:1.0

---
# Stage 2: Complain mode (warn about violations)
apiVersion: v1
kind: Pod
metadata:
  name: complain-stage
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault  # Start with runtime default
  containers:
  - name: app
    image: myapp:1.0

---
# Stage 3: Enforce custom profile
apiVersion: v1
kind: Pod
metadata:
  name: enforce-stage
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/custom-app.json
  containers:
  - name: app
    image: myapp:1.0
```

This staged approach prevents breaking production applications.

## Per-Container Profiles

Different containers in the same pod can use different profiles:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-profile-pod
spec:
  containers:
  - name: web-server
    image: nginx:1.21
    securityContext:
      seccompProfile:
        type: Localhost
        localhostProfile: profiles/web-server.json
      runAsUser: 101
      runAsNonRoot: true
  - name: log-processor
    image: busybox
    command: ["sh", "-c", "while true; do sleep 10; done"]
    securityContext:
      seccompProfile:
        type: Localhost
        localhostProfile: profiles/minimal.json
      runAsUser: 1000
      runAsNonRoot: true
```

Tailor each profile to the specific container's requirements.

## Monitoring Seccomp Effectiveness

Track seccomp violations and profile effectiveness:

```bash
# Check kernel audit logs for seccomp violations
sudo ausearch -m SECCOMP --start recent

# Monitor specific pod for violations
kubectl logs -f my-pod

# Check node system logs
journalctl -k | grep seccomp
```

Frequent violations might indicate profile misconfiguration or security incidents.

## Common System Call Groups

Group related system calls for easier profile management:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write", "readv", "writev", "pread64", "pwrite64"],
      "action": "SCMP_ACT_ALLOW",
      "comment": "File I/O operations"
    },
    {
      "names": ["open", "openat", "close", "creat", "stat", "fstat", "lstat"],
      "action": "SCMP_ACT_ALLOW",
      "comment": "File operations"
    },
    {
      "names": ["socket", "connect", "bind", "listen", "accept", "accept4"],
      "action": "SCMP_ACT_ALLOW",
      "comment": "Network operations"
    },
    {
      "names": ["exit", "exit_group"],
      "action": "SCMP_ACT_ALLOW",
      "comment": "Process termination"
    }
  ]
}
```

Organize profiles by functionality for maintainability.

## Integration with CI/CD

Validate seccomp profiles in your pipeline:

```yaml
# .gitlab-ci.yml
validate-seccomp:
  stage: test
  script:
    - |
      # Validate JSON syntax
      for profile in seccomp-profiles/*.json; do
        jq empty "$profile" || exit 1
      done

      # Test profiles with sample containers
      kubectl apply -f test-pods/
      sleep 30
      kubectl get pods | grep test- | grep Running
      kubectl delete -f test-pods/
```

Automated testing catches profile errors before production deployment.

## Conclusion

Custom seccomp profiles provide precise control over system call access, dramatically reducing container attack surfaces. Start with runtime/default profiles for baseline security, then develop custom profiles by tracing application behavior and systematically building allow lists. Use conditional arguments to permit safe system call usage while blocking dangerous operations. Deploy profiles progressively through audit, warning, and enforcement stages to avoid breaking applications. Combine seccomp with other security measures like running as non-root and read-only root filesystems for defense in depth. Regular monitoring and updates ensure profiles remain effective as applications evolve. Fine-grained seccomp control transforms containers into highly restricted execution environments where kernel-level enforcement prevents exploitation attempts that bypass application-level security.
