# How to Configure Capabilities for Containers on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Linux Capabilities, Kubernetes, Container Security, Least Privilege

Description: Learn how to configure Linux capabilities for containers on Talos Linux to enforce the principle of least privilege and minimize your attack surface.

---

Linux capabilities break down the monolithic root privilege into individual units. Instead of giving a process full root access, you can grant it only the specific privileges it needs. For containers running on Talos Linux, properly configuring capabilities is essential to maintaining the security posture that the immutable OS provides. A container that drops all unnecessary capabilities is significantly harder to exploit, even if an attacker gains code execution inside it.

This guide explains Linux capabilities in the context of Kubernetes and Talos Linux, shows how to configure them, and provides practical examples for common workloads.

## What Are Linux Capabilities

Traditionally, Linux divides processes into two categories: privileged (running as root, UID 0) and unprivileged (running as any other user). Capabilities provide a finer-grained approach. Instead of granting all-or-nothing root access, you can grant specific capabilities like the ability to bind to low-numbered ports (NET_BIND_SERVICE) without granting the ability to change file ownership (CHOWN) or load kernel modules (SYS_MODULE).

There are currently about 40 capabilities defined in Linux. Here are the ones you are most likely to encounter with Kubernetes workloads:

```text
CAP_NET_BIND_SERVICE  - Bind to ports below 1024
CAP_NET_RAW           - Use raw sockets (for ping, etc.)
CAP_SYS_PTRACE        - Trace processes (for debuggers)
CAP_SYS_ADMIN         - Catch-all for many admin operations
CAP_CHOWN             - Change file ownership
CAP_DAC_OVERRIDE      - Bypass file permission checks
CAP_FOWNER            - Bypass ownership checks on files
CAP_FSETID            - Set SUID/SGID bits
CAP_KILL              - Send signals to other processes
CAP_SETGID            - Manipulate group IDs
CAP_SETUID            - Manipulate user IDs
CAP_SETPCAP           - Transfer capabilities
CAP_NET_ADMIN         - Network configuration
CAP_SYS_CHROOT        - Use chroot
CAP_AUDIT_WRITE       - Write to kernel audit log
CAP_SETFCAP           - Set file capabilities
```

## Default Capabilities in Kubernetes

By default, containers in Kubernetes run with a set of capabilities defined by the container runtime. For containerd (which Talos Linux uses), the default capabilities include:

```text
CAP_CHOWN
CAP_DAC_OVERRIDE
CAP_FSETID
CAP_FOWNER
CAP_MKNOD
CAP_NET_RAW
CAP_SETGID
CAP_SETUID
CAP_SETFCAP
CAP_SETPCAP
CAP_NET_BIND_SERVICE
CAP_SYS_CHROOT
CAP_KILL
CAP_AUDIT_WRITE
```

This is already a reduced set compared to full root, but it is still more than most applications need. The best practice is to drop ALL capabilities and add back only what your specific application requires.

## Dropping All Capabilities

The safest starting point is to drop everything.

```yaml
# minimal-capabilities.yaml
apiVersion: v1
kind: Pod
metadata:
  name: minimal-app
spec:
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        capabilities:
          drop:
            - ALL
        runAsNonRoot: true
        runAsUser: 1000
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
```

```bash
# Deploy and verify capabilities
kubectl apply -f minimal-capabilities.yaml

# Check capabilities inside the container
kubectl exec minimal-app -- cat /proc/1/status | grep Cap
# CapBnd should show 0000000000000000 (no capabilities)
```

Most applications work perfectly fine with no capabilities at all. Web servers, API services, background workers, and batch jobs typically do not need any kernel-level privileges.

## Adding Specific Capabilities

When an application genuinely needs a specific capability, add it back explicitly.

### Web Server That Binds to Port 80

```yaml
# nginx-port80.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-privileged-port
spec:
  containers:
    - name: nginx
      image: nginx:latest
      ports:
        - containerPort: 80
      securityContext:
        capabilities:
          drop:
            - ALL
          add:
            # Only add the capability to bind to ports below 1024
            - NET_BIND_SERVICE
        allowPrivilegeEscalation: false
```

### Network Diagnostic Tool

