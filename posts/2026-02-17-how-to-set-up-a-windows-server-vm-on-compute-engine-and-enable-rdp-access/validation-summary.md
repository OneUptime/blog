# Validation Summary: How to Set Up a Windows Server VM on Compute Engine and Enable RDP Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Windows Server on Compute Engine
- Remote Desktop Protocol (RDP)
- Identity-Aware Proxy (IAP) TCP forwarding
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- PowerShell startup scripts
- WinRM / PowerShell Remoting
- SQL Server images on Compute Engine
- Active Directory domain joining

## Sources Consulted
- Google Cloud documentation: Create and manage Windows Server VMs - https://cloud.google.com/compute/docs/instances/windows/creating-managing-windows-instances
- Google Cloud documentation: Operating system details for Compute Engine images - https://cloud.google.com/compute/docs/images/os-details
- Google Cloud documentation: Connect to Windows VMs using RDP - https://cloud.google.com/compute/docs/instances/connecting-to-windows
- Google Cloud documentation: Manage accounts and credentials on Windows VMs - https://cloud.google.com/compute/docs/instances/windows/generating-credentials
- Google Cloud SDK reference: `gcloud compute reset-windows-password` - https://cloud.google.com/sdk/gcloud/reference/compute/reset-windows-password
- Google Cloud SDK reference: `gcloud compute firewall-rules create` - https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud SDK reference: `gcloud compute start-iap-tunnel` - https://cloud.google.com/sdk/gcloud/reference/compute/start-iap-tunnel
- Google Cloud documentation: Use startup scripts on Windows VMs - https://cloud.google.com/compute/docs/instances/startup-scripts/windows
- Google Cloud documentation: Connect to Windows VMs using PowerShell - https://cloud.google.com/compute/docs/instances/windows/connecting-powershell
- Google Cloud documentation: Connect to Windows VMs using SSH - https://cloud.google.com/compute/docs/connect/windows-ssh
- Google Cloud documentation: Create SQL Server VM instances - https://cloud.google.com/compute/docs/instances/sql-server/creating-sql-server-instances
- Terraform Registry: `google_compute_instance` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The Windows image family list omitted the current Windows Server 2025 image families. Added `windows-2025` and `windows-2025-core`, which are listed as GA Compute Engine Windows Server image families.
- The Cloud Console RDP instructions said the RDP button opens an in-browser RDP session. Current Google Cloud documentation describes connecting with IAP Desktop, the Google Cloud CLI plus an RDP client, Chrome Remote Desktop, or native RDP clients. Updated the console-oriented steps to copy the VM IP address and use a Remote Desktop client or Chrome Remote Desktop when configured.
- The Terraform startup script enabled unencrypted WinRM settings. Google-provided Windows images already configure WinRM over HTTPS with a self-signed certificate and the Windows firewall open inside the guest. Removed the unencrypted WinRM setup from the Terraform example.
- The WinRM section used `gcloud compute ssh` as if it were WinRM. That command uses SSH and requires Windows SSH to be enabled separately. Replaced it with a WinRM-over-HTTPS firewall rule and a PowerShell `Invoke-Command` example, and added a note about enabling Windows SSH before using `gcloud compute ssh`.

## Review Notes
- The pricing table is labeled as a rough comparison. Google Cloud pricing changes over time and varies by discounts, region, licensing, and machine configuration, so production readers should verify current numbers with the official pricing page or calculator.
