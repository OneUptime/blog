# Validation Summary: How to Set Up Managed Microsoft AD Integration with Google Cloud Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Managed Service for Microsoft Active Directory
- Google Cloud CLI
- Cloud DNS
- Compute Engine Windows VMs
- Cloud VPN / Cloud Interconnect concepts
- Cloud SQL for SQL Server
- SQL Server Windows Authentication
- Windows Server / RSAT / Group Policy
- Cloud Monitoring
- Cloud Logging
- Python Google Cloud Logging client

## Sources Consulted
- Google Cloud SDK reference: `gcloud active-directory domains create` - https://cloud.google.com/sdk/gcloud/reference/active-directory/domains/create
- Google Cloud Managed Microsoft AD: Create a domain - https://docs.cloud.google.com/managed-microsoft-ad/docs/create-domain
- Google Cloud Managed Microsoft AD: Configure DNS lookup using Cloud DNS - https://docs.cloud.google.com/managed-microsoft-ad/docs/seamless-dns
- Cloud DNS: Configure DNS server policies - https://docs.cloud.google.com/dns/docs/policies
- Cloud DNS: Create a forwarding zone - https://cloud.google.com/dns/docs/zones/forwarding-zones
- Google Cloud Managed Microsoft AD: Join a Windows VM automatically to a domain - https://docs.cloud.google.com/managed-microsoft-ad/docs/seamless-domain-join-gce
- Google Cloud SDK reference: `gcloud active-directory domains trusts create` - https://docs.cloud.google.com/sdk/gcloud/reference/active-directory/domains/trusts/create
- Cloud SQL for SQL Server: Use Managed Microsoft AD - https://docs.cloud.google.com/sql/docs/sqlserver/configure-ad
- Cloud SQL for SQL Server: Create and manage users - https://cloud.google.com/sql/docs/sqlserver/create-manage-users
- Cloud Monitoring metrics list for Managed Identities - https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud SDK reference: `gcloud monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Managed Microsoft AD audit logging - https://cloud.google.com/managed-microsoft-ad/docs/audit-logging
- Managed Microsoft AD audit logs setup - https://docs.cloud.google.com/managed-microsoft-ad/docs/using-ad-audit-logs
- Managed Microsoft AD backup and restore - https://docs.cloud.google.com/managed-microsoft-ad/docs/backup-restore

## Issues Found
- Removed the unsupported claim that the guide covers identity federation, because the post does not configure identity federation.
- Changed backup wording from daily backups to automatic scheduled backups every 12 hours, matching current Managed Microsoft AD backup documentation.
- Corrected the forest/domain wording: Managed Microsoft AD does not support child domains; each Managed Microsoft AD domain has its own forest.
- Added `--enable-audit-logs` to domain creation because the later audit-log example depends on Managed Microsoft AD audit logs being enabled.
- Reworked the DNS section. Managed Microsoft AD integrates with Cloud DNS for authorized networks, so forwarding VPC DNS directly to Managed AD domain controller IPs is not the standard setup and those IPs are not guaranteed static.
- Replaced outdated trust flags (`--trust-type`, `--trust-direction`, `--trust-handshake-secret`) with current `gcloud` flags (`--type`, `--direction`, `--handshake-secret`).
- Replaced the custom Windows startup script that hard-coded domain controller IPs with the supported Managed Microsoft AD automatic domain-join metadata flow.
- Corrected the Cloud SQL for SQL Server Windows Authentication example. AD logins are created with SQL Server `CREATE LOGIN ... FROM WINDOWS`, not with `gcloud sql users create --type=CLOUD_IAM_USER`.
- Corrected the Cloud Monitoring alert command to use the documented Managed Microsoft AD health metric, the current `gcloud monitoring policies create` flags, and a threshold condition.
- Corrected the audit-log filter to query Managed Microsoft AD audit logs by resource and Windows logon event IDs rather than a non-existent `protoPayload.methodName:"authentication"` pattern.
- Corrected the on-demand backup creation command to pass the backup name as the positional argument instead of using a non-existent `--backup-id` flag.

## Review Notes
The VPN tunnel example remains illustrative and assumes that the referenced VPN gateway and surrounding VPN resources already exist. The post could be expanded later with full HA VPN setup steps, but the current statement that VPN or Cloud Interconnect connectivity is required for on-premises trusts is technically correct.
