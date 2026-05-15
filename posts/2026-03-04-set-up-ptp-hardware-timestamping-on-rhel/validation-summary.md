# Validation Summary: How to Set Up PTP Hardware Timestamping on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- PTP / IEEE 1588
- linuxptp
- ptp4l
- phc2sys
- ethtool
- NIC hardware timestamping and PTP Hardware Clocks

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Configuring PTP Using ptp4l": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-configuring_ptp_using_ptp4l
- Red Hat Enterprise Linux 8 Configuring basic system settings, "Chrony with HW timestamping": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/configuring_basic_system_settings/configuring-basic-system-settings.pdf
- linuxptp ptp4l(8) manual: https://www.linuxptp.org/documentation/ptp4l/
- linuxptp phc2sys(8) manual: https://www.linuxptp.org/documentation/phc2sys/
- ethtool(8) manual: https://man7.org/linux/man-pages/man8/ethtool.8.html

## Issues Found
- The install command only installed `ethtool`, but the tutorial also uses `ptp4l` and `phc2sys`, which are provided by the `linuxptp` package on RHEL. Updated the command to install both `ethtool` and `linuxptp`.
- The `ptp4l` example specified `enp1s0` both with `-i enp1s0` and as a `[enp1s0]` section in `/etc/ptp4l.conf`. The linuxptp documentation says port sections in the configuration file can define ports without `-i`, so the command was changed to read the interface from the config file.
- The verification command grepped for `time stamping` while the expected example log line was a selected PTP clock message. Updated the grep pattern to match `selected .* as PTP clock`.
- The post stated that offsets should be under 100 ns and that software timestamping will be in the microsecond range. Those values are hardware, driver, load, and network dependent. Updated the wording to describe sub-microsecond or nanosecond-scale accuracy as possible on suitable hardware and networks, and software timestamping offsets as typically larger.
- The troubleshooting command used case-sensitive `grep ptp` for driver metadata. Changed it to `grep -i ptp` to avoid missing uppercase driver/module text.
- The coalescing guidance was stated as an unconditional best-results command. Updated it to "consider disabling" because support and effect vary by NIC and workload.

## Review Notes
The commands and configuration keys are current for linuxptp documentation. The guide still uses `dnf`, which is appropriate for modern RHEL releases; older RHEL 7 systems may use `yum` in official examples.
