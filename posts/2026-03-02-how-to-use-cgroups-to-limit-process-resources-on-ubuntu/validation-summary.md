# Validation Summary: How to Use cgroups to Limit Process Resources on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux cgroups v2 (unified hierarchy)
- systemd resource control (systemctl, systemd-cgls, systemd-cgtop, systemd-run)
- systemd slice units and service drop-ins
- /sys/fs/cgroup interface files (cgroup.controllers, cgroup.procs, cgroup.subtree_control, memory.max, memory.high, memory.min, memory.current, cpu.max, cpu.weight, io.max)
- PSI (Pressure Stall Information)
- Ubuntu 22.04+

## Sources Consulted
- Linux kernel cgroup-v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- systemd.resource-control(5): https://man7.org/linux/man-pages/man5/systemd.resource-control.5.html
- systemd.slice(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.slice.html
- systemd-run(1): https://man7.org/linux/man-pages/man1/systemd-run.1.html
- Ubuntu cgroup v2 default announcement (Ubuntu 21.10+): https://lists.ubuntu.com/archives/ubuntu-devel/2021-August/041598.html
- systemd issue #10015 (slices.target ordering)

## Issues Found
- **`Before=slices.target` in custom slice unit files** — The post originally included `Before=slices.target` in the `[Unit]` section of both the `limited.slice` and `critical.slice` examples. While not harmful, this directive is misleading as a general pattern: custom slice units automatically get appropriate ordering via default dependencies, and `Before=slices.target` is only relevant for special early-boot slices. **Fix:** Removed the `Before=slices.target` lines from both slice file examples.

## Review Notes
- The example `echo "+cpu +memory +io" | sudo tee /sys/fs/cgroup/mygroup/cgroup.subtree_control` enables the listed controllers for `mygroup`'s **children**, not for `mygroup` itself. The example works correctly on systemd-managed Ubuntu only because the root cgroup already has these controllers enabled in its own `subtree_control` (systemd does this by default). The accompanying comment ("Enable controllers for child cgroups") is technically accurate, so the example was left as-is, but readers porting this pattern to a non-systemd environment may need to enable the controllers at the parent level first.
- The post description mentions "network resources" but the post does not actually cover network resource limits (which in cgroups v2 are typically handled via BPF rather than dedicated controllers like the v1 net_cls/net_prio). Not corrected since it is in the metadata description, not the post body.
- The example `mount | grep cgroup` output line is accurate but abbreviated — real Ubuntu output typically also includes `nsdelegate,memory_recursiveprot` mount options. Left as-is since the abbreviation does not change the meaning.
- All systemd properties (CPUQuota, MemoryMax, MemoryHigh, MemoryMin, IOWeight, CPUWeight, IOReadBandwidthMax, IOWriteBandwidthMax) and ranges/defaults (IOWeight default 100 / range 1-10000; cpu.weight default 100 / range 1-10000) are correct per systemd.resource-control(5).
- `cpu.max` format and default period (100000 microseconds), `io.max` nested-keyed format, `memory.high` (throttle) vs `memory.max` (OOM) semantics, and PSI file locations all verified accurate.
