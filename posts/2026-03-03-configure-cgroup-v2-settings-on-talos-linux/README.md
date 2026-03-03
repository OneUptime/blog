# How to Configure Cgroup v2 Settings on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cgroup v2, Kubernetes, Linux Kernel, Container Runtime, Resource Management

Description: Detailed guide to configuring cgroup v2 settings on Talos Linux for optimal container resource management and workload isolation.

---

Cgroup v2 is the modern version of the Linux control groups subsystem, and Talos Linux uses it by default. Compared to cgroup v1, the v2 implementation provides a unified hierarchy, improved resource distribution, and better support for features like pressure stall information (PSI). For Kubernetes workloads, cgroup v2 delivers more predictable resource isolation and enables newer features like memory QoS.

This guide covers how to configure cgroup v2 settings on Talos Linux to get the best resource management for your Kubernetes workloads.

## Cgroup v2 vs Cgroup v1

Before diving into configuration, it helps to understand what changed:

**Cgroup v1 (legacy)**
- Multiple hierarchies (one per controller: cpu, memory, io, etc.)
- Controllers can be attached to different hierarchies
- Complex and sometimes inconsistent behavior
- Each container might have different cgroup paths for different resources

**Cgroup v2 (unified)**
- Single unified hierarchy for all controllers
- Simpler, more predictable behavior
- Pressure Stall Information (PSI) for monitoring resource contention
- Memory QoS with guaranteed minimum memory
- IO cost model for better IO isolation
- eBPF-based device control

Talos Linux ships with cgroup v2 enabled by default, so there is no migration step needed.

## Verifying Cgroup v2 on Talos

First, confirm your Talos nodes are running cgroup v2:

```bash
# Check cgroup version on a Talos node
talosctl read /proc/filesystems --nodes <node-ip> | grep cgroup

# You should see:
# nodev  cgroup2

# Verify the unified hierarchy is mounted
talosctl read /proc/mounts --nodes <node-ip> | grep cgroup
# Expected: cgroup2 /sys/fs/cgroup cgroup2 rw,nosuid,nodev,noexec,...
```

## Configuring Kubelet Cgroup Settings

The kubelet on Talos Linux needs proper cgroup configuration to work with cgroup v2:

```yaml
# talos-cgroup-config.yaml
# Kubelet cgroup v2 configuration
machine:
  kubelet:
    extraArgs:
      # Use systemd cgroup driver (required for cgroup v2)
      cgroup-driver: "systemd"
      # Set the kubelet's own cgroup
      kubelet-cgroups: "/system.slice/kubelet.service"
      # Set the runtime cgroup
      runtime-cgroups: "/system.slice/containerd.service"
    extraConfig:
      # Enable memory manager for guaranteed memory QoS
      memoryManagerPolicy: "Static"
      # Reserve memory for system components
      reservedMemory:
        - numaNode: 0
          limits:
            memory: "1Gi"
      # Enable CPU manager for dedicated CPU allocation
      cpuManagerPolicy: "static"
      cpuManagerReconcilePeriod: "10s"
      # Topology manager for NUMA-aware scheduling
      topologyManagerPolicy: "best-effort"
```

Apply the configuration:

```bash
# Apply cgroup configuration to worker nodes
talosctl apply-config --nodes <worker-ips> --patch @talos-cgroup-config.yaml
```

## Configuring System Reserved Resources

Properly reserving resources for system components ensures Kubernetes workloads do not starve the node:

```yaml
# talos-system-reserved.yaml
# Reserve resources for system and Kubernetes components
machine:
  kubelet:
    extraArgs:
      # Resources reserved for system daemons
      system-reserved: "cpu=250m,memory=512Mi,ephemeral-storage=1Gi"
      # Cgroup for system reserved resources
      system-reserved-cgroup: "/system.slice"
      # Resources reserved for Kubernetes components
      kube-reserved: "cpu=250m,memory=512Mi,ephemeral-storage=1Gi"
      # Cgroup for kube reserved resources
      kube-reserved-cgroup: "/system.slice/kubelet.service"
      # Enforce resource limits using cgroup enforcement
      enforce-node-allocatable: "pods,system-reserved,kube-reserved"
```

This ensures that even under heavy pod load, the kubelet and containerd always have enough resources to function.

## Configuring Memory QoS with Cgroup v2

Cgroup v2 introduces memory.min and memory.low, which provide guaranteed minimum memory allocation:

```yaml
# memory-qos-config.yaml
# Enable memory QoS in kubelet configuration
machine:
  kubelet:
    extraConfig:
      # Enable memory QoS feature
      memoryThrottlingFactor: 0.9
      # This sets memory.high to 90% of memory.max
      # Providing a soft limit before the hard OOM kill
```

With memory QoS enabled, the cgroup hierarchy uses these controls:

```
memory.min  - Guaranteed minimum memory (from resource requests)
memory.low  - Best-effort memory protection
memory.high - Throttling threshold (soft limit)
memory.max  - Hard limit (OOM kill if exceeded)
```

This means pods with memory requests get a guaranteed allocation through `memory.min`, while pods without requests may have their memory reclaimed under pressure.

