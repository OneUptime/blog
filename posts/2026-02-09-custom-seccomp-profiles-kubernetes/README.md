# How to Create Custom Seccomp Profiles for Kubernetes Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Containers

Description: Learn how to create and apply custom seccomp profiles in Kubernetes to restrict system calls and enhance container security beyond default policies.

---

Secure Computing Mode (seccomp) filters system calls that containers can make to the Linux kernel. Default seccomp profiles block dangerous system calls, but custom profiles let you restrict containers to only the specific system calls your application needs. This reduces attack surface and contains potential security breaches.

## Understanding Seccomp Profiles

Every time a containerized process interacts with the Linux kernel, it makes a system call (syscall). Operations like opening files, creating network connections, or allocating memory all require syscalls. A compromised container might attempt syscalls that legitimate applications never use, such as loading kernel modules or modifying system time.

Seccomp profiles act as a whitelist or blacklist for syscalls. When a container tries to make a blocked syscall, the kernel can either deny the operation, kill the container, or log the attempt. This creates a strong security boundary around containerized applications.

## Creating a Basic Seccomp Profile

Create a simple seccomp profile that allows only essential syscalls:

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
        "capget",
        "capset",
        "chdir",
        "chmod",
        "chown",
        "close",
        "connect",
        "dup",
        "dup2",
        "dup3",
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
        "getegid",
        "geteuid",
        "getgid",
        "getpid",
        "getppid",
        "getuid",
        "listen",
        "lseek",
        "mmap",
        "mprotect",
        "munmap",
        "open",
        "openat",
        "pipe",
        "pipe2",
        "poll",
        "read",
        "readlink",
        "recvfrom",
        "recvmsg",
        "rt_sigaction",
        "rt_sigprocmask",
        "rt_sigreturn",
        "select",
        "sendmsg",
        "sendto",
        "set_robust_list",
        "set_tid_address",
        "setgid",
        "setgroups",
        "setuid",
        "socket",
        "stat",
        "write"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

This profile:
- Sets `SCMP_ACT_ERRNO` as the default action, causing blocked syscalls to fail with EPERM
- Specifies supported architectures
- Explicitly allows a minimal set of syscalls needed by most applications

Save this as `minimal-seccomp.json`.

## Storing Seccomp Profiles in Kubernetes

Create a ConfigMap to store the profile:

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
      "architectures": [
        "SCMP_ARCH_X86_64"
      ],
      "syscalls": [
        {
          "names": [
            "accept", "accept4", "access", "arch_prctl", "bind",
            "brk", "chdir", "close", "connect", "dup", "dup2",
            "epoll_create", "epoll_ctl", "epoll_wait", "exit",
            "exit_group", "fcntl", "fstat", "futex", "getcwd",
            "getdents64", "getpid", "getuid", "listen", "mmap",
            "munmap", "open", "openat", "read", "recvfrom",
            "recvmsg", "rt_sigaction", "rt_sigprocmask",
            "sendmsg", "sendto", "socket", "stat", "write"
          ],
          "action": "SCMP_ACT_ALLOW"
        }
      ]
    }
```

## Applying Seccomp Profiles to Pods

Use the profile in a pod specification:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secured-app
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/minimal-profile.json
  containers:
  - name: app
    image: nginx:1.21
    ports:
    - containerPort: 80
```

The profile path is relative to the kubelet's seccomp profile directory (typically `/var/lib/kubelet/seccomp/`).

## Discovering Required Syscalls

To build an accurate profile, discover which syscalls your application needs:

```bash
# Run application with audit mode seccomp profile
strace -c -f -S name nginx 2>&1 | grep -v -e '^SYS' -e '^---' | awk '{print $NF}' | sort -u
```

Create an audit profile that logs blocked syscalls:

```json
{
  "defaultAction": "SCMP_ACT_LOG",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": []
}
```

This profile allows all syscalls but logs them. Deploy your application with this profile, exercise all functionality, then check audit logs:

```bash
# Check audit logs for syscalls
kubectl exec -it secured-app -- grep SECCOMP /var/log/audit/audit.log

# Or use journalctl on the node
ssh node01 "journalctl -k | grep SECCOMP"
```

## Building Profiles Programmatically

Use a script to generate profiles from strace output:

