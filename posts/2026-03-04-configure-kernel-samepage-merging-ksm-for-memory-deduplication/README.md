# How to Configure Kernel Samepage Merging (KSM) for Memory Deduplication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, KSM, Linux

Description: Learn how to configure Kernel Samepage Merging (KSM) for Memory Deduplication on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Kernel Samepage Merging (KSM) scans memory for identical pages and merges them into a single copy, reducing physical memory usage. This is particularly useful on KVM hypervisors where multiple virtual machines run similar operating systems.

## Prerequisites

- RHEL
- Root or sudo access
- `ksmtuned` package installed

## How KSM Works

KSM runs as a kernel thread (`ksmd`) that periodically scans memory regions marked as mergeable. When it finds identical pages, it replaces them with a single shared copy using copy-on-write semantics.

## Step 1: Enable KSM

```bash
sudo systemctl enable --now ksm
sudo systemctl enable --now ksmtuned
```

Verify KSM is active:

```bash
cat /sys/kernel/mm/ksm/run
```

`1` means active, `0` means stopped.

## Step 2: Check KSM Statistics

```bash
cat /sys/kernel/mm/ksm/pages_shared
cat /sys/kernel/mm/ksm/pages_sharing
cat /sys/kernel/mm/ksm/pages_unshared
```

- `pages_shared` - Shared KSM pages being used
- `pages_sharing` - Additional mappings sharing those pages (this is the approximate pages saved)
- `pages_unshared` - Unique pages repeatedly checked for merging

Memory saved = `pages_sharing` x system page size

## Step 3: Tune KSM Parameters

### Scan Rate

```bash
echo 200 | sudo tee /sys/kernel/mm/ksm/sleep_millisecs
echo 500 | sudo tee /sys/kernel/mm/ksm/pages_to_scan
```

Lower `sleep_millisecs` and higher `pages_to_scan` means more aggressive scanning but higher CPU usage.

## Step 4: Configure ksmtuned

ksmtuned automatically adjusts KSM based on system load:

```bash
sudo vi /etc/ksmtuned.conf
```

```ini
KSM_THRES_COEF=20
KSM_THRES_CONST=2048
LOGFILE=/var/log/ksmtuned
DEBUG=1
```

## Step 5: Monitor KSM Performance

```bash
watch -n 5 'grep -H . /sys/kernel/mm/ksm/pages_*'
```

## Step 6: Verify Memory Savings

```bash
echo "Pages saved: $(cat /sys/kernel/mm/ksm/pages_sharing)"
page_size=$(getconf PAGESIZE)
echo "Memory saved: $(( $(cat /sys/kernel/mm/ksm/pages_sharing) * page_size / 1024 / 1024 )) MB"
```

## When to Use KSM

KSM is most effective when:
- Running many similar VMs (same OS, same applications)
- Memory is the bottleneck for VM density
- CPU overhead from scanning is acceptable

## Conclusion

KSM on RHEL reduces memory usage by merging identical pages across processes and VMs. It is especially valuable on KVM hypervisors where it can significantly increase VM density. Use ksmtuned for automatic tuning based on workload characteristics.
