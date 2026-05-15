# Validation Summary: How to Create an LVM Cache Volume with lvmcache on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- lvmcache
- dm-cache
- cache pools and cachevol LVs
- LVM CLI commands: `lvcreate`, `lvconvert`, `lvchange`, `lvs`, `lvextend`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing logical volumes", section 5.2 "Caching logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_and_managing_logical_volumes/index
- `lvmcache(7)` upstream manual page: https://man7.org/linux/man-pages/man7/lvmcache.7.html
- Red Hat Enterprise Linux 9 `lvchange(8)` manual-page reference for cache mode and cache settings options: https://www.mywebuniversity.com/RedHat_92/Man_PDF/lvchange.8.pdf
- Red Hat LVM reporting documentation for `lvs` segment/report fields: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/logical_volume_manager_administration/custom_report

## Issues Found
- The resizing workflow used `lvconvert --uncache` and then attempted to extend the cache LV. This was incorrect because `--uncache` detaches and removes the cache volume. Changed it to `lvconvert --splitcache`, which detaches the cache while preserving the cache LV so it can be resized and reattached.
- The `cachevol` method was described as "recommended for single-volume caching." Official Red Hat documentation describes `cachevol` as simpler but with less placement control than `cachepool`; it does not specifically recommend it over `cachepool` for single-volume caching. Changed the wording to "convenient for single-volume caching."
- The `sequential_threshold` setting was listed as a common setting without caveat. Current `lvmcache(7)` documentation notes that `sequential_threshold` is an older `mq` policy setting and is ignored when newer kernels alias `mq` to `smq`. Added that caveat while preserving the tuning section.

## Review Notes
The core dm-cache creation, cache-pool creation, cachevol attachment, verification, cache mode, cache policy, dirty-block reporting, and cache removal commands align with Red Hat and upstream LVM documentation. RHEL 9 documentation also covers `dm-writecache`; this post focuses on `dm-cache`, which is appropriate for the title and examples.
