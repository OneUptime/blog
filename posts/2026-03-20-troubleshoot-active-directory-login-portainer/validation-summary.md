# Validation Summary: How to Troubleshoot Active Directory Login Failures in Portainer (2)

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Microsoft Active Directory
- LDAP and LDAPS
- Docker CLI and Docker container networking
- OpenLDAP client tools (`ldapwhoami`, `ldapsearch`)
- OpenSSL certificate inspection

## Sources Consulted
- Portainer documentation: Authenticate via Active Directory - https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer documentation: Authenticate via LDAP - https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer documentation: Unable to Login via LDAP in Portainer - https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/unable-to-login-via-ldap-in-portainer
- Docker documentation: `docker container logs` - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker documentation: `docker container exec` - https://docs.docker.com/reference/cli/docker/container/exec/
- Docker documentation: container network mode - https://docs.docker.com/engine/network/
- OpenLDAP documentation and local OpenLDAP client help/man output - https://www.openldap.org/software/man.cgi
- RFC 4511: Lightweight Directory Access Protocol (LDAP): The Protocol - https://www.rfc-editor.org/rfc/rfc4511
- Microsoft Learn: Enable LDAP over SSL with a third-party certification authority - https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/enable-ldap-over-ssl-3rd-certification-authority
- Microsoft Learn: UserAccountControl property flags - https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/useraccountcontrol-manipulate-account-properties
- Microsoft Learn: LDAP Matching Rules (`LDAP_MATCHING_RULE_BIT_AND`) - https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/4e638665-f466-4597-93c4-12f2ebfabab5
- Microsoft Learn: Search Filter Syntax - https://learn.microsoft.com/en-us/windows/win32/adsi/search-filter-syntax
- OpenSSL documentation: `openssl-s_client` - https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL documentation: `openssl-x509` - https://docs.openssl.org/3.1/man1/openssl-x509/
- Alpine Linux release branches - https://www.alpinelinux.org/releases/

## Issues Found
- The log-checking comment said the command enabled debug logging, but `docker logs` only retrieves and follows container logs. Changed the comment to say it reviews logs and watches for AD-related messages.
- The network test assumed the Portainer container includes `/bin/sh`, `nslookup`, and `nc`. That is not reliable for Portainer images. Changed the command to run an `alpine:3.23` diagnostic container with `--network container:portainer`, which shares Portainer's network namespace.
- The port reachability comment described both 636 and 389 as LDAPS. Changed it to LDAP/LDAPS because 636 is LDAPS and 389 is LDAP or StartTLS.
- The post referred to a `UserNameAttribute` setting. Portainer LDAP mode uses Username attribute, while Portainer Microsoft Active Directory mode uses Username Format. Updated the troubleshooting comments and checklist to use the correct setting names.
- The TLS certificate fix updated the host trust store and extracted the DC leaf certificate. For Portainer's AD/LDAP integration, the correct approach is to trust the issuing/root CA through Portainer's TLS CA certificate field. Updated the commands to inspect/save the chain and instruct uploading the issuing/root CA certificate in Portainer.
- The checklist referred only to BaseDN. Portainer Microsoft Active Directory mode uses User Search Path instead, so the checklist now covers BaseDN/User Search Path.

## Review Notes
- The `ldapwhoami` and `ldapsearch` examples are syntactically valid for OpenLDAP client tools. For real environments, using `-W` or a protected password file is safer than placing passwords directly after `-w`.
- The Active Directory data subcodes (`52e`, `525`, `533`) are AD-specific details commonly returned inside LDAP invalid-credentials failures; RFC 4511 defines the standard LDAP result codes.
- Portainer's Microsoft Active Directory authentication mode is a Business Edition feature. Community Edition users commonly configure Active Directory through LDAP mode instead.
