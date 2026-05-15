# Validation Summary: How to Automount Home Directories Over NFS Using autofs on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- autofs
- NFS and nfs-utils
- SELinux booleans
- SSSD
- LDAP automount maps

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems: autofs configuration files and automounting NFS user home directories, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 Configuring and using network file services: NFS server services and `/etc/exports` syntax, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 Using external Red Hat utilities with Identity Management: autofs and automount in IdM, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_external_red_hat_utilities_with_identity_management/using-ansible-to-automount-nfs-shares-for-idm-users_using-external-red-hat-utilities-with-idm
- Red Hat Enterprise Linux documentation for SSSD autofs configuration, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/sssd-ldap-autofs
- Local `sssd.conf(5)` and `sssd-ldap(5)` man pages for SSSD `services`, `autofs_provider`, and `ldap_autofs_search_base` options.
- Red Hat Customer Portal note on RHEL 6, 7, 8, and 9 ignoring the deprecated `intr`/`nointr` NFS mount options, https://access.redhat.com/solutions/157873
- Red Hat Enterprise Linux 9 Securing networks documentation for `use_nfs_home_dirs`, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/securing_networks/Red_Hat_Enterprise_Linux-9-Securing_networks-en-US.pdf

## Issues Found
- The autofs NFS map used `soft,intr`. On RHEL 9, `intr` is ignored for backward compatibility, and `soft` is not a good default for writable home directories because timed-out NFS operations can fail back to applications. Changed the wildcard map and per-user examples to explicit NFS hard mounts with `-fstype=nfs,rw,hard`.
- The SSSD/LDAP example enabled the SSSD autofs service but did not show the autofs responder section or the required NSS automount lookup through SSSD. Added an empty `[autofs]` section and an `/etc/nsswitch.conf` `automount: files sss` entry, matching Red Hat's SSSD/autofs guidance.
- The statement that LDAP-managed maps do not need local map files was too broad. Adjusted it to clarify that local files are not needed for LDAP-provided entries, while local files can still coexist for overrides.

## Review Notes
- The main autofs pattern, `/home /etc/auto.home` with `* ... /&`, matches Red Hat's documented RHEL 9 approach for automounting NFS user home directories.
- The `/etc/exports` syntax is valid: host or network entries must be followed immediately by their option list with no space before `(`.
- For production environments, the post could later add firewall guidance for `firewalld` and note Kerberos-secured NFS options, but the existing non-Kerberos tutorial remains technically valid.
