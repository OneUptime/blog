# Validation Summary: How to Configure systemd-oomd for Out-of-Memory Handling on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- systemd-oomd
- systemd unit resource control
- Linux cgroups v2
- Linux PSI (Pressure Stall Information)
- Linux swap and swappiness
- stress-ng

## Sources Consulted
- systemd-oomd.service(8), official systemd 249 man page: https://www.freedesktop.org/software/systemd/man/249/systemd-oomd.service.html
- oomd.conf(5), official systemd 249 man page: https://www.freedesktop.org/software/systemd/man/249/oomd.conf.d.html
- oomd.conf(5), official systemd 253 man page: https://www.freedesktop.org/software/systemd/man/253/oomd.conf.html
- systemd.resource-control(5), official systemd 254 man page: https://www.freedesktop.org/software/systemd/man/254/systemd.resource-control.html
- systemd.service(5), official systemd 253 man page: https://www.freedesktop.org/software/systemd/man/253/systemd.service.html
- Ubuntu Launchpad package information for systemd/systemd-oomd availability: https://launchpad.net/ubuntu/+source/systemd
- Local Ubuntu 24.04 systemd 255 man pages and CLI help for `systemd-oomd.service`, `oomd.conf`, `systemd.resource-control`, `systemd.service`, `oomctl`, and `systemd-analyze`.

## Issues Found
- The post used old oomd.conf option names (`SwapUsedLimitPercent=` and `DefaultMemoryPressureLimitPercent=`) as the primary configuration. Updated the examples to the documented Ubuntu 22.04+ / systemd 249+ syntax (`SwapUsedLimit=` and `DefaultMemoryPressureLimit=`).
- The memory pressure default was described as 100% and "any pressure triggers." Corrected it to the documented 60% default.
- The post referenced a non-existent `DefaultMemoryPressureTargetSeconds` setting. Removed that invalid configuration comment.
- The per-unit examples used invalid `ManagedOOMSwap=skip` and `ManagedOOMMemoryPressure=skip` values. Replaced them with `auto` for active monitoring behavior and `ManagedOOMPreference=omit` for critical-service protection.
- The post described `ManagedOOM*=kill` as directly making a service a kill target. Clarified that these settings monitor a unit's descendant cgroups, and adjusted non-critical service examples to use `ManagedOOMPreference=none` plus `OOMPolicy=kill` for cgroup-level eligibility behavior.
- The post described oomd victim selection as a single "badness score" under the root slice. Reworded this to match documented swap and memory-pressure candidate selection behavior.
- The post implied `OOMPolicy=kill` was a priority/preference value. Corrected the comment to explain that it causes the whole service cgroup to be killed when one process in the unit is OOM-killed.
- The post implied lower swappiness makes oomd trigger earlier because swap fills faster. Reworded this to accurately describe swappiness as controlling anonymous-memory swap tendency and advised workload testing.
- The install command did not note that `systemd-oomd` is available on Ubuntu 22.04 and newer, while Ubuntu 20.04 shipped systemd 245 and does not provide the same `systemd-oomd` package. Added that version caveat.

## Review Notes
The corrected post now targets current Ubuntu 22.04+ systemd behavior. Future improvements could mention `oomctl dump` for inspecting monitored cgroups, but that was not required to fix correctness.
