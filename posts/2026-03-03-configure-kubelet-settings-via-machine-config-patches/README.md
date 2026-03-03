# How to Configure Kubelet Settings via Machine Config Patches

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, kubelet, Machine Configuration, Kubernetes, Node Management

Description: A comprehensive guide to configuring kubelet settings in Talos Linux through machine configuration patches for optimal node performance and behavior.

---

The kubelet is the agent that runs on every Kubernetes node, responsible for managing pods, containers, and the node's relationship with the Kubernetes API server. In Talos Linux, all kubelet configuration is managed through the machine configuration rather than config files on disk or command-line flags. This guide covers how to use machine config patches to customize kubelet behavior for different workloads and operational requirements.

## Kubelet Configuration in Talos

The kubelet configuration lives under `machine.kubelet` in the Talos machine configuration. Here is the full structure of available options:

```yaml
machine:
  kubelet:
    image: ghcr.io/siderolabs/kubelet:v1.29.0
    nodeLabels: {}
    nodeTaints: {}
    nodeIP:
      validSubnets: []
    extraArgs: {}
    extraMounts: []
    extraConfig: {}
    clusterDNS: []
    credentialProviderConfig: {}
```

Each of these fields can be set through patches to customize kubelet behavior.

## Setting Node Labels

Labels are key-value pairs attached to the Kubernetes node object. They are used for scheduling, filtering, and organization:

```yaml
# node-labels-patch.yaml
machine:
  kubelet:
    nodeLabels:
      # Standard topology labels
      topology.kubernetes.io/region: us-east-1
      topology.kubernetes.io/zone: us-east-1a

      # Role labels
      node-role.kubernetes.io/compute: ""

      # Custom labels
      environment: production
      team: backend
      hardware-type: gpu
      cost-center: engineering
```

```bash
# Apply labels - no reboot needed
talosctl apply-config --nodes 10.0.1.21 --patch @node-labels-patch.yaml --mode no-reboot
```

Verify the labels:

```bash
kubectl get node <node-name> --show-labels
```

## Setting Node Taints

Taints prevent pods from being scheduled on a node unless they tolerate the taint:

```yaml
# node-taints-patch.yaml
machine:
  kubelet:
    nodeTaints:
      # Only schedule GPU workloads here
      nvidia.com/gpu: "true:NoSchedule"

      # Mark as dedicated to a specific team
      dedicated: "ml-team:NoSchedule"
```

Common taint effects:
- `NoSchedule` - New pods without the toleration will not be scheduled
- `PreferNoSchedule` - Scheduler tries to avoid this node but does not guarantee it
- `NoExecute` - Existing pods without the toleration are evicted

```bash
talosctl apply-config --nodes 10.0.1.23 --patch @node-taints-patch.yaml --mode no-reboot
```

## Configuring Node IP Selection

When a node has multiple network interfaces, control which IP the kubelet uses:

```yaml
# node-ip-patch.yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24  # Use management network
```

For dual-stack:

```yaml
# dual-stack-node-ip-patch.yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
        - fd00:10:1::/64
```

## Setting Kubelet Extra Arguments

Extra arguments are passed directly to the kubelet binary:

```yaml
# kubelet-args-patch.yaml
machine:
  kubelet:
    extraArgs:
      # Performance tuning
      max-pods: "250"
      event-qps: "50"
      event-burst: "100"

      # Security
      rotate-server-certificates: "true"
      protect-kernel-defaults: "true"

      # Resource management
      system-reserved: "cpu=500m,memory=1Gi,ephemeral-storage=1Gi"
      kube-reserved: "cpu=500m,memory=1Gi,ephemeral-storage=1Gi"
      eviction-hard: "memory.available<500Mi,nodefs.available<10%,imagefs.available<15%"
      eviction-soft: "memory.available<1Gi,nodefs.available<15%,imagefs.available<20%"
      eviction-soft-grace-period: "memory.available=2m,nodefs.available=2m,imagefs.available=2m"

      # Image management
      image-gc-high-threshold: "85"
      image-gc-low-threshold: "80"
      serialize-image-pulls: "false"
```

