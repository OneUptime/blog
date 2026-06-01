# Validation Summary: How to Configure AKS Stop and Start Feature for Dev/Test Cluster Cost Savings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Azure Automation
- Azure PowerShell
- Azure managed identities and RBAC
- Azure SDK for Python
- Kubernetes Services, LoadBalancers, PersistentVolumes, and PersistentVolumeClaims
- GitHub Actions

## Sources Consulted
- Microsoft Learn: Start and stop an Azure Kubernetes Service cluster - https://learn.microsoft.com/en-us/azure/aks/start-stop-cluster
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI `az automation account` reference - https://learn.microsoft.com/en-us/cli/azure/automation/account
- Microsoft Learn: Azure CLI `az automation schedule` reference - https://learn.microsoft.com/en-us/cli/azure/automation/schedule
- Microsoft Learn: Azure PowerShell `New-AzAutomationSchedule` reference - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationschedule
- Microsoft Learn: Azure PowerShell `Register-AzAutomationScheduledRunbook` reference - https://learn.microsoft.com/en-us/powershell/module/az.automation/register-azautomationscheduledrunbook
- Microsoft Learn: Use a static public IP address and DNS label with the Azure Kubernetes Service load balancer - https://learn.microsoft.com/en-us/azure/aks/static-ip
- Kubernetes documentation: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- GitHub Actions documentation: Events that trigger workflows, schedule - https://docs.github.com/en/actions/reference/events-that-trigger-workflows#schedule
- Azure Login GitHub Action - https://github.com/Azure/login

## Issues Found
- The AKS stop/start behavior overstated that everything comes back unchanged. Updated the post to note that standalone pods not managed by a controller are deleted, the API server IP may change, and stopped cluster state is preserved for up to 12 months.
- The prerequisites omitted current AKS stop/start limitations. Added the Virtual Machine Scale Sets requirement and the Node Autoprovisioning limitation.
- The post said Services get new NodePorts after start. This is not correct for preserved Kubernetes Service objects, so the wording now says Services are restored from saved Kubernetes objects.
- The Azure Automation identity setup claimed a managed identity existed without enabling one. Added an `az resource update` command to assign a system-managed identity before reading `identity.principalId`.
- The Azure Automation schedule example created schedules but did not link them to runbooks, and the weekly CLI schedules shown would not actually represent Monday-Friday schedules. Replaced that section with Azure PowerShell commands that create weekday schedules and register the schedules against the stop/start runbooks.
- The GitHub Actions examples used `azure/login@v1`. Updated them to `azure/login@v3`, the current major version.
- The LoadBalancer section implied stop/start itself necessarily changes LoadBalancer IPs. Adjusted the wording to focus on dynamic IP changes when Service or load balancer resources are recreated, and noted the newer Azure Load Balancer IPv4 annotation.
- The PVC troubleshooting advice recommended deleting and recreating PVCs. That can delete the backing disk when the PersistentVolume reclaim policy is `Delete`, so it now recommends restarting the affected pod first and warns against deleting PVCs as a first response.

## Review Notes
The cost examples are region- and pricing-plan-dependent, but they are framed as approximate values. Future revisions could add an Azure Retail Prices API query or Azure Pricing Calculator link so readers can calculate costs for their region and VM purchase option.
