# How to Configure AKS with Custom Node Configuration for Kernel Parameters and OS Tuning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Node Configuration, Kernel Tuning, sysctl, Kubernetes, Performance, Azure

Description: Learn how to customize AKS node OS settings including kernel parameters, sysctl values, and kubelet configuration for performance-sensitive workloads.

---

AKS node pools come with default OS and kubelet configurations that work well for general workloads. But when you are running high-performance databases, network-intensive applications, or workloads with specific memory and process requirements, the defaults are not always enough. You may need to increase the maximum number of file descriptors, tune TCP buffer sizes, adjust memory overcommit behavior, or change kubelet settings like pod eviction thresholds.

AKS supports custom node configuration that lets you tune both Linux kernel parameters (sysctl values) and kubelet settings at node pool creation time. This guide walks through the available tuning options and practical examples for common performance scenarios.

## What You Can Customize

AKS custom node configuration covers two areas:

**Linux OS Configuration (sysctl parameters)**: Kernel-level settings that affect networking, memory, file handles, and process management. These are the same settings you would change in `/etc/sysctl.conf` on a bare metal server.

**Kubelet Configuration**: Settings that control how the kubelet manages pods, images, and resources on each node. These include eviction thresholds, max pods per node, and image garbage collection.

## Step 1: Create a Custom Linux Configuration

Define your OS tuning parameters in a JSON file.

Here is a configuration optimized for high-performance networking workloads:

```json
{
  "sysctls": {
    "netCoreSomaxconn": 65535,
    "netCoreNetdevMaxBacklog": 5000,
    "netCoreRmemMax": 16777216,
    "netCoreWmemMax": 16777216,
    "netIpv4TcpMaxSynBacklog": 65535,
    "netIpv4TcpFinTimeout": 15,
    "netIpv4TcpKeepaliveTime": 300,
    "netIpv4TcpKeepaliveProbes": 5,
    "netIpv4TcpKeepaliveIntvl": 15,
    "netIpv4TcpTwReuse": true,
    "netIpv4IpLocalPortRange": "1024 65535",
    "netIpv4TcpMaxTwBuckets": 262144,
    "vmMaxMapCount": 262144,
    "vmSwappiness": 10,
    "fsFileMax": 2097152,
    "fsNrOpen": 1048576,
    "fsInotifyMaxUserWatches": 524288
  },
  "transparentHugePageEnabled": "madvise",
  "transparentHugePageDefrag": "defer+madvise"
}
```

Save this as `linux-config.json`. Let me explain the key parameters:

- **netCoreSomaxconn (65535)**: Maximum number of connections that can be queued for acceptance. Critical for web servers handling high connection rates.
- **netCoreNetdevMaxBacklog (5000)**: Maximum number of packets queued at the network device level before the kernel processes them.
- **netCoreRmemMax / netCoreWmemMax**: Maximum socket receive and send buffer sizes. Important for high-throughput networking.
- **netIpv4TcpMaxSynBacklog (65535)**: Maximum number of queued SYN packets. Prevents SYN flood issues under high connection rates.
- **vmMaxMapCount (262144)**: Maximum number of memory map areas. Required by Elasticsearch and other memory-mapped applications.
- **vmSwappiness (10)**: How aggressively the kernel swaps memory to disk. Lower values prefer keeping data in RAM.
- **fsFileMax (2097152)**: Maximum number of file descriptors system-wide. Essential for workloads with many open files or connections.

## Step 2: Create a Custom Kubelet Configuration

The kubelet configuration controls pod management behavior.

```json
{
  "cpuManagerPolicy": "static",
  "cpuCfsQuota": true,
  "cpuCfsQuotaPeriod": "100ms",
  "topologyManagerPolicy": "best-effort",
  "allowedUnsafeSysctls": [
    "kernel.msg*",
    "net.core.somaxconn",
    "net.ipv4.tcp_keepalive_time",
    "net.ipv4.tcp_fin_timeout"
  ],
  "containerLogMaxSizeMB": 50,
  "containerLogMaxFiles": 5,
  "podMaxPids": 4096,
  "imageGcHighThreshold": 85,
  "imageGcLowThreshold": 80
}
```

Save this as `kubelet-config.json`. The key settings:

- **cpuManagerPolicy (static)**: Enables exclusive CPU pinning for Guaranteed QoS pods. Critical for latency-sensitive workloads that need dedicated CPU cores.
- **topologyManagerPolicy (best-effort)**: Aligns CPU, memory, and device allocations on the same NUMA node when possible.
- **allowedUnsafeSysctls**: Lets pods set specific sysctl values in their security context. Without this, pod-level sysctls are blocked.
- **containerLogMaxSizeMB (50)**: Maximum size of each container log file before rotation. Prevents logs from filling the node disk.
- **podMaxPids (4096)**: Maximum number of PIDs per pod. Prevents fork bombs from affecting other pods.

## Step 3: Create a Node Pool with Custom Configuration

Apply both configurations when creating a node pool.

```bash
# Create a node pool with custom Linux and kubelet configuration
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name perfpool \
  --node-count 3 \
  --node-vm-size Standard_D8s_v5 \
  --linux-os-config linux-config.json \
  --kubelet-config kubelet-config.json
```

