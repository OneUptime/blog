# Validation Summary: How to Set Up OpenLDAP Server on RHEL for Centralized Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Directory Server / 389 Directory Server
- LDAP and LDAPS
- OpenLDAP client tools
- SSSD
- authselect
- firewalld

## Sources Consulted
- Red Hat Directory Server 12 Installing Red Hat Directory Server: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/html-single/installing_red_hat_directory_server/index
- Red Hat Directory Server 12 Securing Red Hat Directory Server: https://docs.redhat.com/en-us/documentation/red_hat_directory_server/12/pdf/securing_red_hat_directory_server/Red_Hat_Directory_Server-12-Securing_Red_Hat_Directory_Server-en-US.pdf
- Red Hat Enterprise Linux 9 Configuring SSSD to use LDAP and require TLS authentication: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-sssd-to-use-ldap-and-require-tls-authentication_configuring-authentication-and-authorization-in-rhel
- Red Hat Customer Portal, openldap-servers removed in RHEL 8/9: https://access.redhat.com/solutions/3816971
- 389 Directory Server dsconf manual page: https://man.archlinux.org/man/extra/389-ds-base/dsconf.8.en

## Issues Found
- The OpenLDAP removal statement was incomplete. Updated it to say `openldap-servers` was removed starting with RHEL 8.
- The install instructions omitted the Red Hat Directory Server repository prerequisite, module enable step, and useful companion packages. Added the prerequisite note, `dnf module enable redhat-ds:12`, and installation of `cockpit-389-ds` and `openldap-clients`.
- The `.inf` backend example used sample entries while the tutorial later creates the same directory structure manually. Changed it to create only the suffix entry and disable sample entries.
- The instance setup omitted firewall commands required for remote LDAP/LDAPS clients. Added `firewall-cmd` commands for ports 389 and 636.
- The TLS section used incorrect command paths, including `dsconf ... security tls generate-server-cert-csr` and `ca-cert`. Replaced them with current `dsctl ... tls generate-server-cert-csr`, `dsconf ... security certificate add`, and `dsconf ... security ca-certificate ...` commands.
- The TLS verification command relied on anonymous access. Updated it to bind as Directory Manager, matching Red Hat's verification pattern.
- Several LDAP modification examples continued to use unencrypted LDAP after the TLS setup. Updated them to use LDAPS.
- The example user's primary `gidNumber` did not match the example group. Changed the user `gidNumber` to `10001`.
- The user entry contained a fake `{SSHA}` value that would not be a valid password hash. Replaced it with a temporary password and kept the interactive `ldappasswd` step.
- The SSSD bind-account ACI used a non-existent `dsconf localhost aci create` command. Replaced it with an LDAP modify operation that adds a valid 389 Directory Server ACI.
- The client package list omitted `openldap-clients` and `oddjob-mkhomedir`, which Red Hat includes for LDAP client setup with home-directory creation. Added both packages.
- The SSSD TLS certificate requirement used `demand`; changed it to `hard` to match Red Hat's RHEL 9 documentation.

## Review Notes
The guide is technically valid as a RHEL 9 / Red Hat Directory Server 12 LDAP-authentication setup after the corrections. For production, administrators should still use a real CA-issued certificate, review ACIs for their security policy, and avoid storing bind passwords directly in `sssd.conf` when a more controlled secret-management approach is available.
