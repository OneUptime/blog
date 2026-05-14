# Validation Summary: How to Tune IdM Performance for Large-Scale Deployments on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management
- FreeIPA
- 389 Directory Server
- MIT Kerberos KDC
- SSSD
- systemd
- Linux sysctl networking settings

## Sources Consulted
- Red Hat Enterprise Linux 9: Tuning performance in Identity Management, Chapter 7: Adjusting IdM Directory Server performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/tuning_performance_in_identity_management/adjusting-idm-directory-server-performance_tuning-performance-in-idm
- Red Hat Enterprise Linux 9: Tuning performance in Identity Management, Chapter 8: Adjusting the performance of the KDC: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/tuning_performance_in_identity_management/tuning_performance_in_identity_management
- 389 Directory Server dsconf manual page: https://manpages.debian.org/testing/python3-lib389/dsconf.8.en.html
- MIT Kerberos kdc.conf documentation: https://web.mit.edu/Kerberos/krb5-latest/doc/admin/conf_files/kdc_conf.html
- SSSD sssd.conf manual page: https://man.archlinux.org/man/sssd.conf.5.en
- SSSD IPA provider manual page: https://manpages.ubuntu.com/manpages/noble/man5/sssd-ipa.5.html

## Issues Found
- The database cache section described `nsslapd-dbcachesize` as needing to hold the entire database. Red Hat documents it as the database index cache and recommends fitting it with the entry cache in memory, while relying on auto-sizing unless there is a strong reason to override it. Updated the explanation accordingly.
- The database cache command used the invalid `dsconf backend config set --db-cache-size` option. Updated it to the documented `--dbcachesize` option and included `--cache-autosize=0` because manual cache values require overriding auto-sizing.
- The entry cache examples used a suffix DN directly and an invalid `--cache-entries` option. Updated the flow to list backend names, use the `userroot` backend in examples, disable cache auto-sizing before setting a manual entry cache, and use the documented `--cache-size=-1` option for unlimited entry count.
- The index creation example used `backend index create`, but current `dsconf` exposes `backend index add`. Updated the command.
- The KDC worker-process section only tuned `kdc_tcp_listen_backlog`. Split this into a listen queue section and a worker-process section, corrected the example backlog value to a documented valid value, and added the RHEL-supported `/etc/sysconfig/krb5kdc` `KRB5KDC_ARGS='-w N'` workflow.
- The SSSD `entry_cache_nowait_percentage` comment said it controlled negative lookup caching. Updated it to describe background refresh behavior.
- The SSSD access-control snippet claimed HBAC settings limit what SSSD resolves. Updated the wording to say HBAC controls host login access.
- The quick reference said large DB cache should be `1+ GB`; RHEL 9 documentation notes the database cache is limited to about 1.5 GB. Updated the range to `1-1.5 GB`.

## Review Notes
The post is technically relevant and includes commands and configuration snippets. Some tuning values remain workload-dependent rules of thumb; administrators should benchmark and monitor before applying them broadly.
