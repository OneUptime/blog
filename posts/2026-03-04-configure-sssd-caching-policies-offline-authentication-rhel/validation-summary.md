# Validation Summary: How to Configure SSSD Caching Policies for Offline Authentication on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- SSSD
- PAM
- LDAP / Active Directory authentication
- Linux systemd and firewall command-line tools

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Enabling offline authentication": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux 8 documentation, "Querying domain information using SSSD": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_authentication_and_authorization_in_rhel/index
- Local `sssd.conf(5)` man page for `cache_credentials`, `entry_cache_timeout`, `entry_cache_nowait_percentage`, `offline_credentials_expiration`, and `account_cache_expiration`
- `sssctl(8)` man page reference: https://www.mankier.com/8/sssctl
- SSSD `sssctl` design/reference page for `domain-status` flags: https://docs.pagure.org/sssd.sssd/design_pages/sssctl.html

## Issues Found
- `offline_credentials_expiration` was shown inside the domain section. This is a PAM service option, so it was moved to a `[pam]` section while keeping the original value and explanation.
- `account_cache_expiration` was described as the number of days cached credentials can be used for offline login. It actually controls how long cached account entries remain before cleanup and must be greater than or equal to `offline_credentials_expiration`. The comments were corrected.
- `entry_cache_nowait_percentage` was described as a setting in seconds. It is a percentage of `entry_cache_timeout`, so the comments were corrected.
- `sssctl user-checks` was described as listing cached users. It runs NSS and PAM checks for a specified user, so the comment was corrected.
- `sssctl domain-status example.com --online` was described as viewing cache statistics. It shows online status information, so the comment was corrected.

## Review Notes
The firewall testing example is conceptually valid for a simple lab, but real AD or LDAP environments may require blocking multiple servers or ports, and RHEL deployments may use firewalld/nftables instead of direct iptables rules.
