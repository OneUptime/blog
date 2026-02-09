# How to Use cgroups v2 Features for Better Resource Isolation in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, cgroups, Resource Management

Description: Discover how to leverage cgroups v2 features in Kubernetes for improved resource isolation, better memory management, and enhanced container security with unified hierarchy and advanced controls.

---

Control groups version 2 (cgroups v2) represents a major redesign of Linux's resource management subsystem. Kubernetes clusters running on modern distributions can leverage cgroups v2 for more accurate resource accounting, better isolation between containers, and improved performance. Understanding how to enable and configure cgroups v2 gives you finer control over resource allocation and protection.

This guide walks through enabling cgroups v2 on Kubernetes nodes and using its advanced features to improve container isolation and resource management.

## Understanding cgroups v2 Architecture

Unlike cgroups v1, which used multiple independent hierarchies for different resource types (cpu, memory, io), cgroups v2 implements a unified hierarchy. All resources are managed through a single tree structure, simplifying management and providing better consistency.

Key improvements in cgroups v2:

- **Unified hierarchy**: Single tree for all resource controllers
- **Pressure Stall Information (PSI)**: Real-time resource pressure metrics
- **Better memory management**: More accurate accounting and OOM handling
- **I/O control**: Improved block I/O isolation and buffered I/O control
- **Thread-level control**: Ability to manage individual threads, not just processes

## Checking cgroups Version

First, verify whether your system uses cgroups v1 or v2:

```bash
# Check cgroups version
mount | grep cgroup

# Output for cgroups v1:
# cgroup on /sys/fs/cgroup/cpu type cgroup (rw,nosuid,nodev,noexec,relatime,cpu)
# cgroup on /sys/fs/cgroup/memory type cgroup (rw,nosuid,nodev,noexec,relatime,memory)

# Output for cgroups v2:
# cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime)

# Alternative check
stat -fc %T /sys/fs/cgroup/

# Output "cgroup2fs" means v2 is in use
# Output "tmpfs" means v1 is in use
```

## Enabling cgroups v2 on Ubuntu/Debian

Modern distributions (Ubuntu 22.04+, Debian 11+) default to cgroups v2. For older systems, enable it manually:

```bash
# Edit GRUB configuration
sudo vim /etc/default/grub

# Add or modify the GRUB_CMDLINE_LINUX line
GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=1"

# Update GRUB
sudo update-grub

# Reboot to apply changes
sudo reboot

# After reboot, verify cgroups v2 is active
stat -fc %T /sys/fs/cgroup/
```

## Configuring containerd for cgroups v2

Kubernetes uses containerd as the container runtime. Configure it to use cgroups v2:

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true

[plugins."io.containerd.grpc.v1.cri"]
  # Enable cgroup v2 support
  enable_cdi = true
```

Restart containerd to apply changes:

```bash
sudo systemctl restart containerd
sudo systemctl status containerd
```

## Configuring kubelet for cgroups v2

Update your kubelet configuration to use cgroups v2:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
cgroupsPerQOS: true
enforceNodeAllocatable:
  - pods
featureGates:
  CgroupsV2: true
  MemoryQoS: true
```

The `MemoryQoS` feature gate enables cgroups v2-specific memory quality of service features. Restart kubelet:

```bash
sudo systemctl restart kubelet
sudo systemctl status kubelet
```

## Leveraging Pressure Stall Information (PSI)

PSI provides real-time metrics about resource contention. cgroups v2 exposes PSI metrics for CPU, memory, and I/O:

```bash
# View memory pressure for a pod's cgroup
POD_CGROUP=$(crictl inspect <container-id> | jq -r '.info.runtimeSpec.linux.cgroupsPath')
cat /sys/fs/cgroup/$POD_CGROUP/memory.pressure

# Output shows time spent waiting for memory:
# some avg10=0.00 avg60=0.00 avg300=0.00 total=12345
# full avg10=0.00 avg60=0.00 avg300=0.00 total=6789
```

Integrate PSI into your monitoring:

```yaml
# psi-exporter.yaml - Deploy Prometheus exporter for PSI metrics
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: psi-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: psi-exporter
  template:
    metadata:
      labels:
        app: psi-exporter
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: exporter
        image: davidcassany/psi-exporter:latest
        securityContext:
          privileged: true
        volumeMounts:
        - name: cgroup
          mountPath: /sys/fs/cgroup
          readOnly: true
      volumes:
      - name: cgroup
        hostPath:
          path: /sys/fs/cgroup
```

## Using Memory Protection and Throttling

cgroups v2 provides better memory controls through memory.min, memory.low, and memory.high:

```yaml
# pod-with-memory-protection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: protected-app
  annotations:
    # These translate to cgroup v2 memory controls
    io.kubernetes.cri.memory-swap-max: "2Gi"
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        memory: "1Gi"  # Sets memory.min
      limits:
        memory: "2Gi"  # Sets memory.max
```

The kubelet maps resource requests and limits to cgroups v2 settings:

- **memory.min**: Protected memory (based on requests)
- **memory.low**: Best-effort protected memory
- **memory.high**: Throttling threshold
- **memory.max**: Hard limit (based on limits)

