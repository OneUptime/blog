# Validation Summary: How to Migrate an Azure Virtual Machine to a Different Region

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure Site Recovery
- Azure Resource Mover
- Azure Managed Disks and snapshots
- Azure CLI
- Azure DNS
- Azure networking resources

## Sources Consulted
- Microsoft Learn: Move Azure VMs to a different Azure region with Azure Site Recovery - https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-migrate
- Microsoft Learn: Move resources across regions with Azure Resource Mover - https://learn.microsoft.com/en-us/azure/resource-mover/move-region-within-resource-group
- Microsoft Learn: Support matrix for moving Azure VMs to another region with Azure Resource Mover - https://learn.microsoft.com/en-us/azure/resource-mover/support-matrix-move-region-azure-vm
- Microsoft Learn: Azure CLI `az backup vault` reference - https://learn.microsoft.com/en-us/cli/azure/backup/vault
- Microsoft Learn: Azure CLI `az site-recovery protected-item` reference - https://learn.microsoft.com/en-us/cli/azure/site-recovery/protected-item
- Microsoft Learn: Azure CLI `az snapshot` reference - https://learn.microsoft.com/en-us/cli/azure/snapshot
- Microsoft Learn: Azure CLI `az disk` reference - https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Manage DNS records in Azure DNS using the Azure CLI - https://learn.microsoft.com/en-us/azure/dns/dns-operations-recordsets-cli
- Microsoft Learn: Azure CLI `az network dns record-set` reference - https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set

## Issues Found
- The post described Azure Site Recovery as the recommended production migration approach. Microsoft currently recommends Azure Resource Mover as the hub for moving Azure VMs across regions, while Resource Mover uses Site Recovery on the backend for VM replication. Updated the introduction, method comparison, and conclusion to reflect this.
- The Recovery Services vault instructions said to create the vault in the target region. Official Site Recovery guidance says the vault can be created in any supported region except the source region. Updated the wording while keeping the target-region example.
- The ASR target-resource description implied Azure auto-generates all target settings and associated resources. Official guidance says Site Recovery can discover/create the virtual network, but other networking components may need to be created manually. Updated the setup and failover text.
- The ASR monitoring command only listed Recovery Services vault resources, not replication health. Replaced it with an `az site-recovery protected-item list` example that queries replication health and protection state.
- The ASR migration steps used "Migrate", "Latest processed", and "Complete migration" labels. Updated these to match the documented Site Recovery flow: "Failover", "Latest", and "Commit".
- The snapshot migration flow created data-disk snapshots but did not copy those snapshots to the target region, create disks from them, or attach the created disks. Added loops for copying data-disk snapshots, creating managed disks, and attaching those disks.
- The VM creation example hardcoded Linux without noting Windows. Added a short note to use `--os-type Windows` for Windows VMs.
- The Azure DNS command attempted to mutate an A record with `az network dns record-set a update --set aRecords[0].ipv4Address=...`. Official Azure DNS guidance recommends adding the new A record and removing the old one. Replaced the command with `add-record` and `remove-record`.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against official Microsoft Learn CLI references and Azure service documentation.