For a new cluster:

```bash
# Create a new cluster with custom node configuration
az aks create \
  --resource-group myResourceGroup \
  --name myTunedCluster \
  --node-count 3 \
  --linux-os-config linux-config.json \
  --kubelet-config kubelet-config.json \
  --generate-ssh-keys
```

## Step 4: Verify the Configuration

After the node pool is created, verify that the settings were applied.

```bash
# Debug into a node to check sysctl values
kubectl debug node/<node-name> -it --image=busybox
chroot /host

# Check specific sysctl values
sysctl net.core.somaxconn
# Expected: net.core.somaxconn = 65535

sysctl vm.max_map_count
# Expected: vm.max_map_count = 262144

sysctl fs.file-max
# Expected: fs.file-max = 2097152

sysctl net.ipv4.ip_local_port_range
# Expected: net.ipv4.ip_local_port_range = 1024  65535

# Check transparent huge pages
cat /sys/kernel/mm/transparent_hugepage/enabled
# Expected: [madvise] or similar
```

Check kubelet configuration:

```bash
# View the kubelet configuration on the node
cat /var/lib/kubelet/config.yaml | grep -E "cpuManager|topology|maxPods|podPidsLimit"
```

## Step 5: Use Pod-Level Sysctls

For workloads that need specific sysctls beyond what is set at the node level, you can configure them per pod (as long as the sysctl is in the `allowedUnsafeSysctls` list).

```yaml
# high-perf-pod.yaml
# Pod with custom sysctl settings for network performance
apiVersion: v1
kind: Pod
metadata:
  name: high-perf-app
spec:
  # Schedule on the custom-configured node pool
  nodeSelector:
    agentpool: perfpool
  securityContext:
    sysctls:
    # These must be in the kubelet's allowedUnsafeSysctls list
    - name: net.core.somaxconn
      value: "32768"
    - name: net.ipv4.tcp_keepalive_time
      value: "600"
  containers:
  - name: app
    image: myregistry.azurecr.io/high-perf-app:v1
    resources:
      requests:
        cpu: "4"
        memory: "8Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
```

## Common Configuration Profiles

### Database Workloads (PostgreSQL, MySQL)

```json
{
  "sysctls": {
    "vmMaxMapCount": 262144,
    "vmSwappiness": 1,
    "vmDirtyRatio": 40,
    "vmDirtyBackgroundRatio": 10,
    "fsFileMax": 1048576,
    "netCoreSomaxconn": 4096,
    "netIpv4TcpKeepaliveTime": 600,
    "netIpv4TcpKeepaliveProbes": 9,
    "netIpv4TcpKeepaliveIntvl": 75
  },
  "transparentHugePageEnabled": "never",
  "transparentHugePageDefrag": "never"
}
```

Note: Transparent huge pages should be disabled for most databases because they can cause latency spikes during memory compaction.

### Elasticsearch Workloads

```json
{
  "sysctls": {
    "vmMaxMapCount": 524288,
    "vmSwappiness": 1,
    "fsFileMax": 2097152,
    "netCoreSomaxconn": 65535,
    "netIpv4TcpMaxSynBacklog": 32768,
    "netIpv4TcpFinTimeout": 30
  },
  "transparentHugePageEnabled": "never",
  "transparentHugePageDefrag": "never"
}
```

Elasticsearch requires a high `vm.max_map_count` because it uses memory-mapped files extensively.

### High-Connection Web Servers (NGINX, Envoy)

```json
{
  "sysctls": {
    "netCoreSomaxconn": 65535,
    "netCoreNetdevMaxBacklog": 10000,
    "netIpv4TcpMaxSynBacklog": 65535,
    "netIpv4IpLocalPortRange": "1024 65535",
    "netIpv4TcpMaxTwBuckets": 400000,
    "netIpv4TcpTwReuse": true,
    "netIpv4TcpFinTimeout": 10,
    "fsFileMax": 2097152,
    "fsNrOpen": 1048576
  }
}
```

## Limitations

There are some restrictions to be aware of:

- Custom node configuration can only be set at node pool creation time. You cannot modify it on an existing node pool. To change settings, create a new node pool and migrate workloads.
- Not all sysctl parameters are available. AKS restricts which parameters can be set to prevent breaking the node. Check the Azure documentation for the current allowlist.
- The `cpuManagerPolicy: static` setting requires pods to use Guaranteed QoS (requests equal limits) to get exclusive CPU allocation. BestEffort and Burstable pods still share CPUs.
- Custom configuration adds a few seconds to node provisioning time because the settings need to be applied before the kubelet starts.

## Troubleshooting

If a node pool creation fails with custom configuration, check:

```bash
# Check the node pool provisioning state for error details
az aks nodepool show \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name perfpool \
  --query provisioningState -o tsv
```

Common failures include invalid parameter names (the JSON property names use camelCase, not the traditional dot-separated sysctl names), values out of range, and conflicting settings.

Custom node configuration is a powerful tool for squeezing the best performance out of your AKS node pools. Identify the specific parameters your workload needs, test them in a non-production environment, and then create dedicated node pools with the right tuning for each workload type.
