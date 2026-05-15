# Validation Summary: How to Integrate Samba with Active Directory on RHEL Using Winbind

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba
- Samba Winbind
- Active Directory
- Kerberos
- Chrony
- NetworkManager
- authselect

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Connecting RHEL systems directly to AD using Samba Winbind, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/integrating_rhel_systems_directly_with_windows_active_directory/connecting-rhel-systems-directly-to-ad-using-samba-winbind_integrating-rhel-systems-directly-with-active-directory
- Red Hat Enterprise Linux 9 documentation: Using Samba as a server, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Samba smb.conf man page, https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba idmap_rid man page, https://www.samba.org/samba/docs/current/man-html/idmap_rid.8.html
- Samba Wiki: Idmap config rid, https://wiki.samba.org/index.php/Idmap_config_rid

## Issues Found
- The package list did not include `samba-common-tools`, which provides Samba administrative tools used by the post such as `net`. Added it to the installation command.
- The package list did not include `bind-utils`, which provides the `host` command used in the DNS verification step. Added it to the installation command.
- The DNS verification command checked `_ldap._tcp.example.com` without requesting SRV records. Changed it to `host -t SRV _ldap._tcp.example.com` so it verifies the AD LDAP service record.
- The service start command enabled `winbind` and `smb` in one command. Red Hat documents that `winbind` must be running before `smb` for domain users and groups to be available, so the commands were split to start `winbind` first and then `smb`.

## Review Notes
The post uses a manual `net ads join` workflow. Red Hat recommends `realm join --membership-software=samba --client-software=winbind` for RHEL 9 because it updates the related configuration automatically, but Red Hat also documents `net ads join` as a supported manual approach when the Samba, NSS, and PAM configuration is handled separately as this post does.
