# Validation Summary: How to Configure Azure VM Availability Sets for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure availability sets
- Azure availability zones
- Azure fault domains and update domains
- Azure managed disks
- Azure Load Balancer
- Azure CLI
- Azure Monitor concepts

## Sources Consulted
- Microsoft Learn: Availability sets overview - https://learn.microsoft.com/en-us/azure/virtual-machines/availability-set-overview
- Microsoft Learn: Azure CLI `az vm availability-set` reference - https://learn.microsoft.com/en-us/cli/azure/vm/availability-set?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network lb rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/lb/rule?view=azure-cli-latest
- Microsoft Learn: Quickstart create a public load balancer with Azure CLI - https://learn.microsoft.com/en-us/azure/load-balancer/quickstart-load-balancer-standard-public-cli
- Microsoft Learn: Change the availability set for a VM - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/change-availability-set
- Microsoft Learn: Azure availability zones overview - https://learn.microsoft.com/en-ie/azure/reliability/availability-zones-overview

## Issues Found
- The availability zones comparison said cross-zone traffic has costs. Current Microsoft documentation states Azure does not charge for data transfer across availability zones, so the cost row was updated.
- The availability zones latency row said latency is typically 1-2ms. Microsoft documents a target of less than approximately 2ms round-trip latency between zones, with observed latency dependent on protocol and path, so the row was made more precise.
- The monitoring example queried `provisioningState`, which is deployment state rather than runtime VM health or power state. The example was changed to use `az vm get-instance-view` and extract each VM's power state.

## Review Notes
- The Azure CLI binary was not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
- Microsoft now recommends Virtual Machine Scale Sets with flexible orchestration mode for high availability with the broadest feature set, but availability sets remain supported and technically relevant.
