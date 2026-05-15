# Validation Summary: How to Configure autofs Timeout and Caching Settings on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- autofs
- NFS
- SSSD
- Linux systemd services

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-file-systems-on-demand_managing-file-systems
- Red Hat Customer Portal, "How do I change the default idle timeout for autofs?": https://access.redhat.com/articles/7425
- autofs.conf(5) Linux manual page: https://man7.org/linux/man-pages/man5/autofs.conf.5.html
- sssd.conf(5) manual page: https://www.mankier.com/5/sssd.conf
- sss_cache(8) manual page: https://www.mankier.com/8/sss_cache

## Issues Found
- The introduction said autofs caching settings control how often autofs re-reads map configuration. I changed this to say they control how long successful and failed map lookups are cached, which matches `positive_timeout` and `negative_timeout`.
- The `mount_wait` section said the default is usually around 30 seconds. I changed this to explain that autofs normally waits for `mount(8)` to return unless `mount_wait` is configured, matching autofs.conf(5).
- The map caching snippet described `map_hash_table_size` as a map entry cache timeout. I added `positive_timeout = 120` for successful map lookup caching and clarified that `map_hash_table_size` controls hash table slots, not cache duration.

## Review Notes
The post is technically relevant and the remaining commands and configuration examples are consistent with RHEL/autofs and SSSD documentation. For future improvement, the post could mention that `systemctl reload autofs` is sufficient for many map changes, while service restarts are appropriate after daemon configuration changes.
