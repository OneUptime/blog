# How to Set Up Seccomp Profiles on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Seccomp, Kubernetes, Security, Syscall Filtering

Description: A detailed guide to setting up and managing seccomp profiles on Talos Linux for filtering dangerous system calls in your Kubernetes containers.

---

Seccomp, short for secure computing mode, is a Linux kernel feature that filters the system calls a process can make. Every interaction between a container and the kernel happens through system calls - reading files, opening network connections, creating processes. By restricting which syscalls are available, you dramatically reduce the attack surface of your containers. On Talos Linux, where the OS is already minimal and immutable, seccomp profiles add another layer of defense at the syscall level.

This guide covers setting up seccomp profiles on Talos Linux, from using the built-in RuntimeDefault profile to creating and deploying custom profiles.

## Understanding Seccomp in Kubernetes

Kubernetes supports three types of seccomp profiles:

- **RuntimeDefault** - Uses the container runtime's default seccomp profile. For containerd (which Talos uses), this blocks around 44 dangerous syscalls while allowing the roughly 300 that most applications need.
- **Localhost** - Uses a custom profile stored on the node's filesystem.
- **Unconfined** - No seccomp filtering at all (not recommended).

The RuntimeDefault profile is a solid starting point. It blocks syscalls like ptrace, reboot, mount, and others that containers should never need.

## Enabling RuntimeDefault Seccomp on Talos Linux

Starting with Kubernetes 1.27, you can set the RuntimeDefault seccomp profile as the default for all pods in your cluster. On Talos Linux, this is configured through the Talos machine configuration.

```yaml
# Talos machine config patch to enable default seccomp
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: "restricted"
            enforce-version: "latest"
            audit: "restricted"
            audit-version: "latest"
            warn: "restricted"
            warn-version: "latest"
```

You can also apply the RuntimeDefault profile at the pod level.

```yaml
# pod-with-runtime-default.yaml
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
      image: myapp:latest
      securityContext:
        allowPrivilegeEscalation: false
        runAsNonRoot: true
        capabilities:
          drop:
            - ALL
```

## What RuntimeDefault Blocks

The RuntimeDefault profile in containerd blocks dangerous syscalls including:

```text
# Syscalls blocked by RuntimeDefault
acct          - Process accounting
add_key       - Kernel keyring manipulation
bpf           - Extended BPF operations
clock_adjtime - System clock adjustment
clock_settime - System clock modification
create_module - Kernel module creation
delete_module - Kernel module removal
finit_module  - Kernel module loading
get_mempolicy - NUMA memory policy
init_module   - Kernel module initialization
kcmp          - Process comparison
kexec_file_load - Kernel execution
kexec_load    - Kernel loading
keyctl        - Keyring operations
lookup_dcookie - Kernel debugging
mount         - Filesystem mounting
move_pages    - NUMA page movement
nfsservctl    - NFS server control
open_by_handle_at - File handle operations
perf_event_open - Performance monitoring
personality   - Process execution domain
pivot_root    - Root filesystem change
ptrace        - Process tracing
query_module  - Module query
reboot        - System reboot
request_key   - Kernel key request
setns         - Namespace switching
swapon        - Swap activation
swapoff       - Swap deactivation
sysfs         - Sysfs operations
umount2       - Filesystem unmounting
unshare       - Namespace creation
userfaultfd   - User-space page fault handling
```

## Creating Custom Seccomp Profiles

For tighter security, create custom profiles that only allow the specific syscalls your application needs.

### Step 1: Generate a Profile Using Logs

First, run your application with logging enabled to discover which syscalls it uses.

```yaml
# pod-with-logging.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-seccomp-audit
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/audit.json
  containers:
    - name: app
      image: myapp:latest
```

The audit profile logs all syscalls without blocking them.

```json
{
  "defaultAction": "SCMP_ACT_LOG",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": []
}
```

### Step 2: Build the Custom Profile

