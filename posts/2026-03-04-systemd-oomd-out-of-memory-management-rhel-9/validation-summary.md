# Validation Summary: How to Configure systemd-oomd for Proactive Out-of-Memory Management on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd
- systemd-oomd
- cgroups v2
- Linux PSI memory pressure
- systemctl, systemd-run, oomctl, journalctl

## Sources Consulted
- RHEL 9 systemd-oomd.service man page: https://redhat-plumbers.github.io/systemd-rhel9/systemd-oomd.service.html
- RHEL 9 oomd.conf man page: https://redhat-plumbers.github.io/systemd-rhel9/oomd.conf.html
- RHEL 9 systemd.resource-control man page: https://redhat-plumbers.github.io/systemd-rhel9/systemd.resource-control.html
- RHEL 9 oomctl man page: https://redhat-plumbers.github.io/systemd-rhel9/oomctl.html
- Upstream systemd oomd.conf documentation: https://www.freedesktop.org/software/systemd/man/253/oomd.conf.html
- Upstream systemd.resource-control documentation: https://www.freedesktop.org/software/systemd/man/247/systemd.resource-control.html
- Local systemd man pages for systemd-oomd.service(8), oomd.conf(5), systemd.resource-control(5), oomctl(1), and systemctl(1)

## Issues Found
- The post used `DefaultMemoryPressureDurationUSec=`, which is not the documented oomd.conf directive on RHEL 9. Changed it to `DefaultMemoryPressureDurationSec=`.
- The swap-limit comment said oomd kills when swap usage alone exceeds 90%. RHEL 9 documentation says `SwapUsedLimit=` acts when both memory and swap usage fractions exceed the limit. Updated the comment.
- The post implied `ManagedOOMMemoryPressure=kill` on a service directly makes that service the kill target. RHEL 9 documentation says the monitored unit itself is not the kill candidate; eligible descendant cgroups are selected. Updated the example to monitor a slice and place the service under that slice.
- The critical-service example used `ManagedOOMMemoryPressure=auto` and `OOMPolicy=continue` as protection. `auto` does not omit a unit from kill candidacy when an ancestor is monitored, and `OOMPolicy=continue` is not an oomd omit setting. Replaced it with `ManagedOOMPreference=omit`.
- The monitoring example used `oomctl` without a command. RHEL 9 `oomctl` documents the `dump` command, so the command was changed to `oomctl dump`.
- The test example set `ManagedOOMMemoryPressure=kill` directly on the transient stress service and used `MemoryMax=`, which would not reliably demonstrate systemd-oomd selecting an eligible descendant cgroup. Updated it to create a runtime monitored slice and run the stress unit under that slice.
- The introductory and summary language described killing the highest-memory or most appropriate cgroup too broadly. Updated it to match documented behavior: systemd-oomd selects eligible descendant cgroups based on reclaim or swap activity.

## Review Notes
The post is technically relevant and salvageable. Future improvements could mention system requirements explicitly: full unified cgroup hierarchy, PSI support, memory accounting for monitored units, and swap being recommended for optimal oomd behavior.
