# Validation Summary: How to Configure Home Directory Creation for AD Users on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Active Directory integration
- SSSD
- PAM
- pam_oddjob_mkhomedir
- oddjobd / oddjob-mkhomedir
- authselect
- NFS
- autofs
- SELinux

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring authentication and authorization in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Customer Portal, "How to create home directories on the first login (using pam_oddjob_mkhomedir.so)": https://access.redhat.com/solutions/3177381
- SSSD documentation, "Joining AD Domain Manually": https://sssd.io/docs/ad/ad-provider-manual.html
- SSSD documentation, AD home directory behavior notes: https://sssd.io/design-pages/use_ad_homedir.html
- oddjob-mkhomedir package/man page index: https://www.mankier.com/package/oddjob-mkhomedir
- pam_oddjob_mkhomedir(8) EL man page: https://man.docs.euro-linux.com/EL%208/oddjob-mkhomedir/pam_oddjob_mkhomedir.8.en.html
- oddjobd-mkhomedir.conf(5) man page: https://manpages.debian.org/testing/oddjob-mkhomedir/oddjobd-mkhomedir.conf.5.en.html
- Red Hat Enterprise Linux 9 documentation, "Managing file systems", autofs home directory maps: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- Added the missing `oddjob-mkhomedir` package installation step. The authselect `with-mkhomedir` feature requires the PAM module/helper and oddjobd service to be available.
- Clarified the authselect command flow. `authselect enable-feature with-mkhomedir` applies to an existing selected profile, while `authselect select sssd with-mkhomedir` is the profile-selection form.
- Corrected the SSSD explanation to say `fallback_homedir` controls the home directory path when the identity provider does not supply one.
- Corrected the `%d` description from "short domain name" to "domain name".
- Corrected the home directory permission guidance. The stock `pam_oddjob_mkhomedir` flow uses `HOME_MODE` or `UMASK` from `/etc/login.defs`; the post previously implied an `umask` attribute in the oddjobd XML was the normal control point.
- Changed the test command from `ls -ld /home/aduser` to `ls -ld ~`, because the actual path may include the domain depending on SSSD configuration.
- Updated the autofs map example to include `-fstype=nfs,rw,sync`, matching Red Hat's documented format.
- Added the SELinux `use_nfs_home_dirs` boolean for NFS-backed home directories on enforcing systems.

## Review Notes
The NFS export example remains intentionally simple for a tutorial. A production deployment should restrict clients and use site-appropriate NFS security options.