Each argument is a string key-value pair. The kubelet restarts to pick up changes, but the node does not reboot.

## Configuring Resource Reservations

Resource reservations ensure the kubelet and system processes have dedicated resources:

```yaml
# resource-reservations-patch.yaml
machine:
  kubelet:
    extraArgs:
      # Reserve resources for system daemons (Talos services)
      system-reserved: "cpu=500m,memory=1Gi,ephemeral-storage=2Gi"

      # Reserve resources for Kubernetes components (kubelet, container runtime)
      kube-reserved: "cpu=500m,memory=1Gi,ephemeral-storage=1Gi"

      # Enforce resource limits
      enforce-node-allocatable: "pods,system-reserved,kube-reserved"
```

Without reservations, workload pods can consume all node resources and starve the kubelet and system services, leading to node instability.

### Sizing Recommendations

| Node Size | system-reserved | kube-reserved |
|-----------|----------------|---------------|
| 4 CPU, 16 GB | cpu=250m, memory=512Mi | cpu=250m, memory=512Mi |
| 8 CPU, 32 GB | cpu=500m, memory=1Gi | cpu=500m, memory=1Gi |
| 16 CPU, 64 GB | cpu=500m, memory=2Gi | cpu=500m, memory=1Gi |
| 32 CPU, 128 GB | cpu=1, memory=4Gi | cpu=1, memory=2Gi |

## Configuring Eviction Thresholds

Eviction thresholds determine when the kubelet starts evicting pods due to resource pressure:

```yaml
# eviction-patch.yaml
machine:
  kubelet:
    extraArgs:
      # Hard eviction - pods are killed immediately when threshold is breached
      eviction-hard: "memory.available<200Mi,nodefs.available<5%,imagefs.available<10%,pid.available<100"

      # Soft eviction - pods are killed after the grace period
      eviction-soft: "memory.available<500Mi,nodefs.available<10%,imagefs.available<15%"
      eviction-soft-grace-period: "memory.available=1m30s,nodefs.available=2m,imagefs.available=2m"

      # Minimum reclaim - how much to free when evicting
      eviction-minimum-reclaim: "memory.available=200Mi,nodefs.available=1Gi,imagefs.available=2Gi"
```

Set hard thresholds lower than soft thresholds. Soft evictions give pods a chance to shut down gracefully, while hard evictions are last-resort protection.

## Extra Volume Mounts

If pods need to access host paths or additional storage:

```yaml
# extra-mounts-patch.yaml
machine:
  kubelet:
    extraMounts:
      - destination: /var/mnt/data
        type: bind
        source: /var/mnt/data
        options:
          - bind
          - rw
      - destination: /var/mnt/logs
        type: bind
        source: /var/mnt/logs
        options:
          - bind
          - rw
```

These mounts make host directories available to the kubelet and, by extension, to pods that use hostPath volumes.

## Configuring Extra Kubelet Configuration

The `extraConfig` field allows setting kubelet configuration file options that are not available through `extraArgs`:

```yaml
# extra-kubelet-config-patch.yaml
machine:
  kubelet:
    extraConfig:
      serverTLSBootstrap: true
      maxPods: 250
      containerLogMaxSize: "50Mi"
      containerLogMaxFiles: 5
      cpuManagerPolicy: static
      topologyManagerPolicy: best-effort
      memoryManagerPolicy: Static
      reservedMemory:
        - numaNode: 0
          limits:
            memory: "1Gi"
```

The `cpuManagerPolicy: static` setting is particularly important for latency-sensitive workloads. It pins containers with integer CPU requests to specific CPU cores, reducing context switching and cache misses.

## Configuring Cluster DNS

Override the default cluster DNS server address:

