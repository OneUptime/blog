# Validation Summary: How to Configure Active Directory Authentication for Ceph SMB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Samba (SMB file server)
- Active Directory (domain authentication)
- Kerberos (authentication protocol)
- Winbind (UID/GID mapping for AD users)
- CephFS (Ceph distributed filesystem)
- Chrony (NTP time synchronization)
- MIT Kerberos (krb5)

## Sources Consulted
- Samba 4.11.0 Release Notes — https://www.samba.org/samba/history/samba-4.11.0.html
- Samba vfs_ceph man page — https://www.samba.org/samba/docs/current/man-html/vfs_ceph.8.html
- Samba Wiki: Setting up Samba as a Domain Member — https://wiki.samba.org/index.php/Setting_up_Samba_as_a_Domain_Member
- Red Hat documentation on Samba ADS security mode
- SUSE Enterprise Storage documentation on CephFS Samba exports — https://documentation.suse.com/ses/7/html/ses-all/cha-ses-cifs.html

## Issues Found
1. **`encrypt passwords = yes` removed from smb.conf** — This parameter was deprecated in Samba 4.11.0. Encrypted passwords have been the enforced default since Samba 3.0.0, and the parameter is ignored in modern Samba. Including it generates deprecation warnings. Removed the line from the `[global]` section.

## Review Notes
- The `vfs objects = ceph acl_xattr` ordering is used in several sources, though some SUSE/Ceph documentation lists the order as `acl_xattr ceph`. Both orderings appear in official documentation. The current ordering works in practice.
- `winbind enum users = yes` and `winbind enum groups = yes` can cause performance issues in large Active Directory domains (thousands of users). This is fine for a tutorial but would warrant a caveat note for production deployments.
- The post does not explicitly start/enable the `smb` service (only `winbind` is enabled). This is likely intentional since the post focuses on AD authentication configuration, but readers following this as a standalone guide may miss that step.
- `dns_lookup_realm = true` in krb5.conf is considered less secure in modern MIT Kerberos (1.19+) but is commonly used and acceptable in trusted AD network environments.
