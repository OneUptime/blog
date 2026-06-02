# Validation Summary: Perform a Test Failover in Azure Site Recovery Without Affecting Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Site Recovery
- Azure Recovery Services vaults
- Azure CLI
- Azure PowerShell Az.RecoveryServices
- Azure PowerShell Az.Compute
- Azure Virtual Network
- Azure VM boot diagnostics and Run Command

## Sources Consulted
- Microsoft Learn: Run a test failover (disaster recovery drill) to Azure in Azure Site Recovery - https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-test-failover-to-azure
- Microsoft Learn: About failover and failback in Azure Site Recovery - Modernized - https://learn.microsoft.com/en-us/azure/site-recovery/failover-failback-overview-modernized
- Microsoft Learn: az network vnet - https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Microsoft Learn: az network vnet subnet - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Microsoft Learn: Start-AzRecoveryServicesAsrTestFailoverJob - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/start-azrecoveryservicesasrtestfailoverjob?view=azps-15.5.0
- Microsoft Learn: Get-AzRecoveryServicesAsrFabric - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/get-azrecoveryservicesasrfabric?view=azps-15.3.0
- Microsoft Learn: Get-AzRecoveryServicesAsrProtectionContainer - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/get-azrecoveryservicesasrprotectioncontainer?view=azps-13.4.0
- Microsoft Learn: Get-AzRecoveryServicesAsrReplicationProtectedItem - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/get-azrecoveryservicesasrreplicationprotecteditem?view=azps-15.3.0
- Microsoft Learn: Get-AzRecoveryServicesAsrRecoveryPoint - https://learn.microsoft.com/es-es/powershell/module/az.recoveryservices/get-azrecoveryservicesasrrecoverypoint?view=azps-15.3.0
- Microsoft Learn: Get-AzRecoveryServicesAsrJob - https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/get-azrecoveryservicesasrjob?view=azps-15.2.0
- Microsoft Learn: Get-AzVMBootDiagnosticsData - https://learn.microsoft.com/en-us/powershell/module/az.compute/get-azvmbootdiagnosticsdata?view=azps-15.6.0
- Microsoft Learn: Invoke-AzVMRunCommand - https://learn.microsoft.com/en-us/powershell/module/az.compute/invoke-azvmruncommand?view=azps-14.2.0

## Issues Found
- Updated Azure CLI VNet and subnet examples to use the current documented `--address-prefixes` and `--subnet-prefixes` / `--address-prefixes` parameters.
- Corrected the test network guidance to match Microsoft documentation: an isolated test network should use matching subnet names and address ranges when preserving configured subnet placement and IP addresses is required.
- Added the recovery plan-specific multi-VM recovery point options and clarified that app-consistent points must be enabled and that custom recovery points apply to a specific VM.
- Fixed the PowerShell ASR item lookup by retrieving fabrics and passing them to `Get-AzRecoveryServicesAsrProtectionContainer`, whose `-Fabric` parameter is mandatory.
- Fixed the boot diagnostics PowerShell snippet by adding the mandatory `-LocalPath` parameter for Windows boot diagnostics downloads.
- Replaced the incorrect statement that the Azure test network has no DHCP server with the documented behavior that Site Recovery falls back to another subnet or available IP when the configured subnet or IP is unavailable.

## Review Notes
PowerShell Core and Azure CLI were not installed in the local workspace, so command execution could not be tested locally. Syntax and parameter validation were checked against current Microsoft Learn documentation instead.
