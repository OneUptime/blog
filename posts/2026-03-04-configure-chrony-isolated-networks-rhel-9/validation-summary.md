# Validation Summary: How to Configure chrony for Isolated Networks Without Internet Access on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- chrony and chronyd
- NTP
- gpsd
- firewalld
- Linux system time and hardware clock management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring basic system settings" / chrony time synchronization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- chrony 4.7 chrony.conf(5) manual: https://chrony-project.org/doc/4.7/chrony.conf.html
- chrony 4.7 chronyc(1) manual: https://chrony-project.org/doc/4.7/chronyc.html
- systemd timedatectl manual: https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- Local command help for timedatectl, firewall-cmd, and hwclock where available

## Issues Found
- The redundant server configuration used `local stratum 8` on the primary and `local stratum 9 orphan` on the secondary, while chrony orphan mode requires the servers to use the same local/orphan configuration and poll each other. Updated the primary and secondary examples to use `local stratum 8 orphan` and poll each other with `server` directives.
- The secondary example configured both `server 10.0.0.1` and `peer 10.0.0.1` for the same upstream. Removed the duplicate `peer` directive and kept the simpler documented polling model.
- The post recommended periodic correction with `chronyc makestep`, but `makestep` only forces an already known/slewed correction to step immediately; it does not set a new manually supplied correct time. Updated the examples to use `chronyc settime` for manual time input.
- The chrony configuration did not enable the `manual` directive, which is required for `chronyc settime` support. Added `manual` to the local-clock server examples.

## Review Notes
The GPS reference-clock example is plausible for gpsd SHM integration, but real deployments should verify the gpsd SHM unit mapping and PPS device behavior for the specific receiver and platform. The post intentionally stays generic, which is acceptable for a guide.
