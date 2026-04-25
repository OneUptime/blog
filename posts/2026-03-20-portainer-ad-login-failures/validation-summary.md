# Validation Summary: How to Troubleshoot Active Directory Login Failures in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Active Directory
- LDAP
- PowerShell
- OpenLDAP `ldapsearch`
- Docker

## Sources Consulted
- Portainer Active Directory documentation: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer troubleshooting FAQ on LDAP team sync: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/ldap-groups-are-not-auto-populating-portainer-teams
- Portainer source for `/api/auth` and team sync behavior: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer LDAP service implementation: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Microsoft Learn, Active Directory simple bind name forms: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/6a5891b8-928e-4b75-a4a5-0e3b77eaca52
- Microsoft Learn, fine-grained password policies: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/adac/fine-grained-password-policies
- Microsoft Learn, `New-ADFineGrainedPasswordPolicy`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adfinegrainedpasswordpolicy?view=windowsserver2025-ps
- Microsoft Learn, `Set-ADAccountPassword`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/set-adaccountpassword?view=windowsserver2025-ps
- Microsoft Learn, `userAccountControl` flags: https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/useraccountcontrol-manipulate-account-properties
- Microsoft Learn, Event ID 4624: https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4624
- Microsoft Learn, Event ID 4625: https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4625
- OpenLDAP 2.6 Administrator's Guide: https://www.openldap.org/doc/admin26/OpenLDAP-Admin-Guide.pdf

## Issues Found
- The post referred to Portainer generically even though the official documentation describes Active Directory authentication as a Portainer Business Edition feature. I clarified the description and introduction so the scope matches the current product documentation.
- The Portainer login guidance incorrectly implied users must always sign in with `sAMAccountName`. I changed this to match Portainer's documented `Username Format` setting, which supports both `username` and `username@domainname`, and clarified that `displayName` is not the Portainer login format.
- The group troubleshooting section did not reflect how Portainer actually resolves LDAP/AD group membership. I changed it to check membership using the user's DN, aligned the guidance with Portainer's Group Search configuration, and noted that Portainer's team-name matching is case-insensitive.
- The service-account lockout section attributed the problem to stale cached credentials and used `-ComplexityEnabled $false` in the fine-grained password policy example, which was unrelated to lockout behavior. I changed the wording to outdated saved credentials and replaced the policy example with lockout-focused settings from Microsoft's fine-grained password policy guidance.
- The `ldapsearch` troubleshooting steps did not state that the transport should match Portainer's configured LDAP security mode. I clarified that the bind tests should use the same transport Portainer is configured for so the commands match real Portainer behavior.
- The conclusion overstated DN formatting as the likely Portainer issue. I corrected it to refer to bind and username-format configuration, which is what Portainer's current AD and LDAP documentation and implementation actually depend on.

## Review Notes
- The post is technically relevant and salvageable; it required corrections rather than removal.
- The AD error 49 subtype table is widely used operational guidance. The corrected review focused on the parts that could be verified directly against current Portainer documentation, Portainer source, Microsoft Learn, and OpenLDAP documentation.
- The examples still use `ldap://...:389` as a sample URI. In hardened AD environments, simple binds over cleartext LDAP can be rejected depending on LDAP signing or TLS requirements, so operators should mirror the exact Portainer security mode when running the tests.
