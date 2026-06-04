# Validation Summary: How to Use Group Managed Service Accounts (gMSA) with Windows Pods on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Windows pods
- Group Managed Service Accounts (gMSA)
- Active Directory
- Windows containers
- Kubernetes admission webhooks
- Kubernetes RBAC
- PowerShell ActiveDirectory module
- CredentialSpec PowerShell module
- SQL Server integrated authentication
- SMB file shares

## Sources Consulted
- Kubernetes documentation: Configure GMSA for Windows Pods and containers - https://kubernetes.io/docs/tasks/configure-pod-container/configure-gmsa/
- kubernetes-sigs/windows-gmsa admission webhook README and deployment script - https://github.com/kubernetes-sigs/windows-gmsa
- Microsoft Learn: Manage group Managed Service Accounts - https://learn.microsoft.com/en-gb/windows-server/identity/ad-ds/manage/group-managed-service-accounts/group-managed-service-accounts/manage-group-managed-service-accounts
- Microsoft Learn: New-ADServiceAccount cmdlet - https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adserviceaccount
- Microsoft Learn: Orchestrate containers with a gMSA - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/gmsa-orchestrate-containers
- Microsoft CredentialSpec PowerShell module source - https://github.com/MicrosoftDocs/Virtualization-Documentation/blob/live/windows-server-container-tools/ServiceAccounts/CredentialSpec.psm1

## Issues Found
- Corrected the Kubernetes gMSA flow: the Windows kubelet does not retrieve AD credentials and inject them directly. The admission webhooks inline and validate credential specs, and the Windows container runtime configures the container for gMSA domain authentication.
- Added the missing KDS root key prerequisite and tightened the Windows node prerequisite to domain-joined nodes that can communicate with Active Directory.
- Removed RC4 from the sample `New-ADServiceAccount -KerberosEncryptionType` value because current guidance should prefer AES encryption types.
- Added a note to restart Windows nodes after adding their computer accounts to the gMSA security group, so group membership is present in the machine token.
- Fixed the webhook deployment command description: `--file` is the generated manifest output, not the template file, and the script deploys the generated manifest.
- Updated the credential spec examples to include both DNS and NetBIOS `GroupManagedServiceAccounts` scopes, matching the Microsoft CredentialSpec module and Kubernetes examples.
- Corrected the verification examples. `whoami` and `$env:USERNAME` show the local container identity, not `CONTOSO\webapp-gmsa$`; `nltest /query` is the appropriate check for the gMSA secure channel.
- Added creation of `C:\temp` before copying from the SMB share so the file-share example does not fail on a missing directory.
- Renamed the SQL section to SQL Server integrated authentication and split the mixed JSON/C# snippet into syntactically valid code blocks.
- Reworded the gMSA rotation recommendation to focus on recreating or rotating affected accounts after suspected compromise, while acknowledging automatic managed password rotation.

## Review Notes
- Kubernetes gMSA support has been stable since v1.18, but the current upstream `windows-gmsa` webhook branch documents support for Kubernetes v1.23 and later.
- Actual behavior can vary by Kubernetes distribution and Windows CNI implementation, especially for network policy enforcement and non-domain-joined managed-service offerings.
