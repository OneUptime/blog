# Validation Summary: How to Configure Active Directory Authentication in Portainer (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Microsoft Active Directory
- LDAP
- PowerShell Active Directory module
- OpenLDAP `ldapsearch`
- `curl`

## Sources Consulted
- Portainer docs, Authenticate via Active Directory: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer docs, Authenticate via LDAP: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer API docs (Business Edition 2.39.1): https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer API schema (Business Edition 2.39.1 YAML): https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Microsoft Learn, `New-ADUser`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-aduser?view=windowsserver2025-ps
- Microsoft Learn, `Get-ADDomainController`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/get-addomaincontroller?view=windowsserver2025-ps
- Microsoft Learn, `Get-ADDomain`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/get-addomain?view=windowsserver2025-ps
- Microsoft Learn, `Get-ADOrganizationalUnit`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/get-adorganizationalunit?view=windowsserver2025-ps
- Microsoft Learn, Active Directory search filter syntax: https://learn.microsoft.com/en-us/windows/win32/adsi/search-filter-syntax
- Local OpenLDAP `ldapsearch` man page and usage output from `ldap-utils` 2.6.7

## Issues Found
- The post described the LDAP UI path (`Settings → Authentication → LDAP`) for an AD setup. Portainer’s official docs treat this as a separate `Microsoft Active Directory` authentication method, so I corrected the UI path and the field names shown in the configuration example.
- The introduction implied a generic LDAP-only AD flow. Portainer Business Edition also supports Kerberos for AD, while this post specifically demonstrates service-account-based LDAP settings. I clarified that the guide covers the Simple binding configuration.
- The prerequisites omitted that AD authentication is a Portainer Business Edition feature. I added that requirement.
- The API example used incorrect request keys and field names for current Portainer Business Edition API docs: `ldapsettings`, `Servers`, `UseTLS`, `SkipVerify`, `Anonymous`, and `Username`. I replaced them with the current documented structure under `LDAPSettings`, including `ServerType`, `URLs`, `AnonymousMode`, `TLSConfig`, and `UserNameAttribute`.
- The API example configured AD group lookup with `GroupAttribute: memberOf`. Portainer’s documented and implemented group-search setting uses `member` on the group object for team synchronization, so I corrected that field.
- The UI and comparison sections treated `memberOf` as Portainer’s group membership attribute. That is misleading in Portainer’s AD configuration: `memberOf` is commonly used in AD user filters, but Portainer’s group-search configuration uses `member`. I corrected the table and conclusion accordingly.
- The AD examples used `(&(objectClass=user)(objectCategory=person))` as if it were Portainer’s default AD filter. Portainer’s official AD template uses `(objectClass=user)` as the base filter, so I aligned the UI and API examples with the product defaults and kept the disabled-account example as an optional custom filter.
- The metadata tag `Window` was incorrect. I corrected it to `Windows`.

## Review Notes
- The post remains technically relevant and publishable after correction.
- The `ldapsearch` example syntax is valid for current OpenLDAP tooling. The command was checked against the local `ldapsearch` man page and usage output in this environment rather than against a remote documentation page.
- The API payload in the post now matches the current Portainer Business Edition API schema as of April 25, 2026. The example shows a single AD controller; Portainer Business Edition API docs also expose a `URLs` array for multiple controllers.
