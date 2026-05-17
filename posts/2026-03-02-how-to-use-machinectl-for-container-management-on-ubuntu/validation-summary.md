# Validation Summary: How to Use machinectl for Container Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd-machined / `machinectl`
- systemd-nspawn
- `.nspawn` configuration files
- `debootstrap`
- systemd template units (`systemd-nspawn@.service`)
- systemd cgroup resource controls (`MemoryMax`, `CPUQuota`, `IOWeight`)
- `journalctl -M` (per-machine journal)
- `nsenter`
- Ubuntu (apt, archive.ubuntu.com)
- Alpine and Ubuntu cloud minimal images

## Sources Consulted
- machinectl(1) — https://www.freedesktop.org/software/systemd/man/latest/machinectl.html (mirror: https://man7.org/linux/man-pages/man1/machinectl.1.html)
- systemd-nspawn(1) — https://www.freedesktop.org/software/systemd/man/latest/systemd-nspawn.html
- systemd.nspawn(5) — https://www.freedesktop.org/software/systemd/man/latest/systemd.nspawn.html (mirror: https://man7.org/linux/man-pages/man5/systemd.nspawn.5.html)
- systemd.resource-control(5) — for `MemoryMax`, `CPUQuota`, `IOWeight` validity
- journalctl(1) — for the `-M` machine selector
- nsenter(1) — for `-m -u -i -n -p -t PID` flag set
- importctl(1) — https://www.freedesktop.org/software/systemd/man/latest/importctl.html (relevant for the future deprecation note below)

## Issues Found

1. **Invalid `machinectl list-machines` command with misleading comment.** The original post claimed `machinectl list-machines` lists "all registered machines (including stopped ones)." `list-machines` is not a documented verb of `machinectl`; only `list` is. Furthermore, `systemd-machined` only tracks running machines — neither command shows stopped containers. Fixed by removing the invalid command line and adding a note clarifying that `list-images` is what shows non-running container rootfs/images.

2. **Incorrect "transient" service terminology.** The post stated that `machinectl start` "creates a transient systemd service: `systemd-nspawn@mycontainer.service`." In systemd terminology, "transient" means a unit created dynamically without a unit file. `machinectl start` actually instantiates the static `systemd-nspawn@.service` template unit (shipped with the `systemd-container` package). Fixed the wording to accurately describe template instantiation.

3. **Missing Markdown header marker.** The "Resource Limits for Containers" line was missing the `##` prefix, so it rendered as plain text instead of a section header. Added the missing `##`.

## Review Notes

- **`machinectl pull-tar` / `pull-raw` deprecation:** These verbs are still present in systemd versions shipped with Ubuntu 22.04 (systemd 249) and Ubuntu 24.04 (systemd 255), so they are valid for the audience of this post today. However, in systemd 256+ (which Ubuntu 26.04 will ship with), the image import/export functionality has been split out into a separate `importctl(1)` tool (e.g., `importctl pull-tar`). Readers on bleeding-edge systemd may need to use `importctl` instead. Not changed in the post since the current Ubuntu LTS releases still use `machinectl` for these.
- **`Private=no` in `[Network]`:** Verified valid — defaults to off and corresponds to `--private-network=no`.
- All `.nspawn` directives used (`Boot=`, `Hostname=`, `Environment=`, `Capability=` in `[Exec]`; `Bind=`, `BindReadOnly=` in `[Files]`; `VirtualEthernet=`, `Private=` in `[Network]`) verified valid against systemd.nspawn(5).
- `systemd-nspawn` flags used (`-D`/`--directory=`, `--boot`, `--network-veth`, `--network-bridge=`, `--machine=`, `--quiet`, `--keep-unit`, `--link-journal=try-guest`) all verified valid.
- `machinectl shell USER@MACHINE` syntax verified valid.
- `nsenter -m -u -i -n -p -t PID` flag set is correct (mount, UTS, IPC, network, PID namespaces with target PID).
- The `systemctl set-property` resource controls (`MemoryMax`, `CPUQuota`, `IOWeight`) are all valid cgroup v2 properties exposed via systemd.
- The cloud images URL (`https://cloud-images.ubuntu.com/minimal/releases/jammy/release/`) and Alpine mini rootfs URL (`https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/`) are valid resource locations at time of review.