```yaml
# cluster-dns-patch.yaml
machine:
  kubelet:
    clusterDNS:
      - 10.96.0.10    # CoreDNS service IP
      - 10.96.0.11    # Secondary DNS (if using NodeLocal DNSCache)
```

## Role-Specific Kubelet Patches

Different node roles often need different kubelet configurations:

### Control Plane Nodes

```yaml
# cp-kubelet-patch.yaml
machine:
  kubelet:
    nodeLabels:
      node-role.kubernetes.io/control-plane: ""
    extraArgs:
      system-reserved: "cpu=1,memory=2Gi"
      kube-reserved: "cpu=1,memory=2Gi"
      max-pods: "50"  # Fewer pods on CP nodes
```

### General Workers

```yaml
# worker-kubelet-patch.yaml
machine:
  kubelet:
    nodeLabels:
      node-role.kubernetes.io/worker: ""
    extraArgs:
      system-reserved: "cpu=500m,memory=1Gi"
      kube-reserved: "cpu=500m,memory=1Gi"
      max-pods: "250"
      serialize-image-pulls: "false"
```

### GPU Workers

```yaml
# gpu-worker-kubelet-patch.yaml
machine:
  kubelet:
    nodeLabels:
      node-role.kubernetes.io/gpu: ""
      nvidia.com/gpu.present: "true"
    nodeTaints:
      nvidia.com/gpu: "true:NoSchedule"
    extraArgs:
      system-reserved: "cpu=1,memory=4Gi"
      kube-reserved: "cpu=1,memory=2Gi"
      max-pods: "50"  # GPU pods tend to be larger
    extraConfig:
      cpuManagerPolicy: static  # Pin CPU for GPU workloads
      topologyManagerPolicy: single-numa-node  # Keep GPU and CPU on same NUMA node
```

### Storage Workers

```yaml
# storage-worker-kubelet-patch.yaml
machine:
  kubelet:
    nodeLabels:
      node-role.kubernetes.io/storage: ""
    extraArgs:
      system-reserved: "cpu=500m,memory=2Gi"
      kube-reserved: "cpu=500m,memory=1Gi"
      max-pods: "100"
    extraMounts:
      - destination: /var/mnt/storage
        type: bind
        source: /var/mnt/storage
        options:
          - bind
          - rw
```

## Applying Kubelet Patches

Most kubelet configuration changes can be applied without rebooting:

```bash
# Apply and the kubelet will restart automatically
talosctl apply-config --nodes 10.0.1.21 --patch @kubelet-patch.yaml --mode no-reboot
```

Check that the kubelet restarted and is healthy:

```bash
# Check kubelet service status
talosctl service kubelet --nodes 10.0.1.21

# Check node status in Kubernetes
kubectl get node <node-name>

# Check node details for labels, taints, and conditions
kubectl describe node <node-name>
```

## Monitoring Kubelet Health

After making changes, monitor the kubelet for issues:

```bash
# Check kubelet logs
talosctl logs kubelet --nodes 10.0.1.21 --tail 100

# Look for common issues
talosctl logs kubelet --nodes 10.0.1.21 | grep -i "error\|warning\|fail"

# Check node conditions
kubectl get node <node-name> -o jsonpath='{.status.conditions[*].type}={.status.conditions[*].status}'
```

Healthy nodes should show:
- `Ready=True`
- `MemoryPressure=False`
- `DiskPressure=False`
- `PIDPressure=False`

## Conclusion

Configuring kubelet settings through Talos machine config patches gives you complete control over how each node participates in your Kubernetes cluster. From basic settings like labels and taints to advanced tuning like CPU pinning and memory management, everything is managed declaratively through the machine configuration. The key is to match your kubelet configuration to each node's role and workload requirements. Use conservative resource reservations to protect system stability, set appropriate eviction thresholds for your environment, and take advantage of features like static CPU management for performance-sensitive workloads. Since most kubelet changes apply without rebooting, you can iterate on your configuration until you find the right settings for your cluster.
