# How to Configure kubelet systemReserved and kubeReserved Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubelet, Resource Management

Description: Learn how to configure kubelet systemReserved and kubeReserved settings to protect system daemons and Kubernetes components from resource starvation, ensuring node stability under heavy pod load.

---

Node resources must be divided between user pods, Kubernetes components, and system daemons. Without explicit reservations, pods can consume all available resources, starving critical system processes and causing node failures. The kubelet uses systemReserved and kubeReserved settings to reserve node capacity for non-pod processes.

This guide explains how to calculate and configure appropriate resource reservations for production Kubernetes nodes.

## Understanding Resource Allocation

Total node resources are divided into:

```text
Node Capacity
├─ System Reserved (systemReserved)
│   └─ OS daemons, sshd, systemd, etc.
├─ Kube Reserved (kubeReserved)
│   └─ kubelet, container runtime, kube-proxy
├─ Eviction Threshold
│   └─ Buffer for eviction decisions
└─ Allocatable
    └─ Available for pods
```

Formula:
```text
Allocatable = Node Capacity - systemReserved - kubeReserved - evictionThreshold
```

## Viewing Current Configuration

Check existing reservations:

```bash
# View kubelet config

cat /var/lib/kubelet/config.yaml | grep -A 5 "Reserved"

# Check node allocatable resources
kubectl describe node <node-name> | grep -A 10 "Allocatable:"

# View full capacity breakdown
kubectl get node <node-name> -o json | jq '.status | {capacity, allocatable}'
```

## Configuring systemReserved

systemReserved protects OS-level processes:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "10Gi"
  pid: "1000"
```

Restart kubelet to apply:

```bash
sudo systemctl restart kubelet
kubectl describe node <node-name> | grep -A 5 "Allocatable:"
```

## Configuring kubeReserved

kubeReserved protects Kubernetes components:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "10Gi"
kubeReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "5Gi"
```

## Enforcing Reservations

Enable enforcement to apply the reservations to existing cgroups:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  cpu: "500m"
  memory: "1Gi"
systemReservedCgroup: "system.slice"
kubeReserved:
  cpu: "500m"
  memory: "1Gi"
kubeReservedCgroup: "runtime.slice"
enforceNodeAllocatable:
- pods
- system-reserved
- kube-reserved
```

This enforces reservations through cgroups:
- Pod allocatable enforcement uses the kubelet-managed pod cgroup, such as `kubepods.slice` with the systemd cgroup driver
- `systemReservedCgroup`, such as `system.slice`, is used for system processes
- `kubeReservedCgroup`, such as `runtime.slice`, is used for Kubernetes node daemons

The kubelet does not create `systemReservedCgroup` or `kubeReservedCgroup`; it fails to start if a configured cgroup does not exist. Verify the cgroups before enabling enforcement:

```bash
# Check for system-reserved cgroup
ls -la /sys/fs/cgroup/system.slice/

# Check for kube-reserved cgroup
ls -la /sys/fs/cgroup/runtime.slice/
```

## Calculating systemReserved Values

Base calculations on node size:

**Small nodes (4 CPU, 8GB RAM):**
```yaml
systemReserved:
  cpu: "200m"
  memory: "512Mi"
  ephemeral-storage: "5Gi"
```

**Medium nodes (8 CPU, 16GB RAM):**
```yaml
systemReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "10Gi"
```

**Large nodes (16 CPU, 32GB RAM):**
```yaml
systemReserved:
  cpu: "1000m"
  memory: "2Gi"
  ephemeral-storage: "20Gi"
```

**Extra large nodes (32+ CPU, 64+ GB RAM):**
```yaml
systemReserved:
  cpu: "2000m"
  memory: "4Gi"
  ephemeral-storage: "30Gi"
```

Formula-based approach:

```text
CPU: max(200m, node_cpu * 0.05)
Memory: max(512Mi, node_memory * 0.05)
Storage: max(5Gi, node_storage * 0.02)
```

## Calculating kubeReserved Values

kubeReserved depends on pod density and the resource needs of Kubernetes node daemons:

**Worker nodes:**
```yaml
kubeReserved:
  cpu: "500m"   # kubelet, container runtime, kube-proxy
  memory: "1Gi"
  ephemeral-storage: "5Gi"
```

**Control plane nodes with non-pod Kubernetes daemons:**
```yaml
kubeReserved:
  cpu: "2000m"  # kubelet, container runtime, kube-proxy, and other non-pod Kubernetes daemons
  memory: "4Gi"
  ephemeral-storage: "20Gi"
```

If control plane components such as the API server, controller manager, scheduler, or etcd run as static Pods, `kubeReserved` is not meant to reserve resources for them; set appropriate Pod requests and limits for those components.

Scale with cluster size:

```text
Small cluster (< 100 nodes):
  cpu: "500m"
  memory: "1Gi"

Medium cluster (100-500 nodes):
  cpu: "1000m"
  memory: "2Gi"

Large cluster (500+ nodes):
  cpu: "2000m"
  memory: "4Gi"
