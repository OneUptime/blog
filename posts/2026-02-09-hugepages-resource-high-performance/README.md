# How to Configure Hugepages as a Resource for High-Performance Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HugePages, Performance

Description: Configure and use hugepages in Kubernetes to reduce TLB misses and improve memory performance for DPDK, databases, and memory-intensive applications.

---

Standard 4KB pages cause Translation Lookaside Buffer (TLB) misses in memory-intensive applications, degrading performance. Hugepages (commonly 2MiB or 1GiB pages on x86) reduce TLB pressure and improve throughput. This guide shows you how to configure hugepages in Kubernetes.

## What Are Hugepages?

Normal Linux pages are commonly 4KB. The CPU's TLB caches page table entries, but with 4KB pages, large memory footprints cause frequent TLB misses. Hugepages use larger page sizes, reducing page table entries by 512x for 2MiB pages and much more for 1GiB pages.

Workloads that benefit:

- DPDK network applications
- Some in-memory databases (SAP HANA; Redis mainly requires THP to be disabled)
- High-performance computing
- Virtual machines

## Enabling Hugepages on Nodes

Reserve hugepages on each node before starting Kubernetes. For boot-time reservation, add hugepage parameters to the kernel command line, for example in `/etc/default/grub`:

```bash
GRUB_CMDLINE_LINUX="hugepagesz=1G hugepages=4 hugepagesz=2M hugepages=1024"
```

Apply the GRUB change using your distribution's GRUB update command, then reboot the node. For the default hugepage size only, you can also use `vm.nr_hugepages`:

```bash
sysctl -w vm.nr_hugepages=1024
```

If you allocate pages dynamically after kubelet has started, restart kubelet so the node reports the new capacity.

Verify:

```bash
cat /proc/meminfo | grep -i huge
```

Example output for 2MiB hugepages:

```text
HugePages_Total:    1024
HugePages_Free:     1024
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
```

## Configuring Kubelet for Hugepages

Tell kubelet about hugepages. They appear as allocatable resources separate from regular memory.

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

The pod gets 512 2MiB hugepages (1GiB total) mounted at `/dev/hugepages`.

## Using 1GiB Hugepages

For very large memory workloads, use 1GiB pages:

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

Note: volume medium is `HugePages-1Gi` for 1GiB pages.

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

DPDK maps hugepages from `/mnt/huge` for packet buffer memory.

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
    hugepages-2Mi: "10Gi"
    hugepages-1Gi: "20Gi"
```

Prevents one namespace from consuming all hugepages.

## LimitRange for Hugepages

Set minimum and maximum hugepage requests:

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

This helps align CPUs, hugepages, and devices on the same NUMA node for Guaranteed pods when the requested resources are available.

## Transparent Hugepages vs Explicit

Transparent Hugepages (THP) are automatic but less predictable. For deterministic performance, disable THP and use explicit hugepages:

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

Add to node startup scripts.

## Best Practices

- Reserve hugepages at boot time
- Use 2MiB pages for most workloads
- Use 1GiB pages for very large memory footprints (> 32GiB)
- Disable transparent hugepages for predictable performance
- Combine with CPU Manager and Topology Manager
- Set ResourceQuotas to prevent exhaustion
- Monitor hugepage usage per node
- Document hugepage requirements in app docs

## Redis and Transparent Hugepages

Redis does not automatically use explicit Kubernetes hugepage volumes for its dataset. Redis recommends disabling Transparent Hugepages because THP can cause latency spikes during `fork()` and copy-on-write:

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

## Troubleshooting

**Pod Pending - Insufficient hugepages**: Check node allocatable:

```bash
kubectl describe node worker-1 | grep -i hugepage
```

If insufficient, reserve more on the node.

**Hugepages Not Mounted**: Verify the volume is defined with `medium: HugePages`.

**Permission Denied**: For applications using `shmget()` with `SHM_HUGETLB`, configure a supplemental group that matches `/proc/sys/vm/hugetlb_shm_group`. Some applications may also need `IPC_LOCK`:

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
sysbench memory --memory-total-size=10G --memory-hugetlb=off run

# With hugepages
sysbench memory --memory-total-size=10G --memory-hugetlb=on run
```

Hugepages can improve throughput for memory-intensive workloads, but results depend on the application, access pattern, page size, CPU, and NUMA placement.

## Conclusion

Hugepages reduce TLB misses and improve memory performance for large-memory workloads. Reserve hugepages at the node level, request them as resources in pod specs, and mount via emptyDir with HugePages medium. Use 2MiB pages for most workloads and 1GiB pages for very large memory footprints. Combine with CPU and Memory Manager for NUMA-aligned allocation. Disable transparent hugepages for deterministic performance. Hugepages are essential for DPDK and can benefit supported databases and high-performance computing on Kubernetes.