Based on the audit logs, create a profile that allows only the needed syscalls.

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_AARCH64"
  ],
  "syscalls": [
    {
      "names": [
        "accept4",
        "access",
        "arch_prctl",
        "bind",
        "brk",
        "clone",
        "close",
        "connect",
        "epoll_create1",
        "epoll_ctl",
        "epoll_wait",
        "execve",
        "exit_group",
        "fcntl",
        "fstat",
        "futex",
        "getdents64",
        "getpeername",
        "getpid",
        "getsockname",
        "getsockopt",
        "listen",
        "lseek",
        "madvise",
        "mmap",
        "mprotect",
        "munmap",
        "nanosleep",
        "newfstatat",
        "openat",
        "pipe2",
        "read",
        "recvfrom",
        "rt_sigaction",
        "rt_sigprocmask",
        "rt_sigreturn",
        "sendto",
        "set_robust_list",
        "set_tid_address",
        "setsockopt",
        "sigaltstack",
        "socket",
        "write"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

## Deploying Custom Profiles on Talos Linux

Since Talos is immutable, you cannot simply copy files to the node. Use the Talos machine configuration to place seccomp profiles.

```yaml
# Talos machine config patch for custom seccomp profiles
machine:
  files:
    - content: |
        {
          "defaultAction": "SCMP_ACT_ERRNO",
          "architectures": ["SCMP_ARCH_X86_64", "SCMP_ARCH_AARCH64"],
          "syscalls": [
            {
              "names": [
                "accept4", "access", "arch_prctl", "bind", "brk",
                "clone", "close", "connect", "epoll_create1",
                "epoll_ctl", "epoll_wait", "execve", "exit_group",
                "fcntl", "fstat", "futex", "getdents64", "getpeername",
                "getpid", "getsockname", "getsockopt", "listen",
                "lseek", "madvise", "mmap", "mprotect", "munmap",
                "nanosleep", "newfstatat", "openat", "pipe2", "read",
                "recvfrom", "rt_sigaction", "rt_sigprocmask",
                "rt_sigreturn", "sendto", "set_robust_list",
                "set_tid_address", "setsockopt", "sigaltstack",
                "socket", "write"
              ],
              "action": "SCMP_ACT_ALLOW"
            }
          ]
        }
      path: /var/lib/kubelet/seccomp/profiles/custom-app.json
      permissions: 0644
      op: create
```

```bash
# Apply the machine config patch
talosctl patch machineconfig \
  --nodes <node-ip> \
  --patch-file seccomp-profiles-patch.yaml
```

## Using the Security Profile Operator

For a more dynamic approach, use the Security Profile Operator (SPO) to manage seccomp profiles as Kubernetes resources.

```bash
# Install the Security Profile Operator
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/security-profiles-operator/main/deploy/operator.yaml

# Wait for the operator to be ready
kubectl get pods -n security-profiles-operator -w
```

Create a seccomp profile as a Kubernetes resource.

```yaml
# seccomp-profile.yaml
apiVersion: security-profiles-operator.x-k8s.io/v1beta1
kind: SeccompProfile
metadata:
  name: custom-app-profile
  namespace: default
spec:
  defaultAction: SCMP_ACT_ERRNO
  architectures:
    - SCMP_ARCH_X86_64
    - SCMP_ARCH_AARCH64
  syscalls:
    - action: SCMP_ACT_ALLOW
      names:
        - accept4
        - bind
        - brk
        - clone
        - close
        - connect
        - epoll_create1
        - epoll_ctl
        - epoll_wait
        - execve
        - exit_group
        - fcntl
        - fstat
        - futex
        - getdents64
        - getpid
        - listen
        - mmap
        - mprotect
        - munmap
        - nanosleep
        - openat
        - read
        - socket
        - write
```

```bash
# Apply the profile
kubectl apply -f seccomp-profile.yaml

# Reference it in your pod
# The SPO installs the profile to the node automatically
```

## Applying Seccomp to Workloads

Apply the custom profile to your deployments.

```yaml
# deployment-with-seccomp.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      securityContext:
        seccompProfile:
          type: Localhost
          localhostProfile: profiles/custom-app.json
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: app
          image: myapp:latest
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
```

## Testing and Debugging

Verify seccomp is enforced and troubleshoot issues.

```bash
# Check if seccomp is active on a container
kubectl exec mypod -- cat /proc/1/status | grep Seccomp
# Seccomp: 2 means filtering mode (profile applied)
# Seccomp: 0 means disabled

# If a container crashes due to seccomp, check the audit logs
# On Talos, use talosctl to view kernel messages
talosctl dmesg --nodes <node-ip> | grep seccomp
```

## Wrapping Up

Seccomp profiles on Talos Linux provide kernel-level protection against syscall-based attacks. The RuntimeDefault profile is a great starting point that blocks the most dangerous syscalls with zero configuration effort. For critical workloads, custom profiles that only allow the specific syscalls your application needs provide the tightest security possible. Whether you manage profiles through Talos machine configuration or the Security Profile Operator, the end result is the same: containers that can only interact with the kernel in the ways you explicitly permit.