```yaml
# network-debug.yaml
apiVersion: v1
kind: Pod
metadata:
  name: network-debug
spec:
  containers:
    - name: debug
      image: nicolaka/netshoot:latest
      securityContext:
        capabilities:
          drop:
            - ALL
          add:
            # Needed for ping and raw socket operations
            - NET_RAW
            # Needed for network configuration tools
            - NET_ADMIN
        allowPrivilegeEscalation: false
```

### Application That Needs to Change File Ownership

```yaml
# init-container-chown.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  initContainers:
    - name: fix-permissions
      image: busybox:latest
      command: ["sh", "-c", "chown -R 1000:1000 /data"]
      securityContext:
        # Init container needs CHOWN to fix permissions
        capabilities:
          drop:
            - ALL
          add:
            - CHOWN
            - FOWNER
        runAsUser: 0
      volumeMounts:
        - name: data
          mountPath: /data
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        # Main container runs with no capabilities
        capabilities:
          drop:
            - ALL
        runAsUser: 1000
        runAsNonRoot: true
        allowPrivilegeEscalation: false
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: app-data
```

## Capabilities and Pod Security Standards

Kubernetes Pod Security Standards define three levels that control capabilities:

### Restricted (most secure)

Only allows dropping capabilities. No capabilities can be added except NET_BIND_SERVICE.

```bash
# Apply restricted standard to a namespace
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted
```

### Baseline (moderate)

Allows the default set of capabilities. Blocks adding dangerous capabilities like SYS_ADMIN, NET_RAW (in some implementations), and SYS_PTRACE.

```bash
# Apply baseline standard
kubectl label namespace staging \
  pod-security.kubernetes.io/enforce=baseline
```

### Privileged (unrestricted)

Allows any capabilities, including full privileged mode.

## Auditing Capabilities Across Your Cluster

Regularly check what capabilities your workloads are using.

```bash
# Find pods that have not dropped all capabilities
kubectl get pods -A -o json | jq '
  .items[] |
  select(.spec.containers[].securityContext.capabilities.drop == null or
    (.spec.containers[].securityContext.capabilities.drop |
    map(ascii_downcase) | contains(["all"]) | not)) |
  {namespace: .metadata.namespace, name: .metadata.name}'

# Find pods with added capabilities
kubectl get pods -A -o json | jq '
  .items[] |
  select(.spec.containers[].securityContext.capabilities.add != null) |
  {
    namespace: .metadata.namespace,
    name: .metadata.name,
    added_caps: [.spec.containers[].securityContext.capabilities.add[]?]
  }'
```

## Common Mistakes to Avoid

### Adding SYS_ADMIN

CAP_SYS_ADMIN is a catch-all capability that grants a wide range of privileges. It is almost as powerful as running as root. Never add it unless absolutely necessary, and if you think you need it, look for a more specific capability first.

### Not Dropping ALL First

If you only add capabilities without dropping ALL first, the container retains all the default capabilities plus any you added. Always drop ALL, then add back only what you need.

```yaml
# Wrong - retains all defaults plus NET_ADMIN
securityContext:
  capabilities:
    add:
      - NET_ADMIN

# Correct - only has NET_ADMIN
securityContext:
  capabilities:
    drop:
      - ALL
    add:
      - NET_ADMIN
```

### Forgetting allowPrivilegeEscalation

Even with limited capabilities, a process can potentially gain more privileges through setuid binaries. Always set allowPrivilegeEscalation to false.

```yaml
securityContext:
  capabilities:
    drop:
      - ALL
  # This prevents gaining capabilities through setuid
  allowPrivilegeEscalation: false
```

## Verifying Capabilities in Running Containers

```bash
# Decode capability bitmasks
kubectl exec mypod -- cat /proc/1/status | grep Cap

# The output will show hex values:
# CapInh: 0000000000000000 (inherited)
# CapPrm: 0000000000000000 (permitted)
# CapEff: 0000000000000000 (effective)
# CapBnd: 0000000000000000 (bounding set)
# CapAmb: 0000000000000000 (ambient)

# All zeros means no capabilities - exactly what we want
```

## Wrapping Up

Configuring Linux capabilities properly is one of the most impactful security measures you can take on Talos Linux. By dropping all capabilities and adding back only the specific ones each workload needs, you follow the principle of least privilege at the kernel level. Most applications need zero capabilities, and even those that need special access usually require just one or two. Combined with Talos Linux's immutable OS design, properly scoped capabilities create a hardened environment where even a compromised container has extremely limited ability to cause damage.
