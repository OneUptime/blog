# How to Configure Huge Pages on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Huge Pages, Memory Management, Performance, Kubernetes

Description: Step-by-step guide to configuring huge pages on Talos Linux for improved memory performance in Kubernetes workloads

---

Huge pages are a Linux kernel feature that allows applications to use memory pages larger than the default 4KB size. By using 2MB or even 1GB pages, applications that work with large memory regions can dramatically reduce the overhead of address translation. On Talos Linux, configuring huge pages requires specific machine configuration settings since you cannot simply run commands on the host.

This guide explains what huge pages are, when to use them, and exactly how to set them up on Talos Linux.

## Understanding Page Tables and TLB Misses

Every time your application accesses memory, the CPU translates a virtual address to a physical address using page tables. The CPU caches these translations in the Translation Lookaside Buffer (TLB). With standard 4KB pages, a system with 64GB of RAM has roughly 16 million pages. The TLB can only cache a few thousand entries, so many memory accesses result in TLB misses, which require expensive page table walks.

With 2MB huge pages, the same 64GB of RAM needs only about 32,000 pages. This fits much better in the TLB, reducing misses by orders of magnitude. For memory-intensive applications, this translates to measurable performance gains, sometimes 10-30% improvement in throughput.

## When to Use Huge Pages

Not every application benefits from huge pages. They are most useful for:

- Database systems like PostgreSQL, MySQL, and Redis that maintain large shared buffers
- DPDK-based networking applications that need fast packet buffer access
- Scientific computing applications with large arrays
- Virtual machines running under KubeVirt
- Any application with a large, frequently accessed memory footprint

Applications with small memory footprints or scattered access patterns will see little benefit and may waste memory since huge pages must be allocated in their full size even if only partially used.

## Configuring 2MB Huge Pages on Talos Linux

The most common huge page size is 2MB. You can reserve these at boot time through the Talos machine configuration:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - hugepagesz=2M              # Set huge page size to 2MB
      - hugepages=512              # Reserve 512 huge pages (1GB total)
      - transparent_hugepage=never # Disable THP
  sysctls:
    vm.nr_hugepages: "512"         # Also set via sysctl for runtime adjustment
```

This reserves 512 pages of 2MB each, totaling 1GB of memory dedicated to huge pages. This memory is reserved at boot time and is not available for regular allocations.

## Configuring 1GB Huge Pages

For applications that need even larger pages, 1GB huge pages are available on supported hardware. These must be allocated at boot time because finding contiguous 1GB regions after the system has been running is nearly impossible.

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - hugepagesz=1G              # Set huge page size to 1GB
      - hugepages=4                # Reserve 4 huge pages (4GB total)
      - default_hugepagesz=2M     # Keep default at 2MB for general use
```

Note that 1GB huge pages require CPU support for the `pdpe1gb` flag. Most modern server CPUs support this, but you should verify before configuring.

## Disabling Transparent Huge Pages

Transparent Huge Pages (THP) is a Linux feature that automatically merges regular 4KB pages into 2MB pages in the background. While this sounds helpful, it causes serious problems for latency-sensitive workloads.

The THP daemon periodically scans memory to find opportunities for merging, and this compaction process causes latency spikes that can last tens of milliseconds. Database vendors like Redis, MongoDB, and Oracle explicitly recommend disabling THP.

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - transparent_hugepage=never  # Completely disable THP
```

With THP disabled, applications that want huge pages must explicitly request them, giving you full control over which workloads use them.

## Exposing Huge Pages to Kubernetes Pods

Kubernetes supports huge pages as a schedulable resource. Once your Talos nodes have huge pages configured, pods can request them:

```yaml
# pod-with-hugepages.yaml
apiVersion: v1
kind: Pod
metadata:
  name: hugepage-app
spec:
  containers:
  - name: app
    image: my-app:latest
    resources:
      requests:
        memory: "256Mi"
        hugepages-2Mi: "512Mi"       # Request 512MB of 2MB huge pages
      limits:
        memory: "256Mi"
        hugepages-2Mi: "512Mi"       # Limits must match requests
    volumeMounts:
    - name: hugepage
      mountPath: /dev/hugepages      # Mount the hugetlbfs
  volumes:
  - name: hugepage
    emptyDir:
      medium: HugePages-2Mi         # Use 2MB huge pages
