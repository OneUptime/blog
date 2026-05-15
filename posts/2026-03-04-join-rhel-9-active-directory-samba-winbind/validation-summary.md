# Validation Summary: How to Join RHEL to Active Directory Using Samba Winbind

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Active Directory
- Samba
- Winbind
- Kerberos
- authselect
- Samba ID mapping backends

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Connecting RHEL systems directly to AD using Samba Winbind, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/integrating_rhel_systems_directly_with_windows_active_directory/connecting-rhel-systems-directly-to-ad-using-samba-winbind_integrating-rhel-systems-directly-with-active-directory
- Red Hat Enterprise Linux 9 documentation: Configuring user authentication using authselect, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Red Hat Enterprise Linux 9 documentation: Using the smbclient utility to access an SMB share, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Samba documentation: Setting up Samba as a Domain Member, https://wiki.samba.org/index.php/Setting_up_Samba_as_a_Domain_Member
- Samba smb.conf man page, https://www.samba.org/samba/docs/4.21/man-html/smb.conf.5.html
- Samba wbinfo man page, https://www.samba.org/samba/docs/current/man-html/wbinfo.1.html
- Samba idmap_ad man page, https://www.samba.org/samba/docs/current/man-html/idmap_ad.8.html
- Samba idmap_autorid man page, https://www.samba.org/samba/docs/current/man-html/idmap_autorid.8.html

## Issues Found
- The package installation command used `smbclient` later in the guide but did not install the `samba-client` package. Added `samba-client` to the package list because Red Hat documents it as the prerequisite package for the `smbclient` utility.
- The RHEL 9 Winbind integration guidance includes the `samba-winbind-krb5-locator` package and a Kerberos `[plugins] localauth` stanza that loads `winbind_krb5_localauth.so`. Added the package and the Kerberos plugin configuration so the manual configuration matches Red Hat's supported Winbind integration behavior more closely.

## Review Notes
- The core Samba settings, `net ads join` flow, `authselect select winbind with-mkhomedir`, Winbind service usage, and the `rid`, `ad`, and `autorid` ID mapping examples are consistent with Samba and Red Hat documentation.
- The guide intentionally uses a manual `net ads join` workflow instead of Red Hat's `realm join --membership-software=samba --client-software=winbind` workflow. That is valid for Samba domain members, but Red Hat's `realm` workflow automates several NSS, PAM, and service setup steps.
