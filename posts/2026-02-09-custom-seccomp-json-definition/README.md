# How to implement custom seccomp profiles with JSON definition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Seccomp, JSON, System Calls

Description: Master the creation of custom seccomp profiles using JSON definitions to precisely control system call access in Kubernetes containers, implementing security policies at the kernel level.

---

Custom seccomp profiles give you complete control over which system calls your containers can execute. While runtime/default provides good baseline security, custom JSON profiles let you create minimalist allow lists tailored to your specific applications. This precision dramatically reduces attack surface by blocking unnecessary kernel interfaces at the source.

## JSON Profile Structure

Seccomp profiles use a specific JSON structure:

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
        "access"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

The `defaultAction` specifies what happens for syscalls not explicitly listed. The `architectures` array defines which CPU architectures the profile supports. The `syscalls` array contains rules for specific system calls.

## Available Actions

Seccomp supports several actions for handling system calls:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write"],
      "action": "SCMP_ACT_ALLOW"
    },
    {
      "names": ["chmod", "chown"],
      "action": "SCMP_ACT_ERRNO"
    },
    {
      "names": ["reboot"],
      "action": "SCMP_ACT_KILL"
    },
    {
      "names": ["socket"],
      "action": "SCMP_ACT_LOG"
    }
  ]
}
```

SCMP_ACT_ALLOW permits the syscall. SCMP_ACT_ERRNO returns an error. SCMP_ACT_KILL terminates the process. SCMP_ACT_LOG allows the syscall but logs it. SCMP_ACT_TRAP sends SIGSYS to the process.

## Building Minimal Profiles

Create allow-list profiles that permit only necessary syscalls:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64"
  ],
  "syscalls": [
    {
      "names": [
        "brk",
        "close",
        "exit",
        "exit_group",
        "fstat",
        "mmap",
        "mprotect",
        "munmap",
        "open",
        "openat",
        "read",
        "rt_sigaction",
        "rt_sigprocmask",
        "rt_sigreturn",
        "set_robust_list",
        "set_tid_address",
        "stat",
        "write"
      ],
      "action": "SCMP_ACT_ALLOW",
      "comment": "Essential syscalls for basic execution"
    }
  ]
}
```

This minimalist profile allows only fundamental operations. Test thoroughly to ensure your application works.

## Conditional Syscall Arguments

Control syscalls based on their arguments:

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
      ],
      "comment": "Allow only AF_INET sockets (value 2)"
    },
    {
      "names": ["open", "openat"],
      "action": "SCMP_ACT_ALLOW",
      "args": [
        {
          "index": 1,
          "value": 64,
          "op": "SCMP_CMP_MASKED_EQ"
        }
      ],
      "comment": "Allow only O_RDONLY opens (flag 0)"
    }
  ]
}
```

Argument conditions let you permit safe syscall usage while blocking dangerous variations.

## Available Comparison Operators

Seccomp supports multiple comparison operators:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["fcntl"],
      "action": "SCMP_ACT_ALLOW",
      "args": [
        {
          "index": 1,
          "value": 1030,
          "valueTwo": 1035,
          "op": "SCMP_CMP_MASKED_EQ",
          "comment": "SCMP_CMP_NE - not equal"
        }
      ]
    }
  ]
}
```

Operators include SCMP_CMP_EQ (equal), SCMP_CMP_NE (not equal), SCMP_CMP_LT (less than), SCMP_CMP_LE (less or equal), SCMP_CMP_GT (greater than), SCMP_CMP_GE (greater or equal), and SCMP_CMP_MASKED_EQ (masked bits equal).

## Profile for Web Applications

Example profile for a typical web application:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "accept", "accept4", "access", "arch_prctl", "bind", "brk",
        "clone", "close", "connect", "dup", "dup2", "epoll_create",
        "epoll_create1", "epoll_ctl", "epoll_pwait", "epoll_wait",
        "exit", "exit_group", "fcntl", "fstat", "futex", "getcwd",
        "getdents", "getdents64", "getpid", "getppid", "getrandom",
        "getsockname", "getsockopt", "gettid", "ioctl", "listen",
        "lseek", "madvise", "mmap", "mprotect", "munmap", "nanosleep",
        "open", "openat", "pipe", "pipe2", "poll", "pread64",
        "pselect6", "pwrite64", "read", "readlink", "recvfrom",
        "recvmsg", "rt_sigaction", "rt_sigprocmask", "rt_sigreturn",
        "sched_getaffinity", "sched_yield", "select", "sendmsg",
        "sendto", "set_robust_list", "set_tid_address", "setitimer",
        "setsockopt", "shutdown", "sigaltstack", "socket", "stat",
        "tgkill", "uname", "write", "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

