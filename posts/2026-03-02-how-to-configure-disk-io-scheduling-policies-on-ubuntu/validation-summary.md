# Validation Summary: How to Configure Disk I/O Scheduling Policies on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel block layer
- blk-mq I/O schedulers
- sysfs block queue settings
- udev rules
- systemd services
- fio benchmarking

## Sources Consulted
- Linux kernel documentation: Switching Scheduler - https://www.kernel.org/doc/html/v6.7/block/switching-sched.html
- Linux kernel documentation: Deadline IO scheduler tunables - https://docs.kernel.org/block/deadline-iosched.html
- Linux kernel documentation: BFQ (Budget Fair Queueing) - https://docs.kernel.org/block/bfq-iosched.html
- Linux kernel documentation: Kyber I/O scheduler tunables - https://docs.kernel.org/block/kyber-iosched.html
- Linux kernel documentation: Queue sysfs files - https://www.kernel.org/doc/html/v5.15/block/queue-sysfs.html
- Ubuntu Wiki: Kernel/Reference/IOSchedulers - https://wiki.ubuntu.com/Kernel/Reference/IOSchedulers
- udev manual / documentation - https://www.kernel.org/pub/linux/utils/kernel/hotplug/udev/udev.html
- Local command help/man pages: `udevadm trigger --help`, `lsblk --help`, `systemd.service(5)`, `udev(7)`

## Issues Found
- The post described `none` as "NoOp". Updated this to describe the modern blk-mq `none` scheduler accurately as no attached I/O scheduler.
- The `mq-deadline` description said it guarantees request completion within a deadline. Updated it to match kernel documentation: it attempts to guarantee a start service time.
- The BFQ description and `max_budget` note described budgets as a number of I/O operations or requests. Updated the wording to service budgets and noted that `max_budget` is measured in sectors.
- The Kyber description said it uses two queues. Updated this to the documented target latency goals for reads and synchronous writes.
- The rotational flag comment incorrectly implied values greater than zero report HDD RPM. Updated it to the documented 0/1 rotational flag.
- The NVMe udev match was too broad. Updated it to match NVMe namespace block devices.
- The GRUB `elevator=` guidance was outdated for modern Ubuntu blk-mq schedulers. Replaced it with guidance to use udev rules or the systemd service approach shown later in the post.
- The tuning section implied every scheduler exposes `iosched` tunables. Updated it to clarify that only schedulers with tunable parameters expose that directory when active.
- The BFQ `slice_idle` example used a microseconds explanation with the `slice_idle` file. Updated it to use `slice_idle_us`.
- The `nr_requests` explanation described device processing queue depth too broadly. Updated it to the documented block-layer request allocation meaning.
- The raw-device fio loop lacked `sudo` and `--readonly`. Updated the example to run the read-only raw-device benchmark with elevated permissions and explicit read-only mode.

## Review Notes
The post remains a practical Ubuntu guide. Scheduler availability and defaults can vary by Ubuntu release, kernel build, loaded scheduler modules, and storage driver, so readers should rely on `/sys/block/DEVICE/queue/scheduler` to see valid scheduler names before applying examples.
