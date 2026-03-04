# How to Configure CRI-O Seccomp Profiles for System Call Filtering in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRI-O, Security, Seccomp, System Calls

Description: Learn how to configure and deploy seccomp profiles with CRI-O to filter dangerous system calls and enhance container security in Kubernetes clusters through syscall whitelisting.

---

Seccomp (Secure Computing Mode) restricts system calls that containers can make, reducing attack surface significantly. CRI-O supports custom seccomp profiles that define allowed syscalls for different workload types. By blocking unnecessary system calls, you prevent entire classes of exploits. This guide shows you how to implement effective seccomp profiles for Kubernetes.

## Understanding Seccomp Security

Seccomp filters syscalls at the kernel level before they execute. A seccomp profile defines which syscalls are allowed, blocked, or logged. Containers run with restricted syscall access, preventing attackers from using certain kernel features even if they compromise the application. This defense-in-depth approach stops exploits that rely on specific syscalls.

The default seccomp profile blocks dangerous syscalls like reboot, module loading, and clock manipulation while allowing syscalls needed by most applications. Custom profiles enable fine-tuning security for specific workloads, blocking additional syscalls that your application doesn't use.

## Configuring CRI-O Seccomp Support

Enable seccomp profile support in CRI-O.

```toml
# /etc/crio/crio.conf
[crio.runtime]
# Enable seccomp
seccomp_profile = "/usr/share/containers/seccomp.json"

# Allow custom profiles
seccomp_use_default_when_empty = true

# Profile directory
seccomp_profile_root = "/var/lib/kubelet/seccomp"
```

Create profile directory:

```bash
sudo mkdir -p /var/lib/kubelet/seccomp
sudo chmod 755 /var/lib/kubelet/seccomp
```

## Creating Custom Seccomp Profiles

Build restrictive profiles for different workload types.

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_X86",
    "SCMP_ARCH_AARCH64"
  ],
  "syscalls": [
    {
      "names": [
        "accept",
        "accept4",
        "bind",
        "close",
        "connect",
        "epoll_create",
        "epoll_ctl",
        "epoll_wait",
        "exit",
        "exit_group",
        "futex",
        "getcwd",
        "getpid",
        "getsockopt",
        "listen",
        "mmap",
        "munmap",
        "open",
        "openat",
        "read",
        "recv",
        "recvfrom",
        "rt_sigaction",
        "rt_sigprocmask",
        "send",
        "sendto",
        "setsockopt",
        "socket",
        "write"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Save as `/var/lib/kubelet/seccomp/restrictive.json`.

Web server profile:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "accept4", "bind", "brk", "clone", "close", "connect",
        "epoll_create1", "epoll_ctl", "epoll_wait", "exit_group",
        "fcntl", "fstat", "futex", "getcwd", "getpeername", "getpid",
        "getsockname", "getsockopt", "listen", "mmap", "mprotect",
        "munmap", "open", "openat", "read", "recvfrom", "rt_sigaction",
        "rt_sigprocmask", "sendto", "setsockopt", "socket", "stat",
        "write", "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

## Deploying Pods with Seccomp Profiles

Apply seccomp profiles to Kubernetes pods.

```yaml
# seccomp-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: restrictive.json
  containers:
  - name: app
    image: mycompany/app:latest
    securityContext:
      allowPrivilegeEscalation: false
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
```

Deployment with per-container profiles:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-container-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure
  template:
    metadata:
      labels:
        app: secure
    spec:
      containers:
      - name: web
        image: nginx:alpine
        securityContext:
          seccompProfile:
            type: Localhost
            localhostProfile: webserver.json
      - name: api
        image: mycompany/api:latest
        securityContext:
          seccompProfile:
            type: Localhost
            localhostProfile: api-server.json
```

## Testing Seccomp Profiles

Verify profiles block dangerous syscalls.

```bash
# Test profile with a container
kubectl run test-seccomp \
  --image=alpine \
  --overrides='
{
  "spec": {
    "securityContext": {
      "seccompProfile": {
        "type": "Localhost",
        "localhostProfile": "restrictive.json"
      }
    }
  }
}' \
  -- sh -c "reboot"

# Should fail with operation not permitted
kubectl logs test-seccomp
```

## Troubleshooting Seccomp Issues

Debug blocked syscalls:

```bash
# Enable audit logging
sudo auditctl -a exit,always -F arch=b64 -S all

# View blocked syscalls
sudo ausearch -m SECCOMP

# Check CRI-O logs
sudo journalctl -u crio | grep seccomp
```

Seccomp profiles provide powerful syscall filtering that significantly reduces container attack surface. By allowing only necessary syscalls for specific workloads, you prevent entire classes of kernel exploits. Custom profiles enable tuning security requirements for different application types while maintaining compatibility. For production Kubernetes clusters, seccomp profiles are essential security controls that should be applied to all workloads.
