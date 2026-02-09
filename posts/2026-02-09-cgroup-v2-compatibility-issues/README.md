# How to Fix Kubernetes Cgroup v2 Compatibility Issues After Node OS Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Linux, Troubleshooting

Description: Learn how to diagnose and fix cgroup v2 compatibility issues in Kubernetes after upgrading node operating systems with practical migration strategies.

---

Modern Linux distributions are transitioning from cgroup v1 to cgroup v2, a unified hierarchy with improved resource management. When you upgrade node operating systems to versions that default to cgroup v2, existing Kubernetes clusters can experience compatibility issues. Understanding how to migrate smoothly prevents workload disruptions.

## Understanding Cgroup v1 vs v2

Cgroup v1 uses multiple hierarchies, one for each controller (CPU, memory, I/O). This creates complexity and some controllers have overlapping functionality. Cgroup v2 provides a single unified hierarchy where all controllers work together consistently.

Kubernetes has supported cgroup v2 since version 1.25, but older versions and some container runtimes still expect v1. When nodes switch to v2, these components break if not configured correctly.

## Symptoms of Cgroup v2 Issues

Pods fail to start with resource allocation errors. The kubelet reports errors about missing cgroup paths. Container runtime fails to create containers with cgroup-related errors.

```bash
# Check which cgroup version is active
stat -fc %T /sys/fs/cgroup/

# Output:
# cgroup2fs = cgroup v2 (unified)
# tmpfs = cgroup v1 (hybrid or legacy)

# Check kubelet logs for cgroup errors
journalctl -u kubelet | grep -i cgroup

# Common error patterns:
# "failed to get cgroup stats"
# "no such file or directory" for cgroup paths
# "operation not supported" for cgroup operations
```

These errors indicate the system is using cgroup v2 but Kubernetes components expect v1.

## Checking Current Cgroup Version

Verify which cgroup version your system uses.

```bash
# Method 1: Check filesystem type
stat -fc %T /sys/fs/cgroup/

# Method 2: Check for unified hierarchy
test -f /sys/fs/cgroup/cgroup.controllers && echo "cgroup v2" || echo "cgroup v1"

# Method 3: Check mount points
mount | grep cgroup

# Method 4: Check systemd default
systemd-cgls

# View cgroup configuration in kernel
cat /proc/cgroups
```

## Configuring Kubelet for Cgroup v2

Kubelet needs explicit cgroup driver configuration for v2 compatibility.

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd  # Use systemd cgroup driver
cgroupRoot: /
featureGates:
  CgroupsV2: true  # Explicitly enable cgroup v2 support
```

Restart kubelet after configuration changes.

```bash
systemctl daemon-reload
systemctl restart kubelet
systemctl status kubelet
```

## Container Runtime Configuration

Container runtimes must also support cgroup v2. Containerd configuration for cgroup v2.

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  [plugins."io.containerd.grpc.v1.cri".containerd]
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
      runtime_type = "io.containerd.runc.v2"
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
        SystemdCgroup = true  # Required for cgroup v2
```

Restart containerd after changes.

```bash
systemctl restart containerd
systemctl status containerd

# Test containerd cgroup support
crictl --runtime-endpoint unix:///var/run/containerd/containerd.sock version
```

## Docker/Dockerd Cgroup Configuration

If using Docker as the container runtime (deprecated but still used), configure it for cgroup v2.

```json
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m"
  },
  "storage-driver": "overlay2"
}
```

Restart Docker after configuration.

```bash
systemctl restart docker
systemctl status docker
```

## Verifying Cgroup Configuration

Check that Kubernetes components are using the correct cgroup driver.

```bash
# Check kubelet cgroup driver
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.kubeletVersion}'
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.containerRuntimeVersion}'

# Verify pod cgroup placement
kubectl exec -it test-pod -- cat /proc/self/cgroup

# Should show unified cgroup path for v2:
# 0::/kubepods.slice/kubepods-besteffort.slice/...

# Check resource limits are applied
kubectl exec -it test-pod -- cat /sys/fs/cgroup/memory.max
kubectl exec -it test-pod -- cat /sys/fs/cgroup/cpu.max
```

## Migrating Existing Nodes

Migrate nodes to cgroup v2 one at a time to minimize disruption.

```bash
# Step 1: Drain node
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Step 2: SSH to node and upgrade OS
ssh node-1
sudo apt-get update && sudo apt-get upgrade -y

# Step 3: Configure cgroup v2 if not default
# Edit /etc/default/grub to remove cgroup_no_v1 if present
sudo update-grub
sudo reboot

# Step 4: After reboot, verify cgroup v2
ssh node-1
stat -fc %T /sys/fs/cgroup/

# Step 5: Configure kubelet and container runtime
# Apply configurations shown above

# Step 6: Uncordon node
kubectl uncordon node-1

# Step 7: Verify pods can schedule
kubectl get pods -o wide | grep node-1
```

