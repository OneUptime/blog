# Validation Summary: How to Configure LDAP Client Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- LDAP / OpenLDAP
- SSSD
- nslcd / libnss-ldapd / libpam-ldapd
- PAM
- NSS
- OpenSSH

## Sources Consulted
- Ubuntu Server documentation: How to set up SSSD with LDAP - https://ubuntu.com/server/docs/how-to/sssd/with-ldap/
- Ubuntu Server documentation: Troubleshooting SSSD - https://ubuntu.com/server/docs/how-to/sssd/troubleshooting/
- Ubuntu Manpages: pam-auth-update(8) - https://manpages.ubuntu.com/manpages/noble/man8/pam-auth-update.8.html
- SSSD upstream quick start LDAP documentation - https://sssd.io/docs/quick-start.html
- Local man pages: sssd-ldap(5), sssd-ldap-attributes(5), sssd-simple(5), sshd_config(5)
- nss-pam-ldapd sample nslcd.conf and documentation - https://arthurdejong.org/git/nss-pam-ldapd/tree/nslcd.conf

## Issues Found
- The SSSD LDAP example set certificate validation options but did not enable StartTLS for LDAP identity lookups over `ldap://`. Added `ldap_id_use_start_tls = true`, matching Ubuntu and SSSD guidance for protecting id_provider lookups.
- The SSSD user object mapping used `ldap_user_object_class = inetOrgPerson`. For RFC2307 POSIX LDAP users, SSSD's default and expected object class is `posixAccount`; changed the example to `posixAccount`.
- The SSH authentication test used `sudo -u jsmith ssh localhost`, which first switches to the LDAP user locally and is not a clear password authentication test. Changed it to `ssh jsmith@localhost`.
- The SSH restart command used `systemctl restart sshd`; Ubuntu's OpenSSH server unit is conventionally `ssh.service`. Changed it to `sudo systemctl restart ssh`.

## Review Notes
The SSSD and nslcd examples are generally correct for OpenLDAP/RFC2307-style deployments. Active Directory often needs additional schema, provider, and identity-mapping settings, so the existing generic wording should be read as a starting point rather than a complete AD integration guide.