```python
#!/usr/bin/env python3
import json
import subprocess
import sys

def get_syscalls_from_strace(command):
    """Run strace and extract syscall names"""
    try:
        result = subprocess.run(
            ['strace', '-c', '-f', '-S', 'name'] + command,
            capture_output=True,
            text=True,
            timeout=30
        )

        syscalls = set()
        for line in result.stderr.split('\n'):
            if line and not line.startswith((' ', '-', '%', 'SYS')):
                parts = line.split()
                if parts:
                    syscalls.add(parts[-1])

        return sorted(syscalls)
    except Exception as e:
        print(f"Error running strace: {e}", file=sys.stderr)
        return []

def create_seccomp_profile(syscalls, profile_path):
    """Create seccomp JSON profile"""
    profile = {
        "defaultAction": "SCMP_ACT_ERRNO",
        "architectures": [
            "SCMP_ARCH_X86_64",
            "SCMP_ARCH_X86",
            "SCMP_ARCH_X32"
        ],
        "syscalls": [
            {
                "names": syscalls,
                "action": "SCMP_ACT_ALLOW"
            }
        ]
    }

    with open(profile_path, 'w') as f:
        json.dump(profile, f, indent=2)

    print(f"Profile created: {profile_path}")
    print(f"Allowed syscalls: {len(syscalls)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: generate-seccomp.py <output-profile> <command> [args...]")
        sys.exit(1)

    output_file = sys.argv[1]
    command = sys.argv[2:]

    print(f"Analyzing: {' '.join(command)}")
    syscalls = get_syscalls_from_strace(command)

    if syscalls:
        create_seccomp_profile(syscalls, output_file)
    else:
        print("No syscalls captured", file=sys.stderr)
        sys.exit(1)
```

Use it to generate profiles:

```bash
# Generate profile for nginx
./generate-seccomp.py nginx-profile.json nginx -g 'daemon off;'

# Generate profile for your custom app
./generate-seccomp.py app-profile.json python app.py
```

## Advanced Profile with Conditional Rules

Create profiles with conditional syscall filtering:

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
          "op": "SCMP_CMP_EQ"
        }
      ]
    },
    {
      "names": ["open", "openat"],
      "action": "SCMP_ACT_ALLOW",
      "args": [
        {
          "index": 1,
          "value": 2,
          "valueTwo": 0,
          "op": "SCMP_CMP_MASKED_EQ"
        }
      ]
    }
  ]
}
```

This profile:
- Allows `socket` only with domain=AF_INET (value 2)
- Allows `open` and `openat` only in read-only mode

## Testing Seccomp Profiles

Create a test pod to validate your profile:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: seccomp-test
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/test-profile.json
  containers:
  - name: test
    image: alpine:latest
    command:
    - /bin/sh
    - -c
    - |
      echo "Testing allowed syscalls..."
      ls /tmp
      echo "Test 1: PASSED"

      echo "Testing blocked syscall (clock_settime)..."
      if ! date -s "2025-01-01" 2>&1 | grep -q "Permission denied"; then
        echo "Test 2: FAILED - syscall should be blocked"
        exit 1
      fi
      echo "Test 2: PASSED"

      echo "All tests passed"
    securityContext:
      allowPrivilegeEscalation: false
      runAsNonRoot: true
      runAsUser: 1000
```

## Deploying Profiles to Nodes

For localhost profiles, deploy them to all nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: seccomp-installer
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: seccomp-installer
  template:
    metadata:
      labels:
        app: seccomp-installer
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: installer
        image: alpine:latest
        command:
        - /bin/sh
        - -c
        - |
          # Install profiles
          mkdir -p /host/var/lib/kubelet/seccomp/profiles

          # Copy profiles from ConfigMap
          cp /profiles/*.json /host/var/lib/kubelet/seccomp/profiles/

          echo "Seccomp profiles installed"
          sleep infinity
        volumeMounts:
        - name: host-kubelet
          mountPath: /host/var/lib/kubelet
        - name: profiles
          mountPath: /profiles
        securityContext:
          privileged: true
      volumes:
      - name: host-kubelet
        hostPath:
          path: /var/lib/kubelet
      - name: profiles
        configMap:
          name: seccomp-profiles
```

## Using RuntimeDefault Profile

For most applications, start with the runtime default profile:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-default-seccomp
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:latest
```

RuntimeDefault uses the container runtime's default seccomp profile, which blocks dangerous syscalls while allowing common operations.

## Monitoring Seccomp Violations

Track blocked syscalls in production:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: monitored-app
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/monitored-profile.json
  containers:
  - name: app
    image: nginx:1.21
  - name: log-monitor
    image: fluent/fluent-bit:latest
    volumeMounts:
    - name: varlog
      mountPath: /var/log
      readOnly: true
    env:
    - name: FLUENT_BIT_CONFIG
      value: |
        [INPUT]
            Name systemd
            Tag seccomp
            Systemd_Filter _COMM=audit

        [OUTPUT]
            Name stdout
            Match *
  volumes:
  - name: varlog
    hostPath:
      path: /var/log
```

## Best Practices

Start with RuntimeDefault profile and only create custom profiles when you need stricter controls. Most applications work fine with the runtime default.

Build profiles in audit mode first. Capture all syscalls your application uses before creating a restrictive profile.

Test thoroughly. Exercise all code paths of your application to ensure the profile doesn't block legitimate functionality.

Version control your profiles. Treat seccomp profiles like code - track changes, review modifications, and maintain history.

Document why specific syscalls are allowed. Future maintainers need to understand which application features require which syscalls.

## Conclusion

Custom seccomp profiles provide fine-grained control over container system call access. By restricting containers to only necessary syscalls, you reduce attack surface and limit the impact of security vulnerabilities. Build profiles methodically using audit logs and testing, then deploy them as part of your defense-in-depth security strategy.
