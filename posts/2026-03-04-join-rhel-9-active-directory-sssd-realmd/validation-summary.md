# Validation Summary: How to Join a RHEL System to an Active Directory Domain Using SSSD and realmd

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Active Directory
- SSSD
- realmd
- Kerberos
- DNS SRV records
- authselect
- sudoers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Connecting RHEL systems directly to AD using SSSD - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/integrating_rhel_systems_directly_with_windows_active_directory/connecting-rhel-systems-directly-to-ad-using-sssd_integrating-rhel-systems-directly-with-active-directory
- Red Hat Enterprise Linux 9 documentation: Configuring user authentication using authselect - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- realm(8) manual page - https://www.mankier.com/8/realm
- sssd.conf(5) manual page - https://www.mankier.com/5/sssd.conf
- sssd-ad(5) manual page - https://www.mankier.com/5/sssd-ad
- sudoers(5) manual page - https://www.sudo.ws/docs/man/1.9.8/sudoers.man/

## Issues Found
- The AD port prerequisite omitted Kerberos password-change port 464 and did not distinguish optional LDAPS/global-catalog LDAPS ports. Updated the port list to include 464 and mark 636/3269 as LDAPS-dependent.
- The `nslookup _ldap._tcp.example.com` command did not request SRV records. Changed it to `nslookup -type=SRV _ldap._tcp.example.com`.
- The package installation command omitted `krb5-workstation`, which provides `kinit` on RHEL, and `bind-utils`, which provides the DNS tools used in the article. Added both packages.
- The sample `realm discover` output did not match Red Hat's documented RHEL 9 package list. Updated the required-package lines to include `oddjob`, `oddjob-mkhomedir`, `sssd`, `adcli`, and `samba-common`.
- The Kerberos test used `administrator@example.com`, while the discovered Kerberos realm is `EXAMPLE.COM`. Changed the example to `kinit administrator@EXAMPLE.COM`.
- The home-directory step implied that `authselect` should always be changed after joining. Red Hat notes that `realm join` configures SSSD authentication and recommends checking current authselect settings before modifying them. Updated the wording and added `authselect current`.

## Review Notes
The remaining commands and configuration examples are technically valid for a typical RHEL 9 direct AD integration using realmd and SSSD. The short-name configuration is appropriate only when username collisions across domains are not a concern.
