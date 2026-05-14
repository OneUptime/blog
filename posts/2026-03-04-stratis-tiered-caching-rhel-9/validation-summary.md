# Validation Summary: How to Set Up Stratis with Tiered Caching on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis
- stratis-cli and stratisd
- dm-cache / device-mapper cache
- Linux block devices
- fio
- sysstat / iostat

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing storage devices, Stratis file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_storage_devices/index
- Stratis upstream how-to: https://stratis-storage.github.io/howto/
- stratis-cli manual page: https://www.mankier.com/8/stratis
- Stratis software design document: https://stratis-storage.github.io/StratisSoftwareDesign.pdf
- Stratis 3.9.0 release notes: https://stratis-storage.github.io/stratis-release-notes-3-9-0/
- stratisd source code showing `writethrough` cache target configuration: https://github.com/stratis-storage/stratisd
- Linux kernel dm-cache documentation: https://www.kernel.org/doc/html/latest/admin-guide/device-mapper/cache.html

## Issues Found
- The post said multiple cache devices are striped by Stratis. Stratis documentation and design notes describe cache block devices as concatenated into a cache device, so this was changed to say they increase cache capacity.
- The post described write-through caching as writes going directly to the data tier and had a "No Write Caching" heading. This was clarified to "No Write-Back Caching" and updated to explain that writes are committed to the data tier rather than acknowledged from cache alone.
- The benchmark section used `fio` without installing it. Added `sudo dnf install fio -y` before the fio commands.
- The post said cache devices cannot be removed. This was refined to say individual cache devices cannot be removed from an active cache tier, while newer Stratis releases can start a pool without setting up its cache by using `stratis pool start --remove-cache`.
- The sizing guidance suggested monitoring cache hit rates without showing a Stratis-supported way to do so. This was changed to monitoring workload performance.

## Review Notes
The main Stratis CLI commands in the post (`pool create`, `pool init-cache`, `pool add-cache`, `blockdev list`, `filesystem create`, and `pool list`) match current documented syntax. The post remains version-sensitive because cache handling has changed in newer upstream Stratis releases; RHEL package versions may lag upstream behavior.
