# Validation Summary: How to Set Up NTP Time Synchronization with Chrony on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Chrony / chronyd
- NTP
- chronyc
- chrony.conf
- firewalld
- systemd timedatectl
- ethtool hardware timestamping

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring time synchronization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- Chrony upstream chrony.conf(5) manual: https://chrony-project.org/doc/4.7/chrony.conf.html
- Chrony upstream chronyc(1) manual: https://chrony-project.org/doc/4.7/chronyc.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- systemd timedatectl manual: https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- Local command help for timedatectl and ethtool in the review environment.

## Issues Found
- The `iburst` explanation said it sends exactly 4 startup requests. Upstream Chrony documents `iburst` as a burst of 4-8 requests, so the wording was corrected.
- The `local stratum 10` note implied it was useful for GPS or other hardware reference clocks. Chrony uses reference clock configuration for hardware clocks; `local` is for presenting a local reference in isolated networks. The note was corrected.
- The `chronyc sources` state table omitted important source-state markers and described `?` too narrowly. The table was updated to include `x`, `~`, and a more accurate `?` description.
- The hardware timestamping verification incorrectly told readers to look for `HW` in the `chronyc sources -v` mode column. Red Hat and upstream Chrony documentation show timestamping mode in `chronyc ntpdata`, so the command and expected fields were corrected.
- The hardware timestamping section did not mention the Chrony guidance that best results require both sides to use hardware timestamping and often use shorter polling plus interleaved mode on local networks. A short caveat was added.
- The troubleshooting section labeled `ss -ulnp | grep 123` as checking whether UDP 123 was open. That command only checks local listening sockets, so the wording was corrected to apply to hosts serving time.

## Review Notes
The review environment did not have `chronyc`, `chronyd`, or `firewall-cmd` installed, so those commands were verified against official documentation instead of local help output. The article is accurate for RHEL 9 after the corrections above.
