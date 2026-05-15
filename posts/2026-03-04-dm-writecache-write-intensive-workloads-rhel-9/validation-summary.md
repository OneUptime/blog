# Validation Summary: How to Configure dm-writecache for Write-Intensive Workloads on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM
- dm-writecache
- dm-cache
- device-mapper
- SSD, NVMe, and persistent memory caching
- smartctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, "Caching logical volumes with dm-writecache" and "Uncaching a logical volume": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9 documentation: "Enabling dm-writecache caching for a logical volume" and "Disabling caching for a logical volume": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_logical_volumes/red_hat_enterprise_linux-9-configuring_and_managing_logical_volumes-en-us.pdf
- Linux kernel documentation: device-mapper writecache target: https://docs.kernel.org/6.2/admin-guide/device-mapper/writecache.html
- LVM upstream manual page: lvmcache(7): https://www.man7.org/linux/man-pages/man7/lvmcache.7.html
- LVM upstream manual page: lvcreate(8): https://www.man7.org/linux/man-pages/man8/lvcreate.8.html
- LVM upstream manual page: lvconvert(8): https://www.man7.org/linux/man-pages/man8/lvconvert.8.html

## Issues Found
- The cachevol creation command created an active LV. Red Hat's dm-writecache procedure creates a deactivated cachevol before attaching it, so the command was changed to `lvcreate -an`.
- The attach procedure said the filesystem must be unmounted or the LV inactive, but Red Hat's procedure requires the slow LV to be inactive. The example now unmounts the filesystem, deactivates the LV before `lvconvert`, and reactivates it afterward.
- The one-step creation example incorrectly implied that `lvcreate --type writecache --cachevol` can create a writecache LV and attach it to an existing origin LV in one command. It was changed to the documented one-step pattern for creating a new cached LV with `--cachedevice` and `--cachesize`.
- The verification command did not show which cachevol was attached. `pool_lv` was added to the `lvs` output fields.
- The removal example detached the cache while the LV was still active. It now deactivates the LV before `lvconvert --uncache` and reactivates it afterward.
- The data-safety section incorrectly stated that battery-backed or power-loss-protected SSDs make data safe if the SSD itself fails. The wording now distinguishes power-loss protection from cache-device failure and notes that redundancy is needed to protect against SSD failure.
- The filesystem requirements section now matches the corrected attach and detach procedure by stating that the LV must be unmounted and deactivated.

## Review Notes
The sizing recommendations are workload-dependent rules of thumb rather than vendor guarantees. The post is technically valid after the fixes, but production deployments should also account for dm-writecache memory usage and filesystem sector or block-size compatibility.
