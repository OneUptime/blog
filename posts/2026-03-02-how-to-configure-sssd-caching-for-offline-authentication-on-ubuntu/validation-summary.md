# Validation Summary: How to Configure SSSD Caching for Offline Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- SSSD
- PAM
- LDAP
- Active Directory
- Kerberos
- SSSD cache management tools
- iptables

## Sources Consulted
- Ubuntu Noble `sssd.conf(5)` man page: https://manpages.ubuntu.com/manpages/noble/man5/sssd.conf.5.html
- Ubuntu `pam_sss(8)` man page: https://manpages.ubuntu.com/manpages/questing/man8/pam_sss.8.html
- Ubuntu `sssd-ldap(5)` man page: https://manpages.ubuntu.com/manpages/jammy/man5/sssd-ldap.5.html
- Ubuntu Noble `sssd-krb5(5)` man page: https://manpages.ubuntu.com/manpages/noble/man5/sssd-krb5.5.html
- Ubuntu `sss_cache(8)` man page: https://manpages.ubuntu.com/manpages/jammy/man8/sss_cache.8.html
- Ubuntu `sssctl(8)` man page: https://manpages.ubuntu.com/manpages/jammy/man8/sssctl.8.html
- Local Ubuntu Noble `sssd-tools` 2.9.4 command help for `sssctl`, `sssctl domain-status`, `sssctl user-show`, `sssctl user-checks`, and `sss_cache`
- SSSD architecture documentation: https://sssd.io/docs/architecture.html
- SSSD troubleshooting documentation: https://sssd.io/troubleshooting/basics.html
- Red Hat Enterprise Linux 9 documentation, "Enabling offline authentication": https://docs.redhat.com/it/documentation/red_hat_enterprise_linux/9/pdf/configuring_authentication_and_authorization_in_rhel/Red_Hat_Enterprise_Linux-9-Configuring_authentication_and_authorization_in_RHEL-en-US.pdf

## Issues Found
- The post described SSSD cache databases as SQLite. SSSD stores its persistent cache in LDB databases, so this was corrected.
- The initial `sssd.conf` example labeled `offline_failed_login_attempts` and `offline_failed_login_delay` as cached-credential aging warnings. These options actually limit failed offline login attempts and delay retries, so the comments were corrected.
- The initial `sssd.conf` example labeled `krb5_store_password_if_offline` as a maximum cached-credential age setting. This option stores the password temporarily when the Kerberos provider is offline so SSSD can request a TGT after reconnecting, so the comment was corrected.
- The cache tuning example described `entry_cache_nowait_percentage`, `ldap_enumeration_refresh_timeout`, and `ldap_group_nesting_level` inaccurately. Their comments were updated to match the documented option semantics.
- The background refresh explanation said entries are always fresh when accessed. SSSD can return cached entries immediately while refreshing in the background, so this was softened to avoid overstating freshness.
- The PAM example for forcing online authentication used invalid guidance, including a non-existent `online_auth` flag and `pam_sss.so` options that do not force online authentication. The example was removed and replaced with a documented caveat that SSSD does not provide a per-service `pam_sss.so` option for this.
- The cache management section listed `sssctl user-list`, which is not available in Ubuntu Noble `sssctl`. The command was removed.
- The cache management section said `sssctl domain-status example.com --online` forces a domain back online. The `--online` flag displays online status only, so the comment was corrected.
- The monitoring script defined `ALERT_THRESHOLD` and described alerting if offline too long, but the script did not track elapsed offline time. The unused variable and inaccurate wording were removed.
- The `sss_cache -E` comment said it clears all cached data. The command invalidates entries and causes reload on the next lookup, so the comment was made more precise.
- The Kerberos section implied `krb5_store_password_if_offline` configures an offline Kerberos credential cache. The surrounding text was revised to explain that it stores a password temporarily while offline and requests a TGT when connectivity returns.

## Review Notes
The post is technically relevant and the corrected examples align with current SSSD 2.9-era Ubuntu behavior. Some operational choices, such as manually deleting `/var/lib/sss/db/*` after stopping SSSD, are common troubleshooting techniques but `sssctl cache-remove` is generally safer for cache removal when available.
