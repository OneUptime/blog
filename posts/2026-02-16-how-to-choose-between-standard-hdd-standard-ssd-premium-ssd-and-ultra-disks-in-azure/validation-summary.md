# Validation Summary: How to Choose Between Standard HDD, Standard SSD, Premium SSD, and Ultra Disks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Managed Disks
- Standard HDD managed disks
- Standard SSD managed disks
- Premium SSD managed disks
- Premium SSD v2 managed disks
- Ultra Disks
- Azure CLI
- Azure Virtual Machines

## Sources Consulted
- Microsoft Learn: Azure managed disk types: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Microsoft Learn: Scalability and performance targets for VM disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-scalability-targets
- Microsoft Learn: Managed disk bursting: https://learn.microsoft.com/en-us/azure/virtual-machines/disk-bursting
- Microsoft Learn: Deploy a Premium SSD v2 managed disk: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-deploy-premium-v2
- Microsoft Learn: Ultra disks for VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-enable-ultra-ssd
- Microsoft Learn: Create an incremental snapshot: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-incremental-snapshots
- Microsoft Learn: Understand Azure Disk Storage billing: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-understand-billing
- Azure CLI reference: az disk: https://learn.microsoft.com/en-us/cli/azure/disk
- Azure CLI reference: az vm list-skus: https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft licensing SLA page for Online Services: https://www.microsoft.com/licensing/docs/view/Service-Level-Agreements-SLA-for-Online-Services
- Azure Retail Prices API: https://prices.azure.com/api/retail/prices

## Issues Found
- Azure now documents five managed disk types, including Premium SSD v2. Updated the introduction from "four" to "five" and changed the "Four Disk Types" heading to "Main Disk Types" while preserving the post's focus.
- The 512 GiB performance table listed Standard SSD throughput as 60 MB/s. Updated it to 100 MB/s, matching the documented E20 base throughput.
- The 512 GiB performance table listed Ultra Disk at 160,000 IOPS and 4,000 MB/s. Updated it to 400,000 IOPS and 10,000 MB/s, matching current documented Ultra Disk caps.
- The latency row used overly specific approximate values that did not match Microsoft documentation. Updated it to documented latency ranges: Standard HDD write/read targets, single-digit millisecond SSD latency, and sub-millisecond Ultra Disk latency.
- The SLA row said Standard HDD had no single-disk SLA. Updated it to describe single-VM SLA values, including 95% for Standard HDD, 99.5% for Standard SSD, and 99.9% for Premium SSD and Ultra Disk configurations.
- The Ultra Disk section said disk snapshots are not supported. Updated this to clarify that Ultra Disks support incremental snapshots with extra restrictions, while full snapshots are not supported.
- The VM compatibility command used `az vm list-sizes`, which Azure CLI documentation marks as deprecated. Replaced it with `az vm list-skus` and a PremiumIO capability query.

## Review Notes
Azure CLI is not installed in this workspace, so CLI syntax was verified against the official Azure CLI reference rather than local `az --help`. Prices vary by region, currency, and offer; the post's East US retail examples for 512 GiB Standard HDD, Standard SSD, and Premium SSD matched the Azure Retail Prices API at review time.
