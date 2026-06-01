# Validation Summary: How to Optimize Azure VM Disk Performance by Choosing the Right Storage Tier

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Virtual Machines
- Azure Managed Disks
- Ultra Disk
- Premium SSD v2
- Premium SSD
- Standard SSD
- Standard HDD
- Azure Monitor metrics
- Azure CLI
- Linux iostat and mdadm
- Windows Performance Monitor and Storage Spaces

## Sources Consulted
- Microsoft Learn: Azure managed disk types - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Microsoft Learn: Scalability and performance targets for VM disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-scalability-targets
- Microsoft Learn: Managed disk bursting - https://learn.microsoft.com/en-us/azure/virtual-machines/disk-bursting
- Microsoft Learn: Disk performance metrics - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-metrics
- Microsoft Learn: Dsv5 sizes series - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series
- Microsoft Learn: Azure disk frequently asked questions - https://learn.microsoft.com/en-us/azure/virtual-machines/faq-for-disks
- Microsoft Learn: Azure CLI az disk reference - https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: Azure CLI az vm reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Azure pricing: Managed Disks - https://azure.microsoft.com/en-us/pricing/details/managed-disks/

## Issues Found
- Updated the managed disk comparison table because current Microsoft documentation lists Ultra Disk at up to 400,000 IOPS and 10,000 MB/s, Premium SSD v2 at up to 2,000 MB/s, and Standard HDD at up to 3,000 IOPS only when performance plus is enabled.
- Replaced fixed Premium SSD v2 add-on pricing numbers with wording that reflects the current pricing model, because Azure pricing varies and the official pricing page bills Premium SSD v2 capacity, IOPS, and throughput separately.
- Corrected the Ultra Disk snapshot limitation. Ultra Disk does support snapshots, but only incremental snapshots with extra limitations.
- Corrected disk bursting eligibility. Credit-based bursting applies to Premium SSD disks 512 GiB and smaller and Standard SSD disks 1,024 GiB and smaller; on-demand bursting applies only to Premium SSD disks larger than 512 GiB.
- Corrected the Azure Monitor burst credit metric example to use the documented VM metrics for data disk burst I/O and bandwidth credit usage.
- Replaced the deprecated `az vm list-sizes` example with `az vm list-skus`, and corrected the Standard_D4s_v5 uncached throughput value from 150 MB/s to 145 MB/s.

## Review Notes
The local environment does not have Azure CLI installed, so CLI syntax was checked against the official Azure CLI documentation rather than local `az --help` output.
