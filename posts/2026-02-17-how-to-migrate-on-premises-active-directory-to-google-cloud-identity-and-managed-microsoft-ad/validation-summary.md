# Validation Summary: How to Migrate On-Premises Active Directory to Google Cloud Identity

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Identity
- Google Cloud Directory Sync (GCDS)
- Managed Service for Microsoft Active Directory (Managed Microsoft AD)
- Google Cloud CLI (`gcloud active-directory`)
- Active Directory trusts
- Windows PowerShell Active Directory and Group Policy cmdlets
- Cloud SQL for SQL Server with Managed Microsoft AD
- Filestore with Managed Microsoft AD

## Sources Consulted
- Google Cloud Identity overview: https://docs.cloud.google.com/identity/docs/overview
- Google Workspace Admin Help, GCDS LDAP search rules: https://support.google.com/a/answer/6126589
- Google Workspace Admin Help, Secure LDAP service: https://support.google.com/a/answer/9048516
- Managed Microsoft AD create domain guide: https://docs.cloud.google.com/managed-microsoft-ad/docs/create-domain
- `gcloud active-directory domains create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/active-directory/domains/create
- `gcloud active-directory domains trusts create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/active-directory/domains/trusts/create
- Managed Microsoft AD create trust guide: https://docs.cloud.google.com/managed-microsoft-ad/docs/create-trust
- Managed Microsoft AD delegated administrator guide: https://docs.cloud.google.com/managed-microsoft-ad/docs/how-to-use-delegated-admin
- Managed Microsoft AD schema extension guide: https://docs.cloud.google.com/managed-microsoft-ad/docs/schema-extension
- Managed Microsoft AD Windows VM domain join guide: https://docs.cloud.google.com/managed-microsoft-ad/docs/quickstart-domain-join-windows
- Cloud SQL for SQL Server Managed Microsoft AD overview: https://docs.cloud.google.com/sql/docs/sqlserver/ad
- Filestore with Managed Microsoft AD guide: https://cloud.google.com/filestore/docs/configure-nfsv4-managed-ad
- Microsoft Learn, `Add-Computer`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/add-computer
- Microsoft Learn, `New-ADUser`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-aduser
- Microsoft Learn, GroupPolicy module: https://learn.microsoft.com/en-us/powershell/module/grouppolicy/
- Microsoft Learn, `netdom trust`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netdom-trust

## Issues Found
- The Cloud Identity section incorrectly said Cloud Identity does not provide LDAP at all. Updated it to note that Cloud Identity Premium supports Secure LDAP for LDAP-based applications, while still not replacing AD Domain Services.
- The GCDS XML snippet used non-authoritative XML element names. Replaced it with Configuration Manager settings and a valid LDAP search filter, including `mail=*` as recommended for user sync rules.
- The Managed Microsoft AD password note said the admin password is shown during creation. Updated it to use `gcloud active-directory domains reset-admin-password`, which is the documented workflow for the delegated administrator password.
- The trust creation command used incorrect `gcloud` flags (`--trust-direction`, `--trust-type`, `--trust-handshake-secret`). Replaced them with the documented flags: `--direction`, `--type`, and `--handshake-secret`.
- The on-premises trust example used an invalid/unsupported `New-ADTrust` cmdlet pattern. Replaced it with documented conditional DNS forwarding plus instructions to create the forest trust using Active Directory Domains and Trusts.
- The trust explanation implied AD trust grants access to GCP resources. Clarified that the trust applies to domain-joined AD workloads or resources, not Google Cloud IAM access.
- The schema-extension note implied Managed Microsoft AD might not support schema extensions. Updated it to state that schema extensions are supported through LDIF files with restrictions.

## Review Notes
The local environment did not have `gcloud` installed, so Google Cloud CLI verification was performed against the official Google Cloud SDK reference rather than local `--help` output.
