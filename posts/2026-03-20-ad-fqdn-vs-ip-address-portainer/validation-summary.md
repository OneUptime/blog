# Validation Summary: How to Set Up AD with FQDN vs IP Address in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Active Directory
- LDAP / LDAPS / StartTLS
- TLS certificate validation
- Docker networking and DNS
- DNS hostnames and CNAMEs

## Sources Consulted
- Portainer Active Directory documentation: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer source for LDAP settings and settings update handling: https://github.com/portainer/portainer
- Portainer Business Edition Docker installation docs: https://docs.portainer.io/start/install/server/docker/linux
- Docker networking documentation: https://docs.docker.com/engine/network/
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- RFC 6125 TLS service identity matching: https://www.rfc-editor.org/rfc/rfc6125.html
- Microsoft LDAPS certificate requirements for Active Directory: https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/enable-ldap-over-ssl-3rd-certification-authority

## Issues Found
- The Portainer settings examples used `URLs` arrays and `ldaps://` URIs. Portainer's LDAP/AD settings API stores the controller as a single `LDAPSettings.URL` value in `host:port` form, so I changed the snippets to use `URL` with `dc01.corp.example.com:636` style values.
- The post implied the shown partial `PUT /api/settings` payloads were directly usable. Those snippets did not reflect the actual LDAP/AD settings shape Portainer persists, so I converted them to focused configuration snippets rather than misleading partial API update commands.
- The article implied a DNS alias could be swapped between domain controllers without further TLS considerations. I corrected this to note that the certificate must match the exact alias Portainer connects to, because TLS name checks do not automatically follow a CNAME to a different hostname.
- The multi-DC example showed multiple LDAP URLs in the settings payload for automatic failover. I corrected this to explain that Portainer's settings API stores a single `LDAPSettings.URL` value and that switching DCs requires updating that value or repointing a certificate-matching DNS name.
- The Docker example used a shell-invalid line continuation with an inline comment after a backslash. I fixed the command formatting and replaced the CE image reference with a BE image reference because Active Directory authentication is documented as a Portainer Business Edition feature.
- The introduction did not state that Active Directory authentication is a Portainer Business Edition capability. I added that qualification.

## Review Notes
- Portainer's UI documentation mentions adding additional LDAP or AD servers for fallback, but the current public settings model and API examples exposed in the source store a single `LDAPSettings.URL` field. The post now stays aligned with the API shape used in its examples.
- The post remains version-sensitive with respect to Portainer image tags (`sts` versus `lts`). The corrected example uses a current documented BE install tag, but readers should still match the tag to their deployment policy.
