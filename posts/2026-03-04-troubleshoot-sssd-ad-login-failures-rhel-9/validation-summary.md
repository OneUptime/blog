# Validation Summary: How to Troubleshoot SSSD and Active Directory Login Failures on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SSSD
- Active Directory
- Kerberos
- DNS SRV records
- chrony
- realmd
- authselect
- NetworkManager / nmcli
- PAM / NSS

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring authentication and authorization in RHEL - SSSD domain status, debug logging, cache troubleshooting, and authselect: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux 9 documentation: Integrating RHEL systems directly with Windows Active Directory - realmd joins, AD discovery, SSSD GPO access control, and `ad_gpo_access_control`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/integrating_rhel_systems_directly_with_windows_active_directory/
- realmd `realm(8)` manual - `realm permit --all`, `realm permit -g`, and `realm leave`: https://manpages.debian.org/testing/realmd/realm.8.en.html
- NetworkManager `nmcli` manual - `nmcli connection modify`, `ipv4.dns`, and connection activation syntax: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- MIT Kerberos documentation - `kinit`, `KRB5_TRACE`, and Kerberos clock skew behavior: https://web.mit.edu/kerberos/krb5-latest/doc/
- chrony `chronyc` documentation - `tracking`, `sources -v`, and `makestep`: https://chrony-project.org/doc/4.2/chronyc.html
- BIND `host(1)` manual on the local system - `-t type` option and default query behavior.

## Issues Found
- The quick diagnostic script used `host _ldap._tcp.example.com`, which does not explicitly query the SRV record needed for AD LDAP service discovery. Changed it to `host -t SRV _ldap._tcp.example.com` so the DNS check validates the intended record type.

## Review Notes
The post is technically sound for a RHEL 9 SSSD/AD troubleshooting guide. The `nmcli` connection name is environment-specific, so readers may need to replace `"System eth0"` with their actual NetworkManager connection name. The `realm permit --all` example is correctly labeled as testing-only, because broad access is not a recommended long-term policy.
