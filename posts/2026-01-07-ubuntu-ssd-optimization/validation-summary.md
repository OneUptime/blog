# Validation Summary: How to Optimize Ubuntu for SSD Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu / Linux
- SSD (NAND flash) and HDD storage fundamentals
- TRIM / `fstrim` and the `fstrim.timer` systemd unit
- Linux I/O schedulers (none/noop, mq-deadline, bfq, kyber)
- udev rules
- GRUB kernel parameters
- `/etc/fstab` mount options (noatime, nodiratime, relatime, discard, commit, barrier)
- sysctl kernel tuning (swappiness, vfs_cache_pressure, dirty ratios)
- Partition alignment (`fdisk`, `parted`, `gdisk`)
- smartmontools (`smartctl`, `smartd`)
- systemd timers and services
- journald configuration
- tmpfs

## Sources Consulted
- `fstrim(8)` / `util-linux` documentation — fstrim flags (`-v`, `-a`) and the packaged `fstrim.timer` (weekly default)
- Linux kernel block layer documentation — multi-queue (blk-mq) schedulers and `/sys/block/<dev>/queue/scheduler`
- Linux kernel commit/changelog for the 5.0 removal of the legacy block layer and deprecation of the `elevator=` boot parameter (no effect on blk-mq kernels; warning logged)
- Kernel `Documentation/admin-guide/sysctl/vm.rst` — swappiness, vfs_cache_pressure, dirty_ratio, dirty_background_ratio, dirty_writeback_centisecs, dirty_expire_centisecs
- `ext4(5)` / `mount(8)` mount option semantics (noatime, nodiratime, relatime, discard, commit, barrier)
- `smartd.conf(5)` — directive syntax for `-a`, `-o`, `-S`, `-n`, `-s` (test schedule regex `T/MM/DD/d/HH`), `-W DIFF,INFO,CRIT`, `-m`
- `smartctl(8)` — `-H`, `-A`, `-a`
- `systemd.timer(5)` — OnCalendar, RandomizedDelaySec, Persistent
- `journald.conf(5)` — Storage, Compress, SystemMaxUse, RuntimeMaxUse, RateLimit options
- `parted(8)` / `gdisk` alignment behavior; `/proc/diskstats` and `/sys/block/<dev>/stat` field layout (field 3 = sectors read, field 7 = sectors written)
- Verified against the host kernel (6.17) which uses blk-mq exclusively, confirming `elevator=` is non-functional

## Issues Found
1. **Deprecated `elevator=` kernel parameter presented as functional.** The "Alternative: Kernel Parameter Method" section claimed `elevator=none` in GRUB sets the scheduler for all drives. The legacy single-queue block layer was removed in Linux 5.0, and `elevator=` has had no effect on multi-queue (blk-mq) kernels since then — all currently supported Ubuntu releases use such kernels, where the parameter is silently ignored with a logged warning. Updated the section heading to "(Legacy)", added a clear note that the parameter no longer has effect on Linux 5.0+ and that the udev rule should be used instead, and corrected the inline comment to reflect that it applied only to legacy kernels.
2. **`$USER` will not expand inside `/etc/fstab` (or inside the single-quoted `echo`).** The browser-cache tmpfs example wrote `/home/$USER/.cache/browser-ramdisk` to fstab; fstab performs no variable expansion, and the single quotes prevent shell expansion at write time, so the literal string `$USER` would be written and the mount would fail. Replaced with a `youruser` placeholder and added a note that fstab does not expand variables and the username must be written out.
3. **Incorrect description of the smartd `-W 0,0,45` directive.** The comment said it would "warn if temp rises 45C from baseline." The `-W DIFF,INFO,CRIT` directive uses the first field for a change-from-baseline trigger; with `0,0,45` the DIFF and INFO fields are disabled and `45` is an absolute critical threshold. Corrected the comment to describe `-W DIFF,INFO,CRIT` and that `0,0,45` logs a critical warning at an absolute 45°C.

## Review Notes
- The bulk of the post is technically accurate: rotational-flag detection (`/sys/block/sda/queue/rotational`, 0 = SSD), `lsblk` usage, `hdparm -I | grep -i trim`, `fstrim` usage, the periodic-vs-continuous TRIM trade-off, scheduler descriptions, the udev rule syntax (including separate NVMe handling), noatime/nodiratime semantics (noatime implies nodiratime), the sysctl values and their units (centiseconds), partition-alignment guidance, the SMART attribute IDs (5, 9, 177, 233, 241), the smartd test-schedule regex, and the `/sys/block/sda/stat` field offsets (field 3 = sectors read, field 7 = sectors written) are all correct.
- The post states the swappiness range is "0-100". Since kernel 5.8 the maximum accepted value is 200; 0-100 remains the conventional/useful range and the example value (10) is unaffected, so this was left as-is but is worth noting for a future revision.
- `RateLimitInterval=30s` in the journald snippet uses the older option name; current systemd prefers `RateLimitIntervalSec`, but the old name is still accepted as a compatibility alias, so it remains functional.
- A 45°C critical temperature threshold in the smartd example is conservative (many drives idle near that under normal conditions); readers may want to raise the CRIT value to a more realistic 60–70°C for their hardware. Left as an illustrative example.
- Disabling write barriers (`barrier=0`) is correctly and prominently flagged as NOT RECOMMENDED.
- The closing caveat that modern Ubuntu already enables several of these optimizations by default (e.g. `fstrim.timer` is enabled out of the box) is accurate and appropriately sets expectations.
