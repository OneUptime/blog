# Validation Summary: How to Migrate from ntpd to Chrony on RHEL

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- ntpd / ntp
- chrony / chronyd / chronyc
- NTP configuration and migration
- systemd service management
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Configuring time synchronization and migrating to chrony, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Configuring time synchronization, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- chrony.conf(5) manual, chrony 4.7, https://chrony-project.org/doc/4.7/chrony.conf.html
- chronyd(8) manual, https://chrony-project.org/doc/4.3/chronyd.html
- chronyc(1) manual, https://chrony-project.org/doc/2.4/chronyc.html

## Issues Found
- The post referred broadly to "RHEL" where the removal of ntp/ntpd applies specifically to RHEL 8 and later. Updated the wording to RHEL 8 and 9 in the introduction, ntpd removal section, and rollback section.
- The broadcast/multicast section said chrony does not support NTP broadcast or multicast at all. Updated it to distinguish the unsupported broadcast/multicast client mode from chrony's broadcast server directive syntax.
- The authentication example only loaded a key file and did not show the required `key <id>` option on an authenticated source. Added `key 1` to the relevant ntpd and chrony server examples.
- The MD5/SHA1 guidance said chrony prefers SHA1 over MD5. Updated it to match current chrony documentation: use random hexadecimal keys of at least 128 bits, avoid MD5 unless required for compatibility, and use SHA1 or stronger algorithms when supported by both sides.
- The `ntpdate -q` replacement used an ambiguous placeholder command. Updated it to `chronyd -Q "server ntp.example.com iburst"` to show the actual directive form.
- The systemd-timesyncd note assumed the service exists on the system. Updated the wording to check it only if installed.

## Review Notes
The post is technically relevant and now matches Red Hat's documented RHEL 8/9 migration guidance and chrony's current configuration syntax. Future improvements could mention Red Hat's `ntp2chrony.py` migration helper, but that is optional and not required for correctness.
