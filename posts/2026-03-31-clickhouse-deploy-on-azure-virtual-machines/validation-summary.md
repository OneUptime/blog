# Validation Summary: How to Deploy ClickHouse on Azure Virtual Machines

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (server + client, APT repository install)
- Azure Virtual Machines (Ev5, Dv5, Fsv2 SKU families)
- Azure CLI (`az vm`, `az network nsg`, `az vm disk attach`)
- Azure Premium SSD v2 (`PremiumV2_LRS`)
- Azure Network Security Groups (NSG rules)
- Ubuntu 22.04 LTS (Jammy, Gen2)
- Linux disk management (parted, mkfs.ext4, fstab)
- systemd service management
- Linux OS tuning (ulimits, transparent huge pages, rc.local)

## Sources Consulted
- ClickHouse official Debian/Ubuntu install docs: https://clickhouse.com/docs/install/debian_ubuntu
- Azure Ev5-series specs: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/ev5-series
- Azure Fsv2-series specs: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/fsv2-series
- Azure Dv5-series specs: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dv5-series
- Azure managed disk types: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Azure CLI reference for `az vm create` and `az vm disk attach`
- Ubuntu Azure marketplace image reference: https://documentation.ubuntu.com/azure/azure-how-to/instances/find-ubuntu-images/

## Issues Found
No technical issues found.

All Azure VM SKU specifications (vCPU/RAM for D4s_v5, E16s_v5, E32s_v5, F32s_v2) are accurate. The ClickHouse APT repository GPG key URL (`https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key`) is intentional per official ClickHouse documentation — it is a shared CDN path even though the `/rpm/` segment looks surprising for an APT install. The `PremiumV2_LRS` SKU name, the Ubuntu 22.04 Gen2 marketplace URN, the NSG auto-naming convention (`${VM_NAME}NSG`), and the `az network nsg rule create` flag set all check out. Commands for partitioning, mounting, moving the data directory via symlink, and disabling transparent huge pages are syntactically and semantically correct.

## Review Notes
- The `/dev/sdc` device path is correct for v5 SCSI-based VMs at LUN 0, but on newer NVMe-backed VM generations (e.g., v6 families) the device would appear as `/dev/nvme0n2`. Readers deploying on non-v5 SKUs may need to adapt.
- `/etc/rc.local` is not enabled by default on modern systemd-based Ubuntu; the script creation works, but some Ubuntu images require enabling `rc-local.service` or using a systemd unit for the THP settings to persist reliably across reboots. The approach shown still works on Ubuntu 22.04 when the file is marked executable, but a systemd-native alternative would be more robust.
- Newer ClickHouse server packages interactively prompt for a default-user password during `apt-get install`. Using `-y` does not bypass this prompt; scripting the install may require `DEBIAN_FRONTEND=noninteractive` or pre-seeding `debconf` in fully automated scenarios.
- The post could benefit from mentioning that Premium SSD v2 disks have regional/zonal availability constraints and must match the VM's availability zone.
