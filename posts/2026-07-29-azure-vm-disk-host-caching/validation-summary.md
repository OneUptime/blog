# Validation Summary: Azure VM Disk Host Caching: None, ReadOnly, or ReadWrite

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft Azure Virtual Machines
- Azure managed disks
- Azure host caching and BlobCache
- Standard HDD, Standard SSD, Premium SSD, Premium SSD v2, and Ultra Disk
- Azure Monitor disk performance metrics
- Azure CLI and JMESPath queries
- Linux `iostat` and Windows PhysicalDisk performance counters
- SQL Server storage guidance

## Sources Consulted

- [Virtual machine and disk performance](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-performance)
- [Azure premium storage: Design for high performance](https://learn.microsoft.com/en-us/azure/virtual-machines/premium-storage-performance)
- [Disk performance metrics](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-metrics)
- [Frequently asked questions about Azure IaaS VM disks and Premium SSD managed disks](https://learn.microsoft.com/en-us/azure/virtual-machines/faq-for-disks)
- [Select a disk type for Azure IaaS VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)
- [Enable shared disks for Azure managed disks](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-shared-enable)
- [Azure CLI `az vm` reference](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest)
- [Query Azure CLI command results](https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-query?view=azure-cli-latest)
- [Virtual Machines - Get REST API](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/get?view=rest-compute-2026-03-01)
- [Collect performance metrics for a Linux VM in Microsoft Azure](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/collect-performance-metrics-from-a-linux-system)

## Issues Found

- The mode-selection summary referred to supported "stale-cache" behavior, but Azure's documented ReadOnly path keeps writes coherent by completing them against both cache and disk. Reworded the recommendation so it does not imply that accepting stale reads is a ReadOnly prerequisite.
- The None section described an uncached path without identifying the OS-disk exception. Scoped that behavior to data disks and documented that None is unsupported for OS disks; Azure internally uses ReadOnly if None is selected there.
- The ReadOnly section described writes only as continuing to persistent storage and invalidating cached content. Replaced that statement with Microsoft's documented behavior: a write completes after reaching both the cache and managed disk and consumes both cached and uncached VM limits.
- The cache-change section said a setting change merely could detach and reattach a disk. Updated it to the documented behavior that Azure detaches and reattaches the target disk, and also restarts the VM when the target is the OS disk.
- The monitoring section presented disk latency metrics without their current availability caveat. Added that OS Disk Latency and Data Disk Latency are preview metrics and are unavailable for disks attached through an NVMe controller.

## Review Notes

- The Azure CLI command, options, response property paths, and JMESPath multiselect expression are valid. The expression was also evaluated against a representative current VM response shape and returned the intended OS-disk object and data-disk array.
- Ultra Disk and Premium SSD v2 host-caching restrictions, the less-than-4-TiB cache-size limit, the named cached and uncached utilization metrics, SQL Server data/log guidance, shared-disk caveats, and ReadWrite durability warnings agree with current Microsoft documentation.
- Disk and VM capabilities are service-specific and can change, so readers should continue following the post's advice to check the selected disk-type and VM-size documentation before making a change.
