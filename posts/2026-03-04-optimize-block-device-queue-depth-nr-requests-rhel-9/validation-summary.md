# Validation Summary: How to Optimize Block Device Queue Depth and nr_requests on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux block layer
- sysfs block queue attributes
- udev rules
- util-linux blockdev
- fio
- sysstat iostat

## Sources Consulted
- Linux kernel documentation, Queue sysfs files: https://docs.kernel.org/5.10/block/queue-sysfs.html
- Linux kernel documentation, blk-mq: https://docs.kernel.org/6.15/block/blk-mq.html
- Red Hat Enterprise Linux 7 Performance Tuning Guide, storage and file systems section: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/pdf/performance_tuning_guide/performance-tuning-guide.pdf
- Red Hat Customer Portal, changing nr_requests or queue_depth through udev: https://access.redhat.com/solutions/1142693
- Red Hat Customer Portal, NVMe queue parameter write failures: https://access.redhat.com/solutions/3429731
- Local udev(7) manual page from systemd
- Local blockdev(8) manual page from util-linux 2.39.3
- Local iostat help/version output from sysstat 12.6.1
- fio documentation: https://fio.readthedocs.io/

## Issues Found
- The post stated that HDDs benefit from smaller queues because they can only perform one physical operation at a time. This was too absolute, because rotational devices can still benefit from limited queuing for request merging and command reordering. Updated the explanation to describe the latency tradeoff more accurately.
- The post described `nr_requests` as a single maximum queue count managed by the I/O scheduler. Kernel and Red Hat documentation define it as the number of requests allocated for reads or writes separately, so the total can be twice the value. Updated the explanation.
- The default `nr_requests` values were listed as HDD 64, SSD 64 or higher, and NVMe 1023. Red Hat documentation describes a default of 128, with real values varying by kernel, device, driver, and configuration. Replaced the device-specific defaults with a documented default and a reminder to check sysfs.
- The NVMe tuning example assumed all NVMe devices accept `nr_requests=1023`. Red Hat documents cases where NVMe queue parameter writes fail with `Invalid argument`. Added a caveat to use supported values and the current sysfs value as the baseline.
- The read-ahead sysfs example said `/sys/block/sda/queue/read_ahead_kb` is in 512-byte sectors. Kernel documentation defines `read_ahead_kb` in kilobytes. Corrected the unit.
- The section titled "Making Changes Persistent with sysctl" used `blockdev --setra`, which is not sysctl and does not by itself make the setting persistent across reboot. Renamed the section and clarified that `blockdev --setra` changes the runtime setting; persistence requires udev or another boot-time mechanism.
- The iostat guidance compared `aqu-sz` directly to `nr_requests`. Red Hat documentation notes that outstanding I/O includes scheduler requests and device queue depth, so `nr_requests` alone is not the right threshold. Updated the guidance to compare against available scheduler and device queue capacity and validate with latency benchmarks.

## Review Notes
The remaining tuning values are examples, not universal recommendations. Queue-depth and read-ahead changes should be benchmarked on the actual storage stack, especially with multipath, device-mapper, virtualized storage, or NVMe devices whose drivers may reject unsupported queue settings.
