# Validation Summary: How to Set Up AD with FQDN vs IP Address in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Microsoft Active Directory
- LDAP / LDAPS
- DNS
- Docker Compose
- OpenSSL

## Sources Consulted
- Portainer docs: Active Directory authentication https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer docs: Install Portainer BE with Docker on Linux https://docs.portainer.io/start/install/server/docker/linux
- Portainer docs: Install Portainer CE with Docker on Linux https://docs.portainer.io/start/install-ce/server/docker/linux
- Docker Docs: `extra_hosts` service option https://docs.docker.com/reference/compose-file/services/
- Docker Docs: top-level `version` element https://docs.docker.com/reference/compose-file/version-and-name/
- Microsoft Learn: Configure certificates for LDAP over SSL in AD DS https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/configure-ldap-signing-certificates
- Microsoft Learn: Locating Active Directory domain controllers https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/dc-locator
- Microsoft Learn: Active Directory servers and dynamic DNS https://learn.microsoft.com/en-us/windows/win32/ad/active-directory-servers-and-dynamic-dns
- OpenSSL docs: `openssl s_client` https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL docs: `openssl x509` https://docs.openssl.org/3.6/man1/openssl-x509/
- Portainer source: AD settings UI placeholder and multi-controller fallback wording https://github.com/portainer/portainer/blob/develop/app/portainer/settings/authentication/ldap/ad-settings/ad-settings.html
- Portainer source: LDAP connection setup and TLS server-name handling https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer source: authentication settings normalization for host:port and default ports https://github.com/portainer/portainer/blob/develop/app/portainer/views/settings/authentication/settingsAuthenticationController.js

## Issues Found
- The post claimed that entering the AD domain name itself in Portainer would use Windows DNS SRV records for load balancing. Portainer's supported approach is to add multiple AD controllers explicitly for authentication fallback, so that section was corrected.
- The Compose example used `portainer/portainer-ce:latest`, but Active Directory authentication is a Portainer Business Edition feature. The example image was corrected to the Business Edition image.
- The Compose snippet used the top-level `version: "3.8"` key, which Docker now documents as obsolete. It was removed.
- The `/etc/hosts` workaround example mixed shell commands and Compose YAML inside one `bash` code fence. The example was split into separate `bash` and `yaml` blocks.
- The certificate inspection example said it would verify FQDN matching, but the command only printed certificate fields. It was corrected to an accurate inspection command and wording.
- The post used the generic label `Server:` in Portainer examples. This was updated to `AD Controller:` to match Portainer's AD configuration UI.
- The conclusion said FQDN was required for TLS validation. This was softened to preferred, because IP-based validation can work when the certificate contains the IP in SANs.

## Review Notes
- Portainer currently accepts `host:port` values for AD controllers and auto-appends `:389` or `:636` when the port is omitted, based on its current source code.
- AD domain controller discovery via DNS SRV records is real in Windows environments, but Portainer's AD controller field is a host list, not an SRV-discovery mechanism.
