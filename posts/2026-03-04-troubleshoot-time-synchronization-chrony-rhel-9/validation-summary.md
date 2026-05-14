# Validation Summary: How to Troubleshoot Time Synchronization Issues with chrony on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- chrony, `chronyd`, and `chronyc`
- NTP
- systemd `timedatectl` and `systemctl`
- firewalld
- SELinux troubleshooting commands

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring basic system settings, date/time and chrony sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index
- chrony `chronyc(1)` manual, source states, reachability, tracking, `makestep`, `refresh`, `sourcestats`, and `ntpdata`: https://chrony-project.org/doc/4.4/chronyc.html
- chrony `chrony.conf(5)` manual, `server`, `pool`, `iburst`, `driftfile`, `makestep`, and logging directives: https://chrony-project.org/doc/4.7/chrony.conf.html
- firewalld concepts and policies documentation for zone and outbound-policy behavior: https://firewalld.org/documentation/concepts.html
- firewalld policy manual page: https://firewalld.org/documentation/man-pages/firewalld.policies.html
- Local `timedatectl --help`, `man timedatectl`, and `systemctl --help` output.

## Issues Found
- The quick health check said `NTP service: active` means chrony is running and listed `NTP enabled: yes`. RHEL 9 documentation shows `timedatectl` reports `NTP service` and `System clock synchronized`, not `NTP enabled`; also `NTP service: active` means a time sync service is active, normally chronyd on RHEL. Updated the wording and removed the obsolete `NTP enabled` bullet.
- The reachability step used `chronyc sourcestats -v` to show `Reach`. chrony documents `Reach` on `chronyc sources`, while `sourcestats` reports regression statistics such as NP, NR, Span, Frequency, Offset, and Std Dev. Changed the command to `chronyc sources -v`.
- The DNS section said chrony silently fails to add unresolved NTP hostnames. chrony retries unresolved names and reports sources without usable addresses until resolution succeeds. Reworded the claim to avoid implying permanent silent failure.
- The firewall section used `firewall-cmd --add-service=ntp` as an outbound egress fix. firewalld zone services are primarily for traffic to the host; outbound filtering requires policies/direct rules or upstream firewall rules. Reworded the section so `--add-service=ntp` is only recommended when the host serves NTP to clients, and directed strict egress troubleshooting to outbound UDP 123 policy/ACL checks.
- The conflicting-services section said to stop either `ntpd` or `systemd-timesyncd` but only disabled `systemd-timesyncd`. Updated the command block to disable whichever conflicting service is present.

## Review Notes
The remaining chrony commands and configuration snippets are consistent with the chrony and RHEL documentation reviewed. The UDP `nc -vzu` check can be inconclusive on some networks because UDP does not guarantee an application response, but the command syntax itself is valid as a quick connectivity probe.
