# Validation Summary: How to Configure Secure Shared Memory on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration hardening guide

## Technologies Covered
- Ubuntu/Linux
- `/dev/shm`
- tmpfs
- `/etc/fstab`
- Linux mount options (`noexec`, `nosuid`, `nodev`)
- auditd (`auditctl`, `ausearch`)
- systemd service hardening
- PostgreSQL shared memory
- Chromium shared memory behavior

## Sources Consulted
- Linux `fstab(5)` manual: https://man7.org/linux/man-pages/man5/fstab.5.html
- Linux `mount(8)` manual: https://man7.org/linux/man-pages/man8/mount.8.html
- Linux `tmpfs(5)` manual: https://man7.org/linux/man-pages/man5/tmpfs.5.html
- Linux `findmnt(8)` manual: https://man7.org/linux/man-pages/man8/findmnt.8.html
- Linux `auditctl(8)` manual: https://man7.org/linux/man-pages/man8/auditctl.8.html
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- PostgreSQL documentation, Resource Consumption / shared memory settings: https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL documentation, Managing Kernel Resources: https://www.postgresql.org/docs/current/kernel-resources.html
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Chromium source for `--disable-dev-shm-usage`: https://chromium.googlesource.com/chromium/src/+/main/base/base_switches.cc
- Chromium shared memory implementation: https://chromium.googlesource.com/chromium/src/+/main/base/memory/platform_shared_memory_region_posix.cc

## Issues Found
- The post said `nodev` prevents creation of device files. `nodev` prevents character or block special devices on the filesystem from being interpreted; it does not necessarily prevent `mknod` from creating the inode. Updated the fstab comment and nodev test explanation.
- The PostgreSQL bullet stated that PostgreSQL uses POSIX `shm_open` for buffers. PostgreSQL documentation describes main shared memory and dynamic shared memory separately, and POSIX shared memory is one implementation option for dynamic shared memory. Updated the wording to avoid overstating the default behavior.
- The Redis bullet said Redis can use shared memory for cluster communication. Redis Cluster documentation says cluster nodes communicate over a TCP cluster bus, so the inaccurate bullet was removed.
- The size-limit section used `cat /proc/sys/kernel/shmmax` as the current `/dev/shm` maximum. `kernel.shmmax` applies to System V shared memory segment limits, not the tmpfs mount size. Replaced it with `findmnt -no OPTIONS /dev/shm`.
- The systemd section said `PrivateTmp=true` restricts a service's shared memory namespace. systemd documents `PrivateTmp=` as private `/tmp` and `/var/tmp`; it does not make `/dev/shm` private. Updated the wording to describe service-level hardening for temporary files and executable memory mappings.

## Review Notes
The main `/dev/shm` hardening guidance is technically sound for server workloads, but `noexec` is not a complete execution-prevention boundary because interpreters can still read scripts from `/dev/shm` when invoked from an executable filesystem. The post already frames `noexec` as preventing direct execution, which is accurate.