This profile supports HTTP servers and database clients while blocking dangerous operations.

## Profile for Database Applications

Example profile for database workloads:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "accept", "bind", "brk", "clone", "close", "connect",
        "epoll_create", "epoll_ctl", "epoll_wait", "exit_group",
        "fallocate", "fcntl", "fstat", "fsync", "ftruncate",
        "futex", "getdents", "getpid", "getsockname", "getsockopt",
        "listen", "lseek", "mmap", "mprotect", "munmap", "open",
        "openat", "poll", "pread64", "pwrite64", "read", "readv",
        "recvfrom", "recvmsg", "rt_sigaction", "rt_sigprocmask",
        "sendmsg", "sendto", "set_robust_list", "setsockopt",
        "shutdown", "socket", "stat", "sync_file_range", "write",
        "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

This profile includes file sync operations needed by databases.

## Deploying Custom Profiles

Store profiles on nodes and reference them in pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-seccomp-app
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/minimal-app.json
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 1000
      runAsNonRoot: true
      allowPrivilegeEscalation: false
```

The profile must exist at `/var/lib/kubelet/seccomp/profiles/minimal-app.json` on the node.

## Profile Distribution via DaemonSet

Distribute profiles using a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: seccomp-profile-installer
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
      containers:
      - name: installer
        image: busybox
        command: ["sh", "-c"]
        args:
        - |
          mkdir -p /host/var/lib/kubelet/seccomp/profiles
          cp /profiles/*.json /host/var/lib/kubelet/seccomp/profiles/
          while true; do sleep 3600; done
        volumeMounts:
        - name: seccomp-path
          mountPath: /host/var/lib/kubelet/seccomp
        - name: profile-source
          mountPath: /profiles
      volumes:
      - name: seccomp-path
        hostPath:
          path: /var/lib/kubelet/seccomp
          type: DirectoryOrCreate
      - name: profile-source
        configMap:
          name: seccomp-profiles
```

This DaemonSet copies profiles from a ConfigMap to all nodes.

## Testing Profiles

Validate profiles before production deployment:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: profile-test
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/test-profile.json
  containers:
  - name: test
    image: ubuntu:20.04
    command: ["sh", "-c"]
    args:
    - |
      # Test allowed syscalls
      echo "Testing read/write..."
      echo "test" > /tmp/file
      cat /tmp/file

      # Test blocked syscalls
      echo "Testing blocked syscall..."
      reboot 2>&1 || echo "Reboot blocked as expected"

      sleep 3600
```

Systematic testing ensures profiles work correctly.

## Monitoring Profile Violations

Track when processes violate seccomp profiles:

```bash
# Check kernel audit logs
sudo ausearch -m SECCOMP --start recent

# Example output shows blocked syscalls
# type=SECCOMP ... syscall=165 (mount) ...
```

Violations indicate either profile misconfiguration or security incidents.

## Version Control for Profiles

Manage profiles in version control:

```bash
seccomp-profiles/
├── base/
│   ├── minimal.json
│   ├── webserver.json
│   └── database.json
├── applications/
│   ├── myapp-v1.json
│   ├── myapp-v2.json
│   └── legacy-app.json
└── README.md
```

Track profile changes and test before rolling out updates.

## Conclusion

Custom seccomp profiles using JSON definitions provide precise system call control that dramatically reduces container attack surface. Build minimalist allow-list profiles that permit only necessary syscalls for your applications. Use conditional arguments to allow safe syscall usage while blocking dangerous variations. Test profiles thoroughly in development before production deployment. Distribute profiles systematically using DaemonSets or configuration management tools. Monitor for violations that indicate profile issues or security incidents. Version control your profiles and review them regularly as applications evolve. Custom seccomp profiles represent one of the most effective container security measures available, providing kernel-level enforcement that attackers cannot bypass regardless of application-level compromises.
