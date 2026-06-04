# Validation Summary: How to Configure gMSA Credential Spec for Active Directory Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Windows workloads
- GMSACredentialSpec custom resources
- Windows containers
- Active Directory group Managed Service Accounts
- CredentialSpec PowerShell module
- Kerberos Service Principal Names
- PowerShell and kubectl

## Sources Consulted
- Kubernetes documentation: Configure GMSA for Windows Pods and containers, https://kubernetes.io/docs/tasks/configure-pod-container/configure-gmsa/
- Microsoft Learn: Create gMSAs for Windows containers, https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/manage-serviceaccounts
- Microsoft Learn: Troubleshoot gMSAs for Windows containers, https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/gmsa-troubleshooting
- Microsoft Learn: Manage Group Managed Service Accounts, https://learn.microsoft.com/en-us/windows-server/security/group-managed-service-accounts/getting-started-with-group-managed-service-accounts
- Microsoft Learn: New-ADServiceAccount cmdlet, https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adserviceaccount
- Microsoft Learn: setspn command, https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setspn
- PowerShell Gallery: CredentialSpec module, https://www.powershellgallery.com/packages/CredentialSpec

## Issues Found
- The generated domain-joined credential spec example included `HostAccountConfig` with plug-in fields. Microsoft documents `HostAccountConfig` as required for non-domain-joined hosts, so the default generated example was corrected and a note was added for non-domain-joined hosts.
- The post described a multi-domain credential spec pattern that mixed gMSA scopes from different domains under one `DomainJoinConfig`. This was changed to the supported `-AdditionalAccounts` pattern for additional gMSA accounts in the same domain.
- Several `GMSACredentialSpec` examples used `metadata.namespace`, but Kubernetes documents these resources as cluster-wide custom resources. The namespace fields and script namespace parameter were removed.
- Some Kubernetes credspec examples were abbreviated in ways that omitted runtime-relevant fields such as `CmsPlugins`, `DnsTreeName`, `Guid`, and `NetBiosName`. The snippets were expanded to include the expected fields.
- The validation script compared the gMSA account SID to `DomainJoinConfig.Sid`. Microsoft troubleshooting guidance defines this field as the domain SID, so the script now checks `Get-ADDomain ... DomainSID`.
- The validation script treated `Test-ADServiceAccount` as an exception-only check. It now checks the Boolean return value.
- The post said to update the credential spec when SPNs change. SPNs are managed on the AD account with `setspn`, so the wording now states that annotations are documentation only.
- The examples assumed a hard-coded Docker credential spec filename. Microsoft documentation and the CredentialSpec module show that generated filenames can vary, so examples now use the path returned by `New-CredentialSpec` or an explicit `.json` filename lookup.
- The tag `Window` was corrected to `Windows`.

## Review Notes
The post is now technically valid for current Kubernetes GMSA guidance. It still assumes that the GMSA CRD and admission webhooks are already installed and that Active Directory prerequisites such as the KDS root key are already handled; those are broader setup concerns outside this post's credential-spec focus.