## Configuring CPU Controller Settings

The cgroup v2 CPU controller uses weights instead of shares:

```yaml
# Kubernetes maps resource requests to CPU weights
# Formula: weight = max(2, min(10000, ceil(cpuRequest * 1024 / 1000)))

# Example for a pod with 500m CPU request:
# weight = ceil(0.5 * 1024 / 1000) * 1024 = 512

# Pod with 2 CPU request:
# weight = 2048
```

To configure CPU bandwidth limits on the node level:

```yaml
# talos-cpu-config.yaml
# CPU cgroup settings
machine:
  kubelet:
    extraArgs:
      # Enable CPU CFS quota enforcement
      cpu-cfs-quota: "true"
      # Period for CFS quota (default 100ms)
      cpu-cfs-quota-period: "100ms"
    extraConfig:
      # Static CPU policy for guaranteed pods
      cpuManagerPolicy: "static"
      # Options for static policy
      cpuManagerPolicyOptions:
        full-pcpus-only: "true"
        distribute-cpus-across-numa: "true"
```

## Configuring IO Controller Settings

Cgroup v2 provides better IO isolation through the IO controller:

```yaml
# talos-io-config.yaml
# IO weight configuration through container runtime
machine:
  kubelet:
    extraConfig:
      # Enable IO weight-based scheduling
      # Higher weight = higher priority for IO
      featureGates:
        KubeletCgroupDriverSystemd: true
```

You can set IO weights per pod through annotations (support depends on the container runtime version):

```yaml
# pod-with-io-priority.yaml
# Pod with custom IO weight
apiVersion: v1
kind: Pod
metadata:
  name: io-intensive-app
  annotations:
    io.kubernetes.cri/blkio-weight: "500"
spec:
  containers:
    - name: app
      image: my-app:latest
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
```

## Enabling Pressure Stall Information (PSI)

PSI is a cgroup v2 feature that provides real-time data about resource contention:

```bash
# Check if PSI is available on Talos nodes
talosctl read /proc/pressure/cpu --nodes <node-ip>
talosctl read /proc/pressure/memory --nodes <node-ip>
talosctl read /proc/pressure/io --nodes <node-ip>

# Output format:
# some avg10=0.00 avg60=0.00 avg300=0.00 total=0
# full avg10=0.00 avg60=0.00 avg300=0.00 total=0
```

PSI metrics can be collected by Prometheus:

```yaml
# psi-monitoring-rules.yaml
# Collect PSI metrics for resource contention monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: psi-monitoring
  namespace: monitoring
spec:
  groups:
    - name: psi.monitoring
      rules:
        - alert: HighCPUPressure
          expr: >
            node_pressure_cpu_waiting_seconds_total > 0.25
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High CPU pressure on {{ $labels.instance }}"

        - alert: HighMemoryPressure
          expr: >
            node_pressure_memory_waiting_seconds_total > 0.10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High memory pressure on {{ $labels.instance }}"

        - alert: HighIOPressure
          expr: >
            node_pressure_io_waiting_seconds_total > 0.20
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High IO pressure on {{ $labels.instance }}"
```

## Delegating Cgroup Controllers to Containers

Some workloads need to manage their own cgroups (like nested containers or systemd-based containers). Configure delegation:

```yaml
# talos-cgroup-delegation.yaml
# Allow specific containers to manage sub-cgroups
machine:
  kubelet:
    extraArgs:
      # Enable cgroup delegation for specific containers
      feature-gates: "UserNamespacesSupport=true"
```

## Tuning the OOM Killer with Cgroup v2

Cgroup v2 provides the `memory.oom.group` control that kills all processes in a cgroup when OOM occurs, rather than picking individual processes:

```yaml
# This is handled automatically by the kubelet
# When a pod exceeds its memory limit, all containers in the pod
# are killed together, ensuring consistent behavior

# You can tune the OOM priority with oom_score_adj
machine:
  kubelet:
    extraArgs:
      # OOM score for kubelet itself (-999 to 1000)
      oom-score-adj: "-999"
```

## Verifying Cgroup Configuration

After applying settings, verify everything is working:

```bash
# Check kubelet cgroup driver
talosctl service kubelet --nodes <node-ip>

# Verify cgroup hierarchy for a running pod
kubectl exec cgroup-debug -n kube-system -- \
  ls /sys/fs/cgroup/kubepods.slice/

# Check that CPU manager is active
kubectl get node <node-name> -o json | \
  jq '.status.allocatable'

# Verify memory QoS is applied
kubectl exec cgroup-debug -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.min
```

## Summary

Cgroup v2 on Talos Linux provides improved resource isolation compared to the older cgroup v1 system. Key configuration areas include setting up proper system reserved resources, enabling memory QoS for guaranteed memory allocation, configuring the CPU manager for dedicated CPU assignment, and taking advantage of PSI for contention monitoring. Since Talos Linux uses cgroup v2 by default, you can focus on tuning the kubelet and container runtime settings rather than dealing with migration. The unified hierarchy and improved controls in cgroup v2 give you more predictable and fair resource distribution across your Kubernetes workloads.