```

## Complete Configuration Example

Production configuration for medium node:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Reserve for OS processes
systemReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "10Gi"
  pid: "1000"
# Reserve for Kubernetes components
kubeReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "5Gi"
  pid: "500"
# Enforce reservations via cgroups
systemReservedCgroup: "system.slice"
kubeReservedCgroup: "runtime.slice"
enforceNodeAllocatable:
- pods
- system-reserved
- kube-reserved
# Eviction thresholds
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
  pid.available: "5%"
evictionSoft:
  memory.available: "1.5Gi"
  nodefs.available: "15%"
evictionSoftGracePeriod:
  memory.available: "2m"
  nodefs.available: "5m"
```

Calculate allocatable:

```text
Node: 8 CPU, 16GB RAM
systemReserved: 500m CPU, 1GB RAM
kubeReserved: 500m CPU, 1GB RAM
evictionHard: 500MB RAM

Allocatable CPU: 8000m - 500m - 500m = 7000m (7 cores)
Allocatable RAM: 16GB - 1GB - 1GB - 0.5GB = 13.5GB
```

## Configuring with kubeadm

Set reservations during cluster initialization:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "10Gi"
kubeReserved:
  cpu: "500m"
  memory: "1Gi"
  ephemeral-storage: "5Gi"
systemReservedCgroup: "system.slice"
kubeReservedCgroup: "runtime.slice"
enforceNodeAllocatable:
- pods
- system-reserved
- kube-reserved
```

Apply during init:

```bash
sudo kubeadm init --config kubeadm-config.yaml
```

## Monitoring Reserved Resources

Track actual resource usage:

```bash
# System process CPU/memory
systemctl status

# Kubernetes component usage
kubectl top pod -n kube-system

# Check cgroup usage
cat /sys/fs/cgroup/system.slice/memory.current
cat /sys/fs/cgroup/runtime.slice/memory.current
```

Create Prometheus queries:

```promql
# Node allocatable vs capacity
kube_node_status_capacity{resource="cpu",unit="core"} - kube_node_status_allocatable{resource="cpu",unit="core"}
kube_node_status_capacity{resource="memory",unit="byte"} - kube_node_status_allocatable{resource="memory",unit="byte"}

# System resource usage
node_systemd_unit_state

# Kubernetes component memory
container_memory_working_set_bytes{namespace="kube-system"}
```

## Setting Up Alerts

Alert when reservations are insufficient:

```yaml
# reservation-alerts.yaml
groups:
- name: resource_reservations
  rules:
  - alert: SystemProcessesHighMemory
    expr: |
      (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
      / node_memory_MemTotal_bytes > 0.9
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "System memory usage high"
      description: "Node {{ $labels.node }} system memory at {{ $value | humanizePercentage }}"

  - alert: KubeComponentsHighCPU
    expr: |
      sum by (node) (
        rate(container_cpu_usage_seconds_total{namespace="kube-system"}[5m])
      ) > on (node) (kube_node_status_allocatable{resource="cpu",unit="core"} * 0.1)
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Kubernetes components using excessive CPU"
```

## Troubleshooting Common Issues

**Issue: Node shows less allocatable than expected**

```bash
# Check all reservations
kubectl describe node <node-name> | grep -E "Capacity|Allocatable" -A 10

# Verify configuration
cat /var/lib/kubelet/config.yaml | grep -A 10 Reserved

# Check for enforcement issues
journalctl -u kubelet | grep -i reserve
```

**Issue: System processes being OOM killed**

```bash
# Increase systemReserved memory
sudo vim /var/lib/kubelet/config.yaml
# Set: systemReserved.memory: "2Gi"

sudo systemctl restart kubelet
```

**Issue: Kubelet fails to enforce reserved cgroups**

```bash
# Verify enforcement is enabled
cat /var/lib/kubelet/config.yaml | grep enforceNodeAllocatable

# Verify cgroups are configured
cat /var/lib/kubelet/config.yaml | grep -E "systemReservedCgroup|kubeReservedCgroup"

# Check cgroup driver matches
cat /var/lib/kubelet/config.yaml | grep cgroupDriver
# Should match container runtime configuration

# Restart kubelet
sudo systemctl restart kubelet
```

## Best Practices

1. **Always reserve resources**: Don't run without reservations in production

2. **Scale with node size**: Larger nodes need larger reservations

3. **Enforce reservations**: Enable cgroup enforcement for hard limits

4. **Monitor actual usage**: Adjust reservations based on observed resource consumption

5. **Test under load**: Validate reservations prevent resource starvation

6. **Document decisions**: Record why specific reservation values were chosen

7. **Review periodically**: Reassess reservations as cluster grows

Example sizing matrix:

| Node Size | System CPU | System RAM | Kube CPU | Kube RAM |
|-----------|------------|------------|----------|----------|
| 4C/8GB    | 200m       | 512Mi      | 300m     | 512Mi    |
| 8C/16GB   | 500m       | 1Gi        | 500m     | 1Gi      |
| 16C/32GB  | 1000m      | 2Gi        | 1000m    | 2Gi      |
| 32C/64GB  | 2000m      | 4Gi        | 2000m    | 4Gi      |

Properly configuring systemReserved and kubeReserved protects critical system and Kubernetes processes from resource starvation, ensuring node stability even under heavy pod load. Calculate reservations based on node size, enforce them via cgroups, and monitor actual resource usage to validate your configuration.