Repeat for each node in the cluster.

## Troubleshooting Resource Limits

Resource limits work differently in cgroup v2. Verify they're applied correctly.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-test
spec:
  containers:
  - name: test
    image: nginx:1.21
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "200m"
```

Check cgroup v2 resource files in the container.

```bash
kubectl exec -it resource-test -- sh -c '
  echo "Memory limit:" && cat /sys/fs/cgroup/memory.max
  echo "Memory current:" && cat /sys/fs/cgroup/memory.current
  echo "CPU max:" && cat /sys/fs/cgroup/cpu.max
  echo "CPU weight:" && cat /sys/fs/cgroup/cpu.weight
'
```

## Handling Unsupported Features

Some cgroup v1 features aren't available in v2 or work differently.

```bash
# cgroup v1 memory.swappiness not available in v2
# Use memory.swap.max instead

# Check available controllers
cat /sys/fs/cgroup/cgroup.controllers

# Should show: cpu memory io pids

# Enable controllers for subtree
echo "+cpu +memory +io" > /sys/fs/cgroup/cgroup.subtree_control
```

## Monitoring Cgroup Resource Usage

Monitor cgroup v2 metrics with Prometheus and node-exporter.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  cgroup-rules.yml: |
    groups:
    - name: cgroup_monitoring
      interval: 30s
      rules:
      - record: container_memory_usage_bytes
        expr: container_memory_working_set_bytes

      - record: container_cpu_usage_seconds_total
        expr: rate(container_cpu_usage_seconds_total[5m])

      - alert: CgroupMemoryPressure
        expr: |
          container_memory_working_set_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Container {{ $labels.container }} memory pressure"
```

## Testing Cgroup v2 Before Migration

Test cgroup v2 in a development cluster before production migration.

```bash
# Create test node with cgroup v2
# Deploy test workloads
kubectl apply -f test-workloads.yaml

# Run stress tests
kubectl run stress-test --image=polinux/stress \
  --restart=Never \
  --requests='memory=512Mi' \
  --limits='memory=1Gi' \
  -- stress --vm 1 --vm-bytes 800M --timeout 60s

# Monitor pod behavior
kubectl top pod stress-test
kubectl describe pod stress-test

# Check for OOMKills or scheduling issues
kubectl get events | grep stress-test
```

## Gradual Rollout Strategy

Roll out cgroup v2 gradually across the cluster.

```yaml
# Phase 1: Create node pool with cgroup v2
apiVersion: v1
kind: Node
metadata:
  name: node-cgroupv2-1
  labels:
    cgroup-version: v2

# Phase 2: Deploy test workloads to v2 nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app-v2
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      nodeSelector:
        cgroup-version: v2  # Target cgroup v2 nodes only
      containers:
      - name: app
        image: myapp:1.0
```

Monitor v2 nodes for several days before migrating production workloads.

## Reverting to Cgroup v1

If issues arise, revert nodes to cgroup v1 temporarily.

```bash
# Edit grub configuration
sudo vim /etc/default/grub

# Add kernel parameter
GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0"

# Update grub and reboot
sudo update-grub
sudo reboot

# Verify cgroup v1 after reboot
stat -fc %T /sys/fs/cgroup/
# Should output: tmpfs
```

This gives you time to diagnose issues without pressure.

## Container Runtime Debugging

Debug container runtime issues related to cgroups.

```bash
# Check containerd cgroup configuration
crictl --runtime-endpoint unix:///var/run/containerd/containerd.sock info | grep -i cgroup

# Test container creation
crictl --runtime-endpoint unix:///var/run/containerd/containerd.sock \
  run container-config.json pod-config.json

# View containerd logs
journalctl -u containerd -n 100 --no-pager | grep -i cgroup

# Check runc version and cgroup support
runc --version
runc features
```

## Best Practices

Test cgroup v2 thoroughly in non-production environments before production migration. Different workloads may behave unexpectedly.

Upgrade Kubernetes to at least version 1.25 before migrating to cgroup v2. Earlier versions have limited or no support.

Keep container runtime updated. Old runtime versions may not fully support cgroup v2.

Monitor resource usage closely during and after migration. Verify that limits and requests work as expected.

Document your migration process and node configurations. Future node additions should use the same cgroup version.

Plan for rollback capability. Keep at least one node pool on cgroup v1 during initial migration phases.

## Conclusion

Cgroup v2 compatibility issues after OS upgrades are manageable with proper planning and configuration. Verify your Kubernetes version supports cgroup v2, configure kubelet and container runtime correctly, and migrate nodes gradually. Test thoroughly in development environments and monitor resource usage during migration. With careful planning and testing, cgroup v2 migration improves resource management without disrupting workloads.
