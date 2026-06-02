# Validation Summary: How to Join FSx for Windows to Active Directory

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon FSx for Windows File Server
- AWS Managed Microsoft AD
- Self-managed Microsoft Active Directory
- AWS CLI
- Amazon Route 53 Resolver
- Amazon VPC security groups and DHCP options
- PowerShell / Active Directory administration
- Terraform AWS provider
- SMB, Kerberos, LDAP, DNS, WinRM

## Sources Consulted
- Amazon FSx for Windows File Server: Using a self-managed Microsoft Active Directory: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/self-managed-AD.html
- Amazon FSx for Windows File Server: Joining an Amazon FSx file system to a self-managed Microsoft Active Directory domain: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/creating-joined-ad-file-systems.html
- Amazon FSx for Windows File Server: Using Amazon FSx with AWS Managed Microsoft AD: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/fsx-aws-managed-ad.html
- Amazon FSx for Windows File Server: Getting started and security group rules: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/getting-started.html
- Amazon FSx for Windows File Server: Managing file shares with FSx remote PowerShell: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/managing-file-shares.html
- AWS CLI Command Reference: fsx create-file-system: https://docs.aws.amazon.com/cli/latest/reference/fsx/create-file-system.html
- AWS CLI Command Reference: fsx update-file-system: https://docs.aws.amazon.com/cli/latest/reference/fsx/update-file-system.html
- AWS CLI Command Reference: ds create-microsoft-ad: https://docs.aws.amazon.com/cli/latest/reference/ds/create-microsoft-ad.html
- AWS Directory Service: Creating or changing a DHCP options set for AWS Managed Microsoft AD: https://docs.aws.amazon.com/directoryservice/latest/admin-guide/dhcp_options_set.html
- Terraform Registry: aws_fsx_windows_file_system: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_windows_file_system
- Verified referenced OneUptime URL returned HTTP 200: https://oneuptime.com/blog/post/2026-02-12-amazon-fsx-windows-file-server/view

## Issues Found
- The Managed AD DHCP options example used a space-separated `DnsIpAddrs` value in an AWS CLI shorthand list. Changed the query to `join(',', DirectoryDescriptions[0].DnsIpAddrs)` so `Values=$DNS_IPS` receives a valid comma-separated list.
- The PowerShell service account example created the account under `OU=ServiceAccounts` without creating that OU. Added creation of the `ServiceAccounts` OU.
- The AD delegation example used `dsacls` permissions that did not match the minimum FSx permissions documented by AWS. Replaced it with the documented Delegate Control workflow: create/delete computer objects, Reset Password, read/write Account Restrictions, validated write to DNS host name, and validated write to service principal name.
- The Route 53 Resolver forwarding rule example created a rule but associated a placeholder resolver rule ID. Captured `ResolverRule.Id` into `RULE_ID` and used that value in `associate-resolver-rule`.
- The required port table and security group example omitted UDP 123 for NTP and TCP 5985 for WinRM, both documented as required FSx/AD connectivity ports. Added both to the table and commands.
- The post claimed FSx directly supports Group Policy for management. Clarified this as AD-based workflows such as using Group Policy to map FSx shares for domain users.

## Review Notes
The examples still use placeholder IDs, passwords, subnet IDs, security group IDs, and domain names, so readers must replace them before use. The post stores AD service account passwords inline for tutorial simplicity; AWS now recommends using AWS Secrets Manager for self-managed AD credentials where possible.
