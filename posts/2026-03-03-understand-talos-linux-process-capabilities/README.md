# How to Understand Talos Linux Process Capabilities

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Security, Linux Capabilities, Process Isolation, Kubernetes

Description: Learn how Talos Linux restricts process capabilities to minimize the attack surface and protect your Kubernetes cluster.

---

Linux capabilities are a way to divide the traditional all-or-nothing root privilege into smaller, more granular permissions. Instead of giving a process full root access, you can give it only the specific capabilities it needs. Talos Linux takes this concept seriously, applying strict capability restrictions to every process on the system.

Understanding how Talos handles capabilities helps you appreciate the security model and troubleshoot issues where a process might be denied an operation it needs.

## A Quick Primer on Linux Capabilities

In traditional Linux, the root user (UID 0) can do anything: bind to privileged ports, load kernel modules, change file ownership, override file permissions, manipulate the network stack. This is convenient but dangerous. If any root process is compromised, the attacker has full control.

Linux capabilities split root privileges into about 40 distinct capabilities. Some common ones include:

- **CAP_NET_BIND_SERVICE** - Bind to ports below 1024
- **CAP_NET_ADMIN** - Configure network interfaces, routing, firewalls
- **CAP_SYS_ADMIN** - A broad capability that covers many system operations
- **CAP_SYS_PTRACE** - Trace and debug other processes
- **CAP_DAC_OVERRIDE** - Bypass file permission checks
- **CAP_CHOWN** - Change file ownership
- **CAP_NET_RAW** - Use raw sockets (needed for ping, tcpdump)
- **CAP_SYS_MODULE** - Load and unload kernel modules

A process can have a subset of these capabilities, getting only the privileges it actually needs. This is called the principle of least privilege.

## How Talos Linux Uses Capabilities

Talos Linux runs with a minimal set of capabilities for each process. The init system (machined) starts with full capabilities because it needs to set up the system, but every other process gets only what it requires.

Since Talos has no shell and no way to run arbitrary processes on the host, the capability restrictions mainly affect three categories: Talos system services, containerd and its children, and Kubernetes pods.

### System Services

Talos system services like apid, trustd, and networkd run with restricted capability sets. Each service gets the minimum capabilities needed for its function.

For example, networkd needs CAP_NET_ADMIN to configure network interfaces but does not need CAP_SYS_MODULE or CAP_DAC_OVERRIDE. The Talos developers have carefully audited each service to determine its required capabilities.

```bash
# Check running processes and their states
talosctl -n 10.0.0.11 processes

# View detailed process information
talosctl -n 10.0.0.11 processes -o json
```

### Container Runtime

containerd runs with a controlled set of capabilities. The containers it spawns (both system containers and Kubernetes pods) inherit a restricted capability set by default.

Talos configures containerd to drop unnecessary capabilities from containers. The default capability set for Kubernetes pods follows the Kubernetes defaults, which include a reasonable baseline.

## Kubernetes Pod Capabilities

When pods run on a Talos node, their capability set is determined by several factors: the container runtime defaults, the pod security context, and any PodSecurityStandards or admission policies in place.

The default capabilities for a container in Kubernetes include:

```yaml
# Default capabilities granted to containers
# These are the Kubernetes defaults, not Talos-specific
defaultCapabilities:
  - AUDIT_WRITE
  - CHOWN
  - DAC_OVERRIDE
  - FOWNER
  - FSETID
  - KILL
  - MKNOD
  - NET_BIND_SERVICE
  - NET_RAW
  - SETFCAP
  - SETGID
  - SETPCAP
  - SETUID
  - SYS_CHROOT
```

You can modify capabilities in your pod specs to add or drop specific ones.

```yaml
# Pod with restricted capabilities
apiVersion: v1
kind: Pod
metadata:
  name: restricted-app
spec:
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      capabilities:
        drop:
          - ALL  # Drop everything first
        add:
          - NET_BIND_SERVICE  # Then add back only what is needed
      runAsNonRoot: true
      readOnlyRootFilesystem: true
```

## The Talos Security Boundary

