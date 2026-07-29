# Validation Summary: Diagnose Azure VM Disk Throttling

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Azure Virtual Machines
- Azure Managed Disks
- Azure Monitor metrics
- Azure CLI and JMESPath queries
- Linux block-device tooling (`lsblk`, `iostat`, and Azure disk symlinks)
- Windows Storage PowerShell and Performance Monitor
- Azure disk-level and VM-level bursting

## Sources Consulted

- Azure disk performance metrics — https://learn.microsoft.com/en-us/azure/virtual-machines/disks-metrics
- Supported metrics for `Microsoft.Compute/virtualMachines` — https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Virtual machine and disk performance — https://learn.microsoft.com/en-us/azure/virtual-machines/disks-performance
- Managed disk bursting — https://learn.microsoft.com/en-us/azure/virtual-machines/disk-bursting
- Azure Disk Storage scalability and performance targets — https://learn.microsoft.com/en-us/azure/virtual-machines/disks-scalability-targets
- Azure premium storage: Design for high performance — https://learn.microsoft.com/en-us/azure/virtual-machines/premium-storage-performance
- Azure CLI `az vm` reference — https://learn.microsoft.com/en-us/cli/azure/vm
- Query Azure CLI command output with JMESPath — https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-query
- Add a data disk to a Linux VM using Azure CLI — https://learn.microsoft.com/en-us/azure/virtual-machines/linux/add-disk
- Convert Linux and Windows VMs from SCSI to NVMe — https://learn.microsoft.com/en-us/azure/virtual-machines/nvme-linux
- Map Azure disks to Windows VM guest disks — https://learn.microsoft.com/en-us/azure/virtual-machines/windows/azure-to-guest-disk-mapping
- Windows PowerShell `Get-Disk` reference — https://learn.microsoft.com/en-us/powershell/module/storage/get-disk
- Windows PowerShell `Get-Partition` reference — https://learn.microsoft.com/en-us/powershell/module/storage/get-partition

## Issues Found

1. **Consumed-percentage metric availability was overstated**: The post presented the eight storage utilization metrics without their platform limitation. Added that these metrics are available only on VM series that support Premium Storage, matching the Azure metric definitions.
2. **Azure Monitor latency was described as separate read/write latency**: Azure exposes combined `OS Disk Latency` and `Data Disk Latency` platform metrics rather than separate read and write latency metrics. Replaced the wording and documented that these metrics are in preview and unavailable for disks attached through an NVMe controller.
3. **VM bursting was incorrectly grouped with on-demand bursting**: On-demand bursting is a disk-level option; VM-level bursting uses only the credit-based model. Separated these cases and clarified that credit exhaustion corresponds to depletion of the credit bucket and an applicable used burst-credit percentage approaching 100%.

## Review Notes

- The P30/12,800-IOPS example matches Microsoft's documented `Standard_D8s_v3` VM-capping example.
- The Azure CLI command, JMESPath projection, Linux commands, and Windows PowerShell commands are syntactically valid and use current fields and options.
- The post correctly notes that `/dev/disk/azure/scsi1` depends on guest-image support and that NVMe-backed VMs require a different mapping procedure.
- Azure documents platform metrics at one-minute sampling, burst-credit percentage metrics at five-minute emission intervals, and the on-demand burst operations metric at an hourly interval.
- No technology versions are pinned in the post, and no deprecated APIs or commands were found.
