# Validation Summary: How to Convert Azure Managed Disks Between Disk Types

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Managed Disks
- Azure Virtual Machines
- Azure CLI
- Azure PowerShell
- Azure SDK for Python

## Sources Consulted
- Microsoft Learn: Convert managed disks storage between different disk types - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-convert-types
- Microsoft Learn: Azure managed disk types - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Microsoft Learn: Performance tiers for Azure managed disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-change-performance
- Microsoft Learn: Azure CLI az disk reference - https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: Azure CLI az vm reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Azure: Managed Disks pricing - https://azure.microsoft.com/en-us/pricing/details/managed-disks/

## Issues Found
- The post said Ultra Disk and Premium SSD v2 generally could not be converted to or from directly. Azure documentation now allows eligible existing disks to be converted directly to Premium SSD v2, with restrictions, while Premium SSD v2 cannot be converted back directly. Updated the caveat to distinguish Ultra Disk from Premium SSD v2.
- The post did not mention Azure's documented limit of two disk type changes per day. Added this limitation to the supported conversions section.
- The VM size compatibility example used `az vm list-sizes`, which Azure CLI marks as deprecated, and it only displayed maximum disk count rather than Premium storage support. Replaced it with `az vm list-skus` and a query for the `PremiumIO` capability.
- The VM size compatibility text said a converted Premium SSD disk would not mount on an unsupported VM size. Reworded this to the documented requirement: use or resize to a Premium-storage-capable VM size before using Premium managed disks.

## Review Notes
The cost figures are presented as rough monthly examples and align with the order of magnitude shown by Azure Managed Disks pricing for 256 GiB LRS disk tiers, but actual prices vary by region, redundancy, currency, offer, and transaction charges.