On a traditional Linux system, a container escape gives an attacker access to a full Linux environment with potentially many capabilities. On Talos, the situation is quite different.

Even if an attacker escapes a container, they land on a host with:

- No shell to execute commands
- A read-only root filesystem
- No development tools or scripting languages
- Restricted process capabilities
- No SSH daemon or other remote access services

The lack of a shell is particularly important. Many container escape techniques rely on executing commands on the host. Without a shell binary, there is nothing to execute.

```bash
# Compare what is available on Talos vs traditional Linux
# Traditional Linux host after container escape:
# - /bin/bash, /bin/sh available
# - Can install tools with apt/yum
# - Can access host network namespace
# - Can potentially escalate privileges

# Talos host after container escape:
# - No shell binaries
# - Read-only root filesystem (SquashFS)
# - No package manager
# - Heavily restricted capabilities
```

## Capability Bounding Set

Linux has a concept called the capability bounding set, which is an upper limit on the capabilities that any process can acquire. Even if a process is setuid root, it cannot gain capabilities outside the bounding set.

Talos configures a restricted bounding set at boot time. This means that even if there were a privilege escalation vulnerability, the attacker would still be limited by the bounding set.

The bounding set is inherited by all child processes, including containerd and every pod it runs. This creates a hard ceiling on what any process on the system can do.

## Secure Computing Mode (seccomp)

In addition to capabilities, Talos uses seccomp (secure computing mode) to restrict which system calls processes can make. seccomp is complementary to capabilities. While capabilities control which privileged operations are allowed, seccomp controls which system calls can be invoked at all.

Kubernetes applies a default seccomp profile that blocks dangerous system calls. On Talos, you can enforce this at the cluster level.

```yaml
# Pod with seccomp profile
apiVersion: v1
kind: Pod
metadata:
  name: seccomp-app
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
```

## Pod Security Standards

Kubernetes defines three Pod Security Standards that control capability levels: Privileged, Baseline, and Restricted.

On Talos clusters, you should enforce at least the Baseline standard and aim for Restricted where possible.

```yaml
# Enforce Pod Security Standards at the namespace level
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

The Restricted standard drops all capabilities, prevents privilege escalation, requires non-root users, and mandates a read-only root filesystem. This aligns well with the Talos security model.

```bash
# Check which namespaces have Pod Security Standards enforced
kubectl get namespaces -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.labels.pod-security\.kubernetes\.io/enforce}{"\n"}{end}'
```

## Privileged Containers and When They Are Needed

Some workloads legitimately need elevated capabilities. Storage drivers like Longhorn, network plugins like Cilium, and monitoring agents like node-exporter may need privileged access or specific capabilities.

On Talos, running a privileged container is still possible but should be limited to trusted workloads.

```yaml
# Workload that needs specific capabilities (example: network plugin)
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cilium
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: cilium-agent
        securityContext:
          capabilities:
            add:
              - NET_ADMIN
              - NET_RAW
              - SYS_MODULE
              - SYS_ADMIN  # Required for BPF operations
          privileged: false  # Avoid full privilege when possible
```

## Auditing Capabilities in Your Cluster

You should regularly audit what capabilities your pods are running with. Unexpected capabilities are a sign that a workload has more privilege than it needs.

```bash
# Find pods running with privileged security context
kubectl get pods --all-namespaces -o json | \
  jq '.items[] | select(.spec.containers[].securityContext.privileged == true) | .metadata.name'

# Find pods with specific capabilities
kubectl get pods --all-namespaces -o json | \
  jq '.items[] | select(.spec.containers[].securityContext.capabilities.add != null) | {name: .metadata.name, caps: .spec.containers[].securityContext.capabilities.add}'
```

## Conclusion

Talos Linux applies the principle of least privilege throughout the system. Every process runs with the minimum set of capabilities it needs, the bounding set limits what any process can acquire, and seccomp further restricts available system calls. Combined with the read-only filesystem and absence of shell access, this creates multiple layers of defense. For your Kubernetes workloads, follow the same principle: drop all capabilities by default and add back only what each container actually needs. This defense-in-depth approach significantly reduces the impact of any security breach.
