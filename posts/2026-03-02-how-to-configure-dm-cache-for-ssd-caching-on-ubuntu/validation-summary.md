# Validation Summary: How to Configure dm-cache for SSD Caching on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux device mapper dm-cache
- LVM / lvmcache
- SSD and HDD block storage
- ext4
- sysstat / iostat

## Sources Consulted
- Linux kernel device-mapper cache documentation: https://www.kernel.org/doc/html/latest/admin-guide/device-mapper/cache.html
- Upstream LVM lvmcache(7) manual page: https://www.man7.org/linux/man-pages/man7/lvmcache.7.html
- Ubuntu lvmcache(7) manual page: https://manpages.ubuntu.com/manpages/focal/man7/lvmcache.7.html
- lvchange(8) manual page for cache modes: https://man7.org/linux/man-pages/man8/lvchange.8.html
- lvs(8) manual page for reporting options: https://www.mankier.com/8/lvs

## Issues Found
- The metadata sizing guidance said cache metadata needs about 8MB per 1GB of cache and used a 4GB metadata LV for a 400GB cache. LVM documentation recommends cache metadata around 1/1000 of the cache data LV, with a minimum of 8MiB, so the example was corrected to 512MB.
- The cache pool creation command set `--cachemode writethrough` while converting the cache data and metadata LVs into a cache pool. LVM documentation describes `--cachemode` as applying when caching is started or changed on an existing cached LV, so the option was moved to the `lvconvert --type cache` command that attaches the cache pool to the origin LV.
- The origin LV comment said to constrain allocation with `--alloc`, but the example actually constrains placement by specifying `/dev/sda` as the PV. The comment was corrected.
- The monitoring section said the raw `lvs` output shows ratios. The command reports hit and miss counters, so the wording was corrected to say those counters can be used to calculate ratios.
- The troubleshooting section referred to `smc` for sequential I/O bypass. Current LVM cache documentation describes `smq` as the default policy and notes older `mq` settings such as sequential thresholds may be ignored on newer kernels. The note was corrected to recommend checking cache policy and settings instead.

## Review Notes
- The post is technically relevant and contains executable storage administration commands.
- The commands are destructive when run on real block devices; the tutorial assumes the user has selected expendable devices or has backups.
- Current LVM supports newer `cachevol` workflows in addition to the cache-pool workflow shown here, but the documented cache-pool approach remains valid.
