# Validation Summary: How to Configure Samba with SSSD for AD-Authenticated File Sharing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba
- Winbind
- SSSD
- Active Directory
- realmd
- Kerberos
- SELinux
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using Samba as a server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation: Integrating RHEL systems directly with Windows Active Directory: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/integrating_rhel_systems_directly_with_windows_active_directory/connecting-rhel-systems-directly-to-ad-using-sssd_integrating-rhel-systems-directly-with-active-directory
- Samba smbclient manual page: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba net manual page: https://www.samba.org/samba/docs/current/man-html/net.8.html
- SSSD AD provider documentation: https://sssd.io/docs/ad/ad-provider.html
- Local `sssd.conf(5)` manual page for SSSD option syntax.

## Issues Found
- The original post claimed that RHEL Samba file servers can use SSSD instead of Winbind for AD-authenticated file sharing. Red Hat's RHEL 9 Samba documentation states that AD domain member Samba servers require `winbindd` and that SSSD is not supported for this Samba server role. I changed the tutorial to the supported Winbind configuration.
- The original `realm join` command did not select Samba membership and Winbind client software. I changed it to use `--membership-software=samba --client-software=winbind`, matching Red Hat's documented domain-join flow for Winbind.
- The original package list installed SSSD packages but omitted required Winbind packages. I replaced the package list with Samba, Winbind, realmd, Kerberos, SELinux, and firewall packages needed by the commands shown.
- The original `smb.conf` used `idmap config EXAMPLE : backend = sss`, which is not the supported RHEL 9 Samba AD member configuration. I replaced it with a `rid` ID mapping example and non-overlapping ID ranges.
- The original instructions told readers not to start Winbind. I changed the service steps to start and enable `winbind` before `smb`, as required for Samba to query domain users and groups.
- The original identity lookup and group examples used unqualified names such as `jdoe` and `Domain Users`. I changed the examples to qualified Winbind names such as `EXAMPLE\jdoe` and `EXAMPLE\Domain Users`.
- The original share examples used `writable = yes`. I changed them to `read only = no`, matching current Red Hat Samba examples while preserving the intended writable-share behavior.
- The original SELinux step labeled `/srv/samba/shared` without first creating it and used `semanage` without installing the package that provides it. I added directory creation and `policycoreutils-python-utils`.
- The troubleshooting section focused on SSSD cache and debugging. I replaced those commands with Winbind-appropriate checks: `systemctl status winbind`, `net cache flush`, `wbinfo -u`, and `wbinfo -g`.
- The comparison table and wrap-up repeated the unsupported SSSD-for-Samba-server claim. I updated them to distinguish SSSD's valid system-authentication role from Winbind's supported Samba server role on RHEL.

## Review Notes
The corrected guide uses `rid` ID mapping because it works without POSIX UID/GID attributes in AD. Environments that maintain RFC 2307 POSIX attributes in AD can use Samba's `ad` ID mapping backend instead, with ranges that do not overlap any other configured domain.
