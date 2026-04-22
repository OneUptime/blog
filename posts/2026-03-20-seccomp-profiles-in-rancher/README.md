# How to Use Seccomp Profiles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Seccomp, Linux, Container Security

Description: Learn how to apply seccomp profiles to workloads in Rancher-managed Kubernetes clusters to restrict system calls and reduce the attack surface of containerized applications.

## Introduction

Seccomp (Secure Computing Mode) is a Linux kernel feature that restricts the system calls a process can make. Applying seccomp profiles in Rancher helps harden your containers by limiting what they can do at the kernel level, reducing the blast radius of a compromise.

## Prerequisites

- A Rancher-managed Kubernetes cluster (v1.19+)
- kubectl access to the cluster
- Basic understanding of Linux system calls

## Understanding Seccomp Profiles

Kubernetes supports three seccomp profile types:

- **RuntimeDefault** - uses the container runtime's default profile
- **Localhost** - uses a custom profile file on the node
- **Unconfined** - no seccomp restrictions (not recommended)

## Applying the RuntimeDefault Profile

The simplest approach is using the container runtime's default seccomp profile:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: nginx:latest
        securityContext:
          allowPrivilegeEscalation: false
```

## Creating a Custom Seccomp Profile

For tighter control, create a custom profile on each node at `/var/lib/kubelet/seccomp/profiles/custom-nginx.json` after auditing the workload's actual syscalls. The example below shows the OCI seccomp profile format, but the final syscall list must be generated and tested for your image, runtime, architecture, and kernel:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["accept4", "bind", "clone", "close", "connect", "epoll_create1",
                "epoll_ctl", "epoll_wait", "exit", "exit_group", "fcntl",
                "fstat", "futex", "getpid", "gettid", "listen", "mmap",
                "mprotect", "munmap", "nanosleep", "open", "openat", "read",
                "recvfrom", "sendto", "setsockopt", "socket", "write"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

## Using a Localhost Profile

Reference the custom profile in your workload:

```yaml
securityContext:
  seccompProfile:
    type: Localhost
    localhostProfile: profiles/custom-nginx.json
```

## Enabling Seccomp via Rancher UI

In Rancher v2.14.0 and later, navigate to your workload, click **Edit**, expand **Security Context**, and set **Seccomp Profile** to `RuntimeDefault`. For a custom profile, choose `Localhost` and set **Localhost Profile** to `profiles/custom-nginx.json`.

## Auditing with Logs

To audit which syscalls a container attempts, temporarily use `SCMP_ACT_LOG` as the default action and review the node's kernel or audit logs:

```bash
sudo journalctl -k | grep -i "seccomp"
# or, depending on the node OS:
sudo dmesg | grep -i "seccomp"
sudo grep -i "seccomp" /var/log/syslog
```

## Conclusion

Applying seccomp profiles in Rancher is an effective way to reduce the kernel attack surface of your workloads. Start with `RuntimeDefault` for broad coverage and refine to custom profiles as your understanding of each application's syscall requirements grows.
