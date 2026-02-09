# How to Configure Debug Containers with Privileged Security Context for System Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Debugging, Privileged Containers, Troubleshooting

Description: Learn how to configure debug containers with privileged security contexts for deep system-level debugging while understanding the security implications.

---

Sometimes debugging Kubernetes issues requires accessing host resources, kernel features, or system devices that normal containers cannot reach. Privileged containers provide this access, but must be used carefully due to their security implications.

## Understanding Privileged Containers

A privileged container runs with capabilities similar to processes running on the host. It bypasses many security restrictions and has access to all devices. This makes it powerful for debugging but dangerous in production.

Key differences from normal containers:

- Access to all host devices (/dev/*)
- Can load kernel modules
- Can modify system settings
- Bypass AppArmor, SELinux, and seccomp restrictions
- Access host network namespace
- Mount host file systems

## Creating a Basic Privileged Debug Container

Create a privileged pod using kubectl run:

```bash
# Quick privileged debug pod
kubectl run debug-priv --image=nicolaka/netshoot -it --rm \
  --overrides='{"spec":{"containers":[{"name":"debug-priv","image":"nicolaka/netshoot","stdin":true,"tty":true,"securityContext":{"privileged":true}}]}}'
```

Or use a YAML manifest:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-privileged
  namespace: default
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ["/bin/bash"]
    args: ["-c", "sleep 3600"]
    securityContext:
      privileged: true
  hostNetwork: true
  hostPID: true
  hostIPC: true
```

Apply and access it:

```bash
kubectl apply -f debug-privileged.yaml
kubectl exec -it debug-privileged -- /bin/bash
```

## Security Context Options

Understanding security context fields for debugging:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-advanced
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    securityContext:
      # Grant full privileges
      privileged: true

      # Or grant specific capabilities instead
      capabilities:
        add:
        - SYS_ADMIN      # Mount operations, many system admin operations
        - NET_ADMIN      # Network operations, iptables
        - SYS_PTRACE     # Trace processes, debug
        - SYS_MODULE     # Load kernel modules
        - NET_RAW        # Raw sockets
        - SYS_CHROOT     # Use chroot

      # Allow privilege escalation
      allowPrivilegeEscalation: true

      # Run as specific user (0 = root)
      runAsUser: 0
      runAsGroup: 0

      # Disable read-only root filesystem
      readOnlyRootFilesystem: false

    volumeMounts:
    - name: host-root
      mountPath: /host
      readOnly: false

  # Host namespace access
  hostNetwork: true
  hostPID: true
  hostIPC: true

  volumes:
  - name: host-root
    hostPath:
      path: /
      type: Directory
```

## Specific Capabilities for Debugging

Grant only needed capabilities instead of full privilege:

```yaml
# Network debugging
apiVersion: v1
kind: Pod
metadata:
  name: debug-network
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    securityContext:
      capabilities:
        add:
        - NET_ADMIN      # iptables, routing
        - NET_RAW        # tcpdump, packet capture
    hostNetwork: true
```

```yaml
# System tracing
apiVersion: v1
kind: Pod
metadata:
  name: debug-trace
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    securityContext:
      capabilities:
        add:
        - SYS_PTRACE     # strace, gdb
        - SYS_ADMIN      # perf, bpf tools
    hostPID: true
```

```yaml
# File system access
apiVersion: v1
kind: Pod
metadata:
  name: debug-filesystem
spec:
  containers:
  - name: debug
    image: ubuntu:22.04
    command: ["/bin/bash", "-c", "sleep 3600"]
    securityContext:
      capabilities:
        add:
        - SYS_ADMIN      # Mount operations
        - DAC_OVERRIDE   # Bypass file permissions
      runAsUser: 0
    volumeMounts:
    - name: host-root
      mountPath: /host
  volumes:
  - name: host-root
    hostPath:
      path: /
```

## Accessing Host Resources

Once in a privileged container, access host resources:

```bash
# Inside privileged container

# View all host devices
ls -la /dev/

# Access host file system (if mounted)
ls /host/var/log
ls /host/etc

# View host processes (if hostPID: true)
ps aux

# Check host network (if hostNetwork: true)
ip addr show
ip route show
iptables -L -n -v

# Load kernel module
modprobe <module-name>
lsmod

# Access hardware info
lspci
lsblk
dmidecode
```

## Debugging Node Issues

Use privileged containers to debug node-level problems:

```bash
# Create node debugger
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: node-debugger
spec:
  nodeName: worker-node-1  # Specify target node
  containers:
  - name: debug
    image: ubuntu:22.04
    command: ["/bin/bash"]
    args: ["-c", "apt-get update && apt-get install -y procps iproute2 && sleep 3600"]
    securityContext:
      privileged: true
    volumeMounts:
    - name: host
      mountPath: /host
  hostNetwork: true
  hostPID: true
  hostIPC: true
  volumes:
  - name: host
    hostPath:
      path: /
  restartPolicy: Never
EOF

# Access and debug
kubectl exec -it node-debugger -- /bin/bash

# Check disk usage on node
df -h /host/var/lib/containerd

# Check for full disk issues
du -sh /host/var/lib/containerd/* | sort -h

# Inspect node logs
tail -100 /host/var/log/syslog
journalctl --no-pager -u kubelet | tail -50
```

## Debugging Container Runtime

Access containerd or Docker from inside pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: runtime-debug
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    securityContext:
      privileged: true
    volumeMounts:
    - name: containerd-sock
      mountPath: /run/containerd/containerd.sock
    - name: cri
      mountPath: /var/lib/containerd
  volumes:
  - name: containerd-sock
    hostPath:
      path: /run/containerd/containerd.sock
  - name: cri
    hostPath:
      path: /var/lib/containerd
```

Use crictl inside the debug pod:

```bash
kubectl exec -it runtime-debug -- /bin/bash

# Set crictl endpoint
export CONTAINER_RUNTIME_ENDPOINT=unix:///run/containerd/containerd.sock

# List containers
crictl ps

# Inspect containers
crictl inspect <container-id>

# View images
crictl images
```

## Network Troubleshooting

Debug network issues with privileged access:

```bash
# Create network debug pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: netdebug-priv
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    securityContext:
      capabilities:
        add:
        - NET_ADMIN
        - NET_RAW
    hostNetwork: true
EOF

# Exec into it
kubectl exec -it netdebug-priv -- /bin/bash

# Capture packets
tcpdump -i any -w /tmp/capture.pcap

# Analyze iptables
iptables -L -n -v --line-numbers
iptables -t nat -L -n -v

# Check routing
ip route show
ip rule show

# Test conntrack
conntrack -L | grep <ip-address>
```

## Kernel Parameter Debugging

Modify kernel parameters for testing:

```bash
# Inside privileged container

# View current settings
sysctl -a | grep net.ipv4

# Modify temporarily
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.core.somaxconn=4096

# Check loaded modules
lsmod | grep ip_tables

# Load module if needed
modprobe ip_tables
modprobe nf_conntrack
```

## Using kubectl debug with Privileged Mode

Kubernetes 1.18+ kubectl debug can create privileged debug containers:

```bash
# Debug existing pod with privileged ephemeral container
kubectl debug -it myapp-pod --image=nicolaka/netshoot \
  --target=myapp-container -- /bin/bash

# Debug node with privileged access
kubectl debug node/worker-node-1 -it --image=ubuntu

# Inside node debug session
chroot /host
ps aux
df -h
```

For older clusters without ephemeral containers:

```bash
# Create privileged debug pod on same node
NODE=$(kubectl get pod myapp-pod -o jsonpath='{.spec.nodeName}')

kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: debug-node-$(echo $NODE | tr '.' '-')
spec:
  nodeName: $NODE
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ["/bin/bash", "-c", "sleep 3600"]
    securityContext:
      privileged: true
    volumeMounts:
    - name: host
      mountPath: /host
  hostNetwork: true
  hostPID: true
  volumes:
  - name: host
    hostPath:
      path: /
EOF
```

## Security Considerations

Privileged containers bypass security mechanisms. Use them carefully:

1. **Never run privileged containers in production workloads**
2. **Limit to specific namespaces** - Create a debug namespace
3. **Use RBAC** - Restrict who can create privileged pods
4. **Audit access** - Log all privileged pod creation
5. **Time-limited** - Delete debug pods after use
6. **Prefer specific capabilities** over full privilege when possible

Create RBAC policy to control privileged pod creation:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted-debug
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'

---
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: privileged-debug
spec:
  privileged: true
  allowPrivilegeEscalation: true
  allowedCapabilities:
    - '*'
  volumes:
    - '*'
  hostNetwork: true
  hostPorts:
    - min: 0
      max: 65535
  hostIPC: true
  hostPID: true
  runAsUser:
    rule: 'RunAsAny'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Cleanup

Always clean up debug pods:

```bash
# Delete specific pod
kubectl delete pod debug-privileged

# Delete all debug pods
kubectl delete pods -l purpose=debug

# Set up automatic cleanup with TTL
apiVersion: v1
kind: Pod
metadata:
  name: debug-temp
spec:
  ttlSecondsAfterFinished: 300  # Auto-delete after 5 minutes
  containers:
  - name: debug
    image: nicolaka/netshoot
    securityContext:
      privileged: true
```

## Conclusion

Privileged containers are powerful tools for deep system-level debugging in Kubernetes. They provide access to host resources, kernel features, and devices that normal containers cannot reach. However, this power comes with significant security risks.

Use privileged containers only when necessary, prefer specific capabilities over full privilege, implement proper RBAC controls, and always clean up debug pods after use. For most debugging scenarios, ephemeral containers with appropriate capabilities provide sufficient access without the full security implications of privileged mode.
