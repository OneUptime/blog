# Validation Summary: How to Configure PTP and chrony Hybrid Time Synchronization on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- linuxptp
- ptp4l
- phc2sys
- chrony / chronyd
- Precision Time Protocol (PTP)
- Network Time Protocol (NTP)
- systemd service overrides

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, Chapter 20: Configuring PTP Using ptp4l: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-configuring_ptp_using_ptp4l
- Red Hat Enterprise Linux 8 Configuring basic system settings, Chapter 12: Configuring time synchronization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- linuxptp phc2sys documentation: https://www.linuxptp.org/documentation/phc2sys/
- linuxptp ptp4l documentation: https://www.linuxptp.org/documentation/ptp4l/
- chrony chrony.conf documentation: https://chrony-project.org/doc/4.7/chrony.conf.html

## Issues Found
- The chrony refclock comment said `poll 2` polls every 2 seconds. chrony defines `poll` as a power-of-two interval, so `poll 2` means 4 seconds. Updated the comment to say 4 seconds.
- The verification section said the expected output shows nanosecond-level accuracy. A `precision 1e-9` setting advertises reference clock precision, but it does not guarantee end-to-end nanosecond accuracy. Updated the statement to say the SHM/PTP source should show a low offset and be preferred over NTP sources.

## Review Notes
- The overall architecture is technically valid: Red Hat documents PTP/NTP fallback through linuxptp, phc2sys, and SHM reference clocks, and linuxptp documents the `ntpshm` servo and `-M` SHM segment option.
- For production RHEL deployments, administrators should confirm the actual NIC interface name, PHC hardware timestamping support, PTP domain/profile settings, and local systemd unit defaults.
