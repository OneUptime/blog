# Validation Summary: How to Configure autofs with LDAP Maps on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- autofs
- LDAP automount maps
- SSSD
- FreeIPA
- NFS

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems, "Using LDAP to store automounter maps" and "Configuring SSSD to cache autofs maps": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 7 System-Level Authentication Guide, "Configuring Services: autofs": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system-level_authentication_guide/configuring_services
- SSSD upstream documentation, "SSSD and automounter integration": https://docs.pagure.org/sssd.sssd/design_pages/autofs_integration.html
- FreeIPA CLI Overview, automount commands: https://www.freeipa.org/page/CLI_Overview
- Local `sssd.conf(5)` and `sssd-ldap(5)` man pages for SSSD autofs options.

## Issues Found
- The SSSD configuration enabled the `autofs` service but did not include an `[autofs]` responder section. Red Hat documentation shows creating this section, which can be left empty, so I added it.
- The post told readers to configure LDAP schema settings in `/etc/autofs.conf` and add `+auto.master` to `/etc/auto.master` while also configuring SSSD. For SSSD-backed autofs, Red Hat documents selecting the `sss` automount source through `/etc/nsswitch.conf`; direct LDAP settings in `autofs.conf` are for autofs querying LDAP itself. I replaced that section with a note clarifying the SSSD path.
- The verification section used `getent automount auto.home` and `sssctl automount-list`. Red Hat documents `automount -m` for printing maps from SSSD, and SSSD's automount integration does not use a normal glibc `getent` database interface. I changed the verification commands to use `sudo automount -m`.

## Review Notes
- The article uses the rfc2307bis-style automount schema (`automountMap`, `automount`, `automountMapName`, `automountKey`, and `automountInformation`), which matches Red Hat and SSSD examples.
- The `automount: sss files` order matches the RHEL 9 documentation for SSSD-cached autofs maps. Some older Red Hat documentation shows `files sss` to allow local overrides first; either ordering can be intentional depending on site policy.