## Configuring I/O Priority and Limits

cgroups v2 provides unified I/O control through io.weight and io.max:

```yaml
# pod-with-io-priority.yaml
apiVersion: v1
kind: Pod
metadata:
  name: io-intensive-app
spec:
  containers:
  - name: database
    image: postgres:15
    resources:
      requests:
        ephemeral-storage: "10Gi"
      limits:
        ephemeral-storage: "20Gi"
```

For more granular control, configure I/O weights in pod annotations (requires cluster support):

```yaml
metadata:
  annotations:
    io.kubernetes.cri.io-weight: "500"  # Range: 1-10000, default 100
```

## Monitoring cgroups v2 Metrics

Access detailed cgroup v2 metrics for containers:

```bash
# Find container's cgroup path
CONTAINER_ID=$(crictl ps --name myapp -q)
CGROUP_PATH=$(crictl inspect $CONTAINER_ID | jq -r '.info.runtimeSpec.linux.cgroupsPath')

# View comprehensive memory stats
cat /sys/fs/cgroup/$CGROUP_PATH/memory.stat

# Key metrics include:
# anon - Anonymous memory (not file-backed)
# file - Page cache and file-backed memory
# kernel_stack - Kernel stack memory
# slab - Kernel data structures
# sock - Socket buffer memory
# shmem - Shared memory
# file_mapped - Memory-mapped files
# pgactivate - Pages activated
# pgdeactivate - Pages deactivated
# pgfault - Page faults
# pgmajfault - Major page faults

# View current memory usage
cat /sys/fs/cgroup/$CGROUP_PATH/memory.current

# View memory events (OOM kills, etc.)
cat /sys/fs/cgroup/$CGROUP_PATH/memory.events
```

## Implementing CPU Isolation

cgroups v2 provides improved CPU isolation through cpuset and cpu.weight:

```yaml
# cpu-isolated-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: cpu-isolated-app
spec:
  containers:
  - name: compute
    image: compute-app:latest
    resources:
      requests:
        cpu: "2000m"
      limits:
        cpu: "4000m"
  # Requires kubelet cpuManagerPolicy: static
  # and Guaranteed QoS (requests == limits)
```

Configure kubelet for CPU isolation:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
cpuManagerPolicy: static
cpuManagerReconcilePeriod: 10s
reservedSystemCPUs: "0-1"  # Reserve CPUs for system/kubelet
```

## Setting Up Pod-Level QoS Classes

cgroups v2 enhances QoS class implementation:

```yaml
# guaranteed-qos-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
  - name: app
    image: critical-app:latest
    resources:
      requests:
        memory: "4Gi"
        cpu: "2000m"
      limits:
        memory: "4Gi"
        cpu: "2000m"
---
# burstable-qos-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod
spec:
  containers:
  - name: app
    image: normal-app:latest
    resources:
      requests:
        memory: "2Gi"
        cpu: "1000m"
      limits:
        memory: "4Gi"
        cpu: "2000m"
```

With cgroups v2, QoS classes map to different memory.min values, providing better protection for Guaranteed pods during memory pressure.

## Debugging cgroups v2 Issues

When troubleshooting resource issues, examine cgroup metrics:

```bash
# Script to show all cgroup v2 metrics for a pod
#!/bin/bash
POD_NAME=$1
NAMESPACE=${2:-default}

# Get container ID
CONTAINER_ID=$(kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0].containerID}' | cut -d'/' -f3)

# Get cgroup path
CGROUP_PATH=$(crictl inspect $CONTAINER_ID | jq -r '.info.runtimeSpec.linux.cgroupsPath')

echo "=== Memory Stats ==="
cat /sys/fs/cgroup/$CGROUP_PATH/memory.stat

echo -e "\n=== Memory Current ==="
cat /sys/fs/cgroup/$CGROUP_PATH/memory.current

echo -e "\n=== Memory Pressure ==="
cat /sys/fs/cgroup/$CGROUP_PATH/memory.pressure

echo -e "\n=== CPU Stats ==="
cat /sys/fs/cgroup/$CGROUP_PATH/cpu.stat

echo -e "\n=== I/O Stats ==="
cat /sys/fs/cgroup/$CGROUP_PATH/io.stat
```

Save this as `cgroup-debug.sh` and run:

```bash
chmod +x cgroup-debug.sh
./cgroup-debug.sh my-pod-name default
```

## Migration Considerations

When migrating from cgroups v1 to v2, be aware of these changes:

1. **Memory accounting**: More accurate but shows higher usage
2. **OOM behavior**: OOM killer operates differently with memory.min protection
3. **CPU shares**: Converted to cpu.weight (shares/1024 * 10000)
4. **I/O throttling**: Different syntax for io.max vs blkio.throttle

Test thoroughly in staging before migrating production clusters.

cgroups v2 provides superior resource isolation and more accurate accounting compared to v1. Enable it on modern Kubernetes clusters to benefit from PSI metrics, better memory protection, and improved I/O control. Monitor the cgroup v2 metrics to gain deeper insights into container resource usage and optimize your cluster's resource allocation.
