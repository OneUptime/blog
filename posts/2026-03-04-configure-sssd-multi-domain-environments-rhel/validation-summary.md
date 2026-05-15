# Validation Summary: How to Configure SSSD for Multi-Domain Environments on RHEL

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Red Hat Enterprise Linux
- SSSD
- Active Directory provider for SSSD
- LDAP provider for SSSD
- NSS and PAM integration
- sssctl command-line tooling

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Understanding SSSD and its benefits - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_authentication_and_authorization_in_rhel/understanding-sssd-and-its-benefits_configuring-authentication-and-authorization-in-rhel
- Red Hat Enterprise Linux 8 documentation: Querying domain information using SSSD - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_authentication_and_authorization_in_rhel/querying-domain-information-using-sssd_configuring-authentication-and-authorization-in-rhel
- SSSD upstream manual page: sssd.conf(5) - https://man.archlinux.org/man/sssd.conf.5.en
- SSSD upstream manual page: sssd-ad(5) - https://man.archlinux.org/man/sssd-ad.5.en
- SSSD upstream manual page: sssd-ldap(5) - https://man.archlinux.org/man/sssd-ldap.5.en
- SSSD upstream manual page: sssctl(8) - https://man.archlinux.org/man/sssctl.8.en
- SSSD 2.9.6 release notes - https://sssd.io/release-notes/sssd-2.9.6.html
- Local SSSD 2.9.4 man pages for sssd.conf, sssd-ad, and sssd-ldap

## Issues Found
- The post used `default_domain_suffix` to describe the default domain for unqualified names. Current SSSD documentation recommends `domain_resolution_order` for this behavior and notes `default_domain_suffix` is deprecated in newer SSSD releases. I removed `default_domain_suffix` and changed the testing note to say unqualified names resolve against the first matching domain in `domain_resolution_order`.
- The UID/GID conflict section implied `min_id` and `max_id` set or assign an ID range. SSSD documents these as filters for entries outside the configured range. I changed the surrounding comments to clarify that LDAP users and groups are restricted to the range, while AD ID mapping maps SIDs into selected ID ranges.
- The AD ID-mapping explanation said UIDs start from a hash of the domain SID. SSSD actually selects an ID-map slice from the domain SID and maps SIDs into that range. I adjusted the wording to avoid the inaccurate "starting from" claim.

## Review Notes
The remaining commands and configuration options are valid for current SSSD/RHEL-style deployments. In a real environment, administrators also need the normal SSSD prerequisites, such as correct file ownership and permissions for `/etc/sssd/sssd.conf`, AD enrollment/keytab setup for `id_provider = ad`, and appropriate NSS/PAM enablement through tools such as `authselect`.
