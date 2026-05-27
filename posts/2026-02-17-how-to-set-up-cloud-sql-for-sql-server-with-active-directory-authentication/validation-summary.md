# Validation Summary: How to Set Up Cloud SQL for SQL Server with Active Directory Authentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud SQL for SQL Server
- Managed Microsoft AD
- Cloud DNS
- Google Cloud CLI
- SQL Server Windows Authentication
- SQL Server logins and database users
- PowerShell Active Directory cmdlets
- sqlcmd
- .NET SQL Server connection strings

## Sources Consulted
- Google Cloud SQL for SQL Server: Configure Managed Active Directory authentication: https://cloud.google.com/sql/docs/sqlserver/configure-ad
- Google Cloud SQL for SQL Server: Overview of Managed Active Directory: https://cloud.google.com/sql/docs/sqlserver/managed-ad
- Google Cloud SQL for SQL Server: Configure SQL Server Audit: https://cloud.google.com/sql/docs/sqlserver/db-audit
- Managed Microsoft AD: Create a domain: https://cloud.google.com/managed-microsoft-ad/docs/create-domain
- Managed Microsoft AD: Configure DNS lookup using Cloud DNS: https://cloud.google.com/managed-microsoft-ad/docs/seamless-dns
- Managed Microsoft AD: Create a trust with an on-premises domain: https://cloud.google.com/managed-microsoft-ad/docs/create-trust
- Managed Microsoft AD pricing: https://cloud.google.com/managed-microsoft-ad/pricing
- Microsoft Learn: CREATE LOGIN (Transact-SQL): https://learn.microsoft.com/sql/t-sql/statements/create-login-transact-sql
- Microsoft Learn: CREATE USER (Transact-SQL): https://learn.microsoft.com/sql/t-sql/statements/create-user-transact-sql
- Microsoft Learn: sqlcmd utility: https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility
- Microsoft Learn: New-ADUser and New-ADGroup PowerShell cmdlets: https://learn.microsoft.com/powershell/module/activedirectory/

## Issues Found
- The prerequisites omitted Cloud DNS, Compute Engine, and the Managed Identities SQL Integrator role needed by the Cloud SQL service account for Managed Microsoft AD integration. Added those to the prerequisite list and API enablement commands.
- The DNS forwarding command used a fabricated/incorrect flow based on `get-ldaps-settings` and a private forwarding zone. Replaced it with a DNS verification step and clarified that authorized VPC networks get Managed Microsoft AD DNS integration through Cloud DNS, while on-premises DNS needs inbound forwarding and conditional forwarding.
- The Cloud SQL `--storage-size` example used `100GB`. Updated it to `100`, matching the CLI's GB integer value format.
- The Cloud SQL instance creation command used the stable `gcloud sql` surface, while the official Managed Microsoft AD example still documents `gcloud beta sql`. Updated the command to `gcloud beta sql`.
- The SQL Server admin login was described as the SA account. Corrected the text to describe `sqlserver` as the default Cloud SQL SQL Server account.
- The Windows Authentication examples used `PRIVATE_IP`. Updated the `sqlcmd` and .NET examples to use the Cloud SQL instance DNS name and noted the Kerberos/IP limitation, especially for trusted domains.
- The audit example used `sp_configure 'login auditing'`, which is not the documented Cloud SQL for SQL Server audit configuration path. Replaced it with the Cloud SQL SQL Server auditing flags for audit bucket path, retention interval, and upload interval.
- The security guidance advised disabling the `sqlserver` login as if it were `sa`. Replaced that with guidance to protect it as a break-glass administrative login.
- The Managed Microsoft AD pricing section described outdated/incorrect edition and additional domain controller charges. Updated it to the current per-region managed active domain pricing model and recalculated the single-region monthly estimate.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are still illustrative and use placeholder project, network, subnet, password, and DNS values that readers must replace for their own environment.
