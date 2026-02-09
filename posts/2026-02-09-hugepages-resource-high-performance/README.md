# How to Configure Hugepages as a Resource for High-Performance Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Hugepages, Performance

Description: Configure and use hugepages in Kubernetes to reduce TLB misses and improve memory performance for DPDK, databases, and memory-intensive applications.

---

Standard 4KB pages cause Translation Lookaside Buffer (TLB) misses in memory-intensive applications, degrading performance. Hugepages (2MB or 1GB pages) reduce TLB pressure and improve throughput. This guide shows you how to configure hugepages in Kubernetes.

## What Are Hugepages?

Normal Linux pages are 4KB. The CPU's TLB caches page table entries, but with 4KB pages, large memory footprints cause frequent TLB misses. Hugepages use 2MB or 1GB pages, reducing TLB misses by 500x or more.

Workloads that benefit:

- DPDK network applications
- In-memory databases (Redis, SAP HANA)
- High-performance computing
- Virtual machines

## Enabling Hugepages on Nodes

Reserve hugepages on each node before starting Kubernetes. Edit `/etc/sysctl.conf`:

```bash
# Reserve 1024 2MB hugepages (2GB total)
vm.nr_hugepages=1024

# Or reserve 4 1GB hugepages
vm.nr_hugepages_1gb=4
```

Apply changes:

```bash
sysctl -p
```

Verify:

```bash
cat /proc/meminfo | grep -i huge
```

Output:

```
HugePages_Total:    1024
HugePages_Free:     1024
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
```

## Configuring Kubelet for Hugepages

Tell kubelet about hugepages. They count against allocatable memory.

No special kubelet config needed - kubelet auto-discovers hugepages from `/proc/meminfo`.

Check node allocatable hugepages:

```bash
kubectl get node worker-1 -o json | jq '.status.allocatable'
```

Output includes:

```json
{
  "hugepages-2Mi": "2Gi",
  "hugepages-1Gi": "4Gi"
}
```

## Requesting Hugepages in Pods

Request hugepages as a resource:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hugepage-app
spec:
  containers:
  - name: app
    image: dpdk-app:latest
    resources:
      requests:
        memory: "1Gi"
        hugepages-2Mi: "1Gi"
      limits:
        memory: "1Gi"
        hugepages-2Mi: "1Gi"
    volumeMounts:
    - name: hugepages
      mountPath: /dev/hugepages
  volumes:
  - name: hugepages
    emptyDir:
      medium: HugePages
```

The pod gets 512 2MB hugepages (1GB total) mounted at `/dev/hugepages`.

## Using 1GB Hugepages

For very large memory workloads, use 1GB pages:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: large-memory-app
spec:
  containers:
  - name: app
    image: hpc-app:latest
    resources:
      requests:
        memory: "2Gi"
        hugepages-1Gi: "8Gi"
      limits:
        memory: "2Gi"
        hugepages-1Gi: "8Gi"
    volumeMounts:
    - name: hugepages
      mountPath: /mnt/huge
  volumes:
  - name: hugepages
    emptyDir:
      medium: HugePages-1Gi
```

Note: volume medium is `HugePages-1Gi` for 1GB pages.

## Hugepages and Memory Accounting

Hugepages count separately from regular memory:

```yaml
resources:
  requests:
    memory: "1Gi"          # Regular memory
    hugepages-2Mi: "2Gi"   # Hugepage memory
```

Total pod memory footprint is 3Gi (1Gi regular + 2Gi hugepages).

## DPDK Application with Hugepages

DPDK requires hugepages for packet buffers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dpdk-packet-processor
spec:
  containers:
  - name: dpdk
    image: dpdk-app:latest
    securityContext:
      privileged: true
      capabilities:
        add:
        - IPC_LOCK
        - SYS_ADMIN
    resources:
      requests:
        cpu: "8"
        memory: "4Gi"
        hugepages-1Gi: "8Gi"
      limits:
        cpu: "8"
        memory: "4Gi"
        hugepages-1Gi: "8Gi"
    volumeMounts:
    - name: hugepages
      mountPath: /mnt/huge
    - name: dev
      mountPath: /dev
  volumes:
  - name: hugepages
    emptyDir:
      medium: HugePages-1Gi
  - name: dev
    hostPath:
      path: /dev
