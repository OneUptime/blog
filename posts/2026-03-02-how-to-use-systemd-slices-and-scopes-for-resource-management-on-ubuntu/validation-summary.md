# Validation Summary: How to Use systemd Slices and Scopes for Resource Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd (slices, scopes, services, units)
- Linux cgroups (cgroup v2 / unified hierarchy)
- `systemctl` (`set-property`, `start`, `status`, `show`, `list-units`)
- `systemd-cgls`, `systemd-cgtop`
- `systemd-run` (transient services and scopes)
- Resource control directives: `MemoryMax`, `MemoryLow`, `CPUQuota`, `CPUWeight`, `TasksMax`
- Ubuntu

## Sources Consulted
- `man systemctl` (set-property semantics, `--runtime` flag)
- `man systemd.resource-control` (MemoryMax, MemoryLow, CPUQuota, CPUWeight, TasksMax)
- `man systemd.slice` (slice unit definition and naming)
- `man systemd.scope` (scope unit semantics, transient nature)
- `man systemd-run` (`--scope`, `--unit`, `--slice`, `-p`, `-t/--pty`, `--remain-after-exit`)
- `man systemd-cgls`, `man systemd-cgtop`
- systemd upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- systemd upstream documentation: https://www.freedesktop.org/software/systemd/man/systemctl.html

## Issues Found
- **`systemctl set-property --runtime` semantics were reversed.** The post originally said the bare `set-property` command was "temporary" and that adding `--runtime` made it "persistent (survives reboots)". The actual behavior per `man systemctl` is the opposite: without `--runtime` the change is stored on disk (under `/etc/systemd/system.control/`) and persists across boots, while `--runtime` writes to `/run/systemd/system.control/` and only applies until the next reboot. The relevant code block and comments were corrected, and the `--runtime` line now points at `/run/systemd/system.control/`. The "remove a property" comment was also softened to "Reset a property to its default" since `MemoryMax=infinity` resets it to the unlimited default rather than literally removing the configuration entry.

## Review Notes
- The `Before=slices.target` directive used in the custom slice example is unusual for a user-defined slice (typically only the built-in slice units like `system.slice`/`user.slice`/`machine.slice` use it, often together with `DefaultDependencies=no`). It is not harmful — `slices.target` is a real systemd target — but it is also not necessary for user slices.
- The description of `MemoryLow=` as "Reserve memory so the OOM killer avoids these processes" is a simplification. `MemoryLow=` is a best-effort memory *reclaim* protection in the unified cgroup hierarchy; it does not directly tell the OOM killer to avoid the cgroup, though by keeping memory from being reclaimed it makes those processes less likely to come under memory pressure. Acceptable as a tutorial-level statement but worth keeping in mind.
- `systemd-cgls /myapp.slice` is shown with a leading slash; `systemd-cgls myapp.slice` (without the slash) also works and is the more common form. Both are accepted by `systemd-cgls`.
- The JSON keys (`unit`, `description`) used in the `python3` one-liner match the lowercase fields emitted by `systemctl list-units -o json` on modern systemd (v250+) shipping in current Ubuntu releases.
- All other commands, flag spellings (`--scope`, `--slice=`, `--unit=`, `-p`, `--remain-after-exit`, `-t`), unit-file directives, slice naming (`parent-child.slice` ⇒ child of `parent.slice`), the `-.slice` root, and the cgroup v2 paths under `/sys/fs/cgroup/...` were verified against the systemd documentation and are correct.
