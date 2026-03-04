# How to Configure Transparent Hugepages for Application Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, HugePages, Performance, Linux

Description: Learn how to configure Transparent Hugepages for Application Performance on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Transparent Hugepages (THP) allow the kernel to automatically use larger memory pages (2 MB instead of 4 KB) without application changes. This can improve performance for memory-intensive workloads by reducing TLB (Translation Lookaside Buffer) misses.

## Prerequisites

- RHEL
- Root or sudo access

## Understanding Hugepages vs THP

Regular pages: 4 KB
Hugepages: 2 MB (or 1 GB)
THP: Kernel automatically promotes regular pages to huge pages

## Step 1: Check Current THP Status

```bash
cat /sys/kernel/mm/transparent_hugepage/enabled
```

Output shows three options with the current one in brackets:

```bash
[always] madvise never
```

## Step 2: Configure THP Mode

### Always (default)

The kernel aggressively uses huge pages for all memory:

```bash
echo always | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

### madvise

Huge pages are used only when applications explicitly request them via `madvise()`:

```bash
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

### never

Disable THP entirely:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

## Step 3: Configure Defragmentation

THP defragmentation controls how aggressively the kernel compacts memory to create huge pages:

```bash
cat /sys/kernel/mm/transparent_hugepage/defrag
```

```bash
echo defer+madvise | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

Options:
- `always` - Synchronous defrag (can cause latency spikes)
- `defer` - Asynchronous defrag via khugepaged
- `defer+madvise` - Defer for most, sync for madvise
- `madvise` - Only defrag for madvise regions
- `never` - No defragmentation

## Step 4: Make Settings Persistent

Create a systemd service or use kernel parameters:

```bash
sudo grubby --update-kernel=ALL --args="transparent_hugepage=madvise"
```

Or create a systemd tmpfiles rule:

```bash
sudo vi /etc/tmpfiles.d/thp.conf
```

```bash
w /sys/kernel/mm/transparent_hugepage/enabled - - - - madvise
w /sys/kernel/mm/transparent_hugepage/defrag - - - - defer+madvise
```

## Step 5: Monitor THP Usage

```bash
grep -i huge /proc/meminfo
```

Key metrics:
- `AnonHugePages` - Anonymous memory using THP
- `HugePages_Total` - Static huge pages allocated
- `HugePages_Free` - Static huge pages available

## When to Disable THP

Some applications perform worse with THP due to memory fragmentation and latency from defragmentation. Common cases include:
- Databases (Redis, MongoDB, Oracle often recommend disabling THP)
- Real-time applications
- Applications with many small, short-lived memory allocations

## Conclusion

Transparent Hugepages on RHEL can boost performance for memory-intensive workloads by reducing TLB pressure. However, the right setting depends on your application. Use `madvise` mode as a balanced default, and disable THP entirely if you experience latency spikes from memory compaction.