```

A few important details about this configuration. The requests and limits for huge pages must be equal. Kubernetes does not support overcommitting huge pages because they are pre-allocated. The pod must also mount a volume backed by hugetlbfs to access the huge pages.

## Using Huge Pages with DPDK Applications

DPDK (Data Plane Development Kit) is one of the most common users of huge pages. DPDK bypasses the kernel network stack for ultra-low-latency packet processing, and it requires huge pages for its memory pools.

```yaml
# dpdk-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: dpdk-app
spec:
  containers:
  - name: dpdk
    image: dpdk-app:latest
    securityContext:
      privileged: true              # DPDK needs privileged access
    resources:
      requests:
        hugepages-1Gi: "2Gi"       # Request 2GB of 1GB huge pages
        memory: "1Gi"
        cpu: "4"
      limits:
        hugepages-1Gi: "2Gi"
        memory: "1Gi"
        cpu: "4"
    volumeMounts:
    - name: hugepage-1gi
      mountPath: /dev/hugepages-1048576kB
    - name: hugepage-2mi
      mountPath: /dev/hugepages
  volumes:
  - name: hugepage-1gi
    emptyDir:
      medium: HugePages-1Gi
  - name: hugepage-2mi
    emptyDir:
      medium: HugePages-2Mi
```

## Using Huge Pages with Databases

PostgreSQL can use huge pages for its shared buffer pool. Here is how to configure a PostgreSQL pod to use them:

```yaml
# postgresql-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgresql
spec:
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:16
        env:
        - name: POSTGRES_SHARED_BUFFERS
          value: "4GB"
        command:
        - postgres
        - -c
        - shared_buffers=4GB
        - -c
        - huge_pages=on              # Tell PostgreSQL to use huge pages
        resources:
          requests:
            hugepages-2Mi: "4Gi"     # Match shared_buffers size
            memory: "2Gi"
          limits:
            hugepages-2Mi: "4Gi"
            memory: "2Gi"
        volumeMounts:
        - name: hugepage
          mountPath: /dev/hugepages
      volumes:
      - name: hugepage
        emptyDir:
          medium: HugePages-2Mi
```

## Monitoring Huge Page Usage

You can monitor huge page allocation and usage on your Talos nodes:

```bash
# Check huge page allocation
talosctl read /proc/meminfo --nodes 10.0.0.1 | grep -i huge

# Expected output:
# AnonHugePages:         0 kB
# ShmemHugePages:        0 kB
# HugePages_Total:     512
# HugePages_Free:      256
# HugePages_Rsvd:        0
# HugePages_Surp:        0
# Hugepagesize:       2048 kB
```

If `HugePages_Free` is consistently zero, your workloads need more huge pages than you have allocated. Increase the count in your machine configuration.

## Calculating Huge Page Requirements

To determine how many huge pages you need, add up the huge page requests from all pods that will run on a node, then add a small buffer:

```
Total needed = Sum of all pod hugepage requests + 10% buffer

Example:
- PostgreSQL: 4GB of 2MB huge pages
- DPDK app: 2GB of 2MB huge pages
- Buffer: 0.6GB

Total: 6.6GB / 2MB = 3,380 huge pages

Machine config: vm.nr_hugepages: "3400"
```

Remember that huge page memory is reserved and unavailable for other uses. Over-allocating huge pages starves the rest of the system of memory.

## Applying and Verifying the Configuration

Apply your huge page configuration through talosctl:

```bash
# Apply the configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Reboot is required for kernel arg changes
talosctl reboot --nodes 10.0.0.1

# After reboot, verify huge pages are allocated
talosctl read /proc/meminfo --nodes 10.0.0.1
```

## Conclusion

Huge pages on Talos Linux provide a significant performance boost for memory-intensive workloads. The key is to plan your allocation carefully, disable transparent huge pages, and ensure your pods are configured to request and mount the huge page volumes. Start with 2MB pages for most workloads and consider 1GB pages for DPDK or very large memory consumers. Always monitor your huge page utilization to avoid both waste and shortages.
