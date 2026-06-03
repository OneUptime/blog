# Validation Summary: How to configure Windows security context options for Windows containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Windows Pods
- Kubernetes securityContext and windowsOptions
- Windows containers
- HostProcess containers
- Group Managed Service Accounts (GMSA)
- Pod Security Admission and Pod Security Standards
- Microsoft Defender Antivirus
- Windows PowerShell and Dockerfile commands

## Sources Consulted
- Kubernetes: Configure RunAsUserName for Windows pods and containers: https://kubernetes.io/docs/tasks/configure-pod-container/configure-runasusername/
- Kubernetes: Configure GMSA for Windows Pods and containers: https://kubernetes.io/docs/tasks/configure-pod-container/configure-gmsa/
- Kubernetes: Create a Windows HostProcess Pod: https://kubernetes.io/docs/tasks/configure-pod-container/create-hostprocess-pod/
- Kubernetes: Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes: Security For Windows Nodes: https://kubernetes.io/docs/concepts/security/windows-security/
- Kubernetes: Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Microsoft Learn: Secure Windows containers: https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-security
- Microsoft Learn: Set-MpPreference Defender cmdlet: https://learn.microsoft.com/en-ie/powershell/module/defender/set-mppreference

## Issues Found
- Windows Pod examples omitted `spec.os.name: windows`. Added the OS field to Windows Pod and Pod template examples so current Kubernetes admission and Pod Security behavior can identify the workload as Windows.
- The first PowerShell example used `Get-LocalUser $(whoami)`, which can fail because `whoami` can return a domain-qualified account string. Replaced it with `whoami /user`.
- The GMSA section described credentials as stored in CRDs. Updated the wording to credential specs and noted that GMSA credential specs do not contain secret data.
- The GMSA credential spec example was incomplete for the standard Active Directory credential spec shape. Replaced it with fields matching the Kubernetes GMSA documentation, including `CmsPlugins` and `DomainJoinConfig`.
- The GMSA runtime example used `Get-ADUser`, which is not available in a base Server Core container unless the Active Directory PowerShell module is installed. Replaced it with a generic domain connectivity check.
- The combined security and Pod Security Standards examples used `allowPrivilegeEscalation` and POSIX capabilities for Windows Pods. Removed those Linux-specific fields and used `runAsNonRoot` with `runAsUserName` instead.
- The Microsoft Defender section implied a Pod volume mount could configure Defender behavior. Replaced it with node-level Defender PowerShell commands using `Add-MpPreference`.
- The conclusion claimed `allowPrivilegeEscalation` hardens Windows workloads. Updated it to reference Windows-supported controls.
- The Windows user management snippet implied every created user should be removed from `Administrators`. Clarified that this only applies if the account was previously added.

## Review Notes
HostProcess examples remain privileged by design and should be isolated in privileged namespaces or equivalent admission policy. The examples use placeholder domains, SIDs, images, and GMSA names that must be replaced with environment-specific values before use.
