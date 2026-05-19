# Validation Summary: How to Configure SSSD for LDAP Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- SSSD
- LDAP / OpenLDAP client tooling
- NSS
- PAM
- OpenSSH authorized keys integration
- systemd

## Sources Consulted
- Ubuntu manpage: sssd.conf - https://manpages.ubuntu.com/manpages/jammy/man5/sssd.conf.5.html
- Ubuntu manpage: sssd-ldap - https://manpages.ubuntu.com/manpages/oracular/man5/sssd-ldap.5.html
- Ubuntu manpage: sss_ssh_authorizedkeys - https://manpages.ubuntu.com/manpages/xenial/man1/sss_ssh_authorizedkeys.1.html
- Ubuntu manpage: pam-auth-update - https://manpages.ubuntu.com/manpages/noble/man8/pam-auth-update.8.html
- Local Ubuntu package metadata for ldap-utils, sssd-ldap, libpam-sss, libnss-sss, and sssd-tools
- Local SSSD manpages: sssd.conf(5), sssd-ldap(5), sssd-ldap-attributes(5), sssd-simple(5), sss_ssh_authorizedkeys(1)
- Local OpenSSH manpage: sshd_config(5)

## Issues Found
- The install command omitted `ldap-utils`, but the troubleshooting section uses `ldapsearch`, which is provided by that package. Added `ldap-utils` to the installation command.
- The SSSD debug-level comment incorrectly identified level 3 as the default. Updated it to level 2 based on the SSSD manpage default.
- The `homedir_substring` comment described a timeout, but the option is used as a substitution value for home directory templates. Corrected the comment.
- `ldap_account_expire_policy = shadow` was shown without the required LDAP access provider and `ldap_access_order = expire`, so it would not enforce expiry. Added the required access provider settings.
- The test command comment said `sss_cache -u jsmith` checked the cache, but the command expires cached entries. Corrected the comment.
- The `getent passwd` comment claimed to show all cached users, but it shows NSS-visible passwd entries and LDAP enumeration may be disabled. Corrected the comment.
- The multiple-server `ldap_uri` example used a space-separated list. SSSD documents this as comma-separated, so the example now uses commas.
- The search scope section used an invalid `ldap_search_scope` option. Replaced it with the documented `ldap_search_base` scope syntax using `?subtree?` and `?onelevel?`.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. The example keeps a plaintext LDAP bind password in `sssd.conf`; this is common in introductory SSSD examples and the file permission guidance is correct, but a future hardening pass could mention `sss_obfuscate` or secret management for production environments.
