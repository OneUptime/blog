# Validation Summary: How to Configure Active Directory Authentication in Portainer

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Portainer Business Edition
- Microsoft Active Directory Domain Services
- LDAP / LDAPS
- Portainer HTTP API
- PowerShell ActiveDirectory module
- Bash, `curl`, `python3`, and `ldapsearch`

## Sources Consulted
- Portainer Active Directory authentication documentation: https://docs.portainer.io/2.33-lts/admin/settings/authentication/active-directory
- Portainer LDAP authentication documentation: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer Business Edition 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Microsoft Learn `New-ADUser`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-aduser?view=windowsserver2025-ps
- Microsoft Learn `User Naming Attributes`: https://learn.microsoft.com/en-us/windows/win32/ad/naming-properties
- Microsoft Learn `UserAccountControl property flags`: https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/useraccountcontrol-manipulate-account-properties
- OpenLDAP `ldapsearch(1)` manual: https://www.openldap.org/software/man.cgi?query=ldapsearch&sektion=1&apropos=0&manpath=OpenLDAP+2.6-Release

## Issues Found
1. The PowerShell example created the service account in the default container, but the later Portainer configuration referenced `OU=Service Accounts`. I added `-Path "OU=Service Accounts,DC=corp,DC=example,DC=com"` so the created account matches the bind DN used later in the post.
2. The service-account note said to grant read access to the `Users` OU specifically. I changed it to read access on the search base(s) Portainer queries, because the post searches the domain root and a separate groups OU.
3. The Portainer API payloads did not set `ServerType: 2` for Active Directory. I added that field so the examples align with Portainer’s documented AD-specific LDAP settings model.
4. The LDAP server entries were written as `ldaps://...:636` inside `URLs`. Portainer’s AD settings use server entries as host/IP plus port, so I changed them to `dc01.corp.example.com:636`.
5. The group-sync example used an unsupported `UserAttribute` field and set `GroupAttribute` to `cn`. Portainer’s group search schema only uses `GroupAttribute`, and for AD it should be the membership attribute `member`, while Portainer reads the group name from `cn` internally. I removed `UserAttribute` and corrected `GroupAttribute`.
6. The `ldapsearch` verification command used `-D "CORP\\portainer-svc"` even though `ldapsearch -D` is a bind DN. I changed it to the full distinguished name used elsewhere in the post.
7. The front matter tag used `Window` instead of `Windows`. I corrected the technology tag.

## Review Notes
- Portainer Business Edition stores Active Directory authentication under `LDAPSettings`; the AD-specific distinction is carried by `ServerType: 2`, with `AuthenticationMethod: 2` still representing LDAP/AD.
- The post’s AD-specific attribute guidance is accurate after correction: `sAMAccountName` is valid for username-style logins, `userPrincipalName` is the alternative for `user@domain` logins, and the disabled-account filter based on `userAccountControl` bit `2` is consistent with Microsoft’s documented `ACCOUNTDISABLE` flag.
- Local checks: `validation.json` was validated with `jq`. Runtime validation against a live Portainer Business Edition instance and Active Directory domain was not possible in this workspace, so command and payload verification relied on official documentation, the published BE OpenAPI spec, and the upstream `ldapsearch(1)` manual.
