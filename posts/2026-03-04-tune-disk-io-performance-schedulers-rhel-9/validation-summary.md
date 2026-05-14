# Validation Summary: How to Tune Disk I/O Performance and Schedulers on RHEL

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux multi-queue block layer
- Linux I/O schedulers: none, mq-deadline, bfq, kyber
- udev rules
- sysfs block queue attributes
- blockdev
- iostat / sysstat
- iotop
- fio

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting the disk scheduler": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/monitoring_and_managing_system_status_and_performance/
- Linux kernel documentation, "Queue sysfs files": https://docs.kernel.org/5.10/block/queue-sysfs.html
- Linux kernel documentation, "Switching Scheduler": https://docs.kernel.org/block/switching-sched.html
- Linux kernel documentation, "Deadline IO scheduler tunables": https://docs.kernel.org/5.17/block/deadline-iosched.html
- fio official documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- Local `blockdev --help` output
- Local `iostat(1)` man page
- Local `udevadm --help` output

## Issues Found
- The persistent readahead udev rule used `ATTR{bdi/read_ahead_kb}`. The block queue sysfs attribute documented by the kernel is `queue/read_ahead_kb`, so the rule was changed to `ATTR{queue/read_ahead_kb}="4096"`.
- The queue-depth section described `nr_requests` as the number of outstanding I/O requests. Kernel documentation defines it as the number of requests that may be allocated in the block layer for read or write requests, so the wording was corrected.
- The mq-deadline `fifo_batch` comment said it was the batch size for reads before switching to writes. Kernel documentation defines it as the maximum number of requests per batch, so the comment was corrected.
- The fio examples used `--runtime=30` without `--time_based`. fio documentation says `runtime` is only a cap unless `time_based` is set, so both examples were updated to include `--time_based`.

## Review Notes
The scheduler descriptions and RHEL 9 scheduler recommendations are broadly consistent with Red Hat documentation. Red Hat recommends leaving NVMe devices on the default `none` scheduler and notes that the automatically selected scheduler is typically optimal, so production tuning should still be benchmarked per workload before rollout.