```

DPDK maps hugepages from `/mnt/huge` for zero-copy packet processing.

## ResourceQuota for Hugepages

Limit hugepage usage per namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: hugepage-quota
  namespace: hpc-team
spec:
  hard:
    requests.hugepages-2Mi: "10Gi"
    requests.hugepages-1Gi: "20Gi"
```

Prevents one namespace from consuming all hugepages.

## LimitRange for Hugepages

Set default hugepage requests:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: hugepage-limits
  namespace: hpc-team
spec:
  limits:
  - max:
      hugepages-2Mi: "4Gi"
    min:
      hugepages-2Mi: "512Mi"
    type: Container
```

## Monitoring Hugepage Usage

Check node hugepage status:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,HUGEPAGES-2Mi:.status.allocatable.hugepages-2Mi,HUGEPAGES-1Gi:.status.allocatable.hugepages-1Gi
```

Check pod hugepage usage:

```bash
kubectl describe pod hugepage-app
```

Look at resource requests and limits.

SSH to the node and check kernel stats:

```bash
cat /proc/meminfo | grep -i huge
```

## Hugepages and NUMA

Hugepages are allocated from NUMA nodes. For best performance, combine with Topology Manager:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: single-numa-node
cpuManagerPolicy: static
memoryManagerPolicy: Static
```

This ensures CPUs, hugepages, and devices are all on the same NUMA node.

## Transparent Hugepages vs Explicit

Transparent Hugepages (THP) are automatic but less predictable. For deterministic performance, disable THP and use explicit hugepages:

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

Add to node startup scripts.

## Best Practices

- Reserve hugepages at boot time
- Use 2MB pages for most workloads
- Use 1GB pages for very large memory footprints (> 32GB)
- Disable transparent hugepages for predictable performance
- Combine with CPU Manager and Topology Manager
- Set ResourceQuotas to prevent exhaustion
- Monitor hugepage usage per node
- Document hugepage requirements in app docs

## Redis with Hugepages

Redis benefits from hugepages for large datasets:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: redis-hugepage
spec:
  containers:
  - name: redis
    image: redis:7
    command:
    - redis-server
    - --maxmemory
    - "14gb"
    resources:
      requests:
        cpu: "4"
        memory: "2Gi"
        hugepages-2Mi: "14Gi"
      limits:
        cpu: "4"
        memory: "2Gi"
        hugepages-2Mi: "14Gi"
    volumeMounts:
    - name: hugepages
      mountPath: /dev/hugepages
  volumes:
  - name: hugepages
    emptyDir:
      medium: HugePages
```

Configure Redis to use hugepages:

```bash
# In Redis container
echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
```

## Troubleshooting

**Pod Pending - Insufficient hugepages**: Check node allocatable:

```bash
kubectl describe node worker-1 | grep -i hugepage
```

If insufficient, reserve more on the node.

**Hugepages Not Mounted**: Verify the volume is defined with `medium: HugePages`.

**Permission Denied**: Add `IPC_LOCK` capability:

```yaml
securityContext:
  capabilities:
    add:
    - IPC_LOCK
```

## Performance Validation

Benchmark with and without hugepages:

```bash
# Without hugepages
sysbench memory --memory-total-size=10G run

# With hugepages
sysbench memory --memory-total-size=10G run
```

Hugepages typically improve throughput by 10-30% for memory-intensive workloads.

## Conclusion

Hugepages reduce TLB misses and improve memory performance for large-memory workloads. Reserve hugepages at the node level, request them as resources in pod specs, and mount via emptyDir with HugePages medium. Use 2MB pages for most workloads and 1GB pages for very large memory footprints. Combine with CPU and Memory Manager for NUMA-aligned allocation. Disable transparent hugepages for deterministic performance. Hugepages are essential for DPDK, in-memory databases, and high-performance computing on Kubernetes.
