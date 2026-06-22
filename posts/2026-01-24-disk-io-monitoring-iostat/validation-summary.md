# Validation Summary: How to Handle Disk I/O Monitoring with iostat

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Linux disk I/O monitoring
- sysstat / iostat
- Bash and awk
- systemd service units
- udev rules
- fio benchmarking
- smartctl
- Prometheus node_exporter textfile collector

## Sources Consulted
- Local `iostat(1)` man page and `iostat --help` from sysstat, including `-x`, `-m`, `-p`, `-o JSON`, `-y`, metric definitions, and `%util` semantics.
- Sysstat official site and FAQ: https://sysstat.github.io/ and https://sysstat.github.io/faq.html
- Local `pidstat(1)` help output for `pidstat -d`.
- Local `systemd.service(5)` and `systemd.unit(5)` man pages for service unit syntax and `Type=simple` behavior.
- Local `udev(7)` and `udevadm(8)` man pages for udev rule syntax and rules directory behavior.
- Prometheus exposition format documentation: https://prometheus.io/docs/instrumenting/exposition_formats/
- Red Hat storage documentation for setting disk schedulers with udev rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_storage_devices/setting-the-disk-scheduler_managing-storage-devices

## Issues Found
- The extended `iostat -x` example used an older column order and included `svctm` as if it were part of current output. Updated the example to match current read/write extended fields and moved `svctm` into a note explaining that older output may show it and that it is deprecated.
- The `%util` definition said that 100% always means the disk is saturated. Updated the wording to match `iostat(1)`: near 100% indicates saturation for devices serving requests serially, while RAID and modern SSD/NVMe devices can serve requests in parallel and need latency/queue confirmation.
- Several `awk` examples used fixed field numbers for `r_await`, `w_await`, `aqu-sz`, request size, and utilization. Current sysstat output includes additional discard and flush fields, so those field numbers can point at the wrong metrics. Reworked those examples to map fields from the `Device` header by name.
- The automated monitoring script parsed the first since-boot report from `iostat -x 1 2` and skipped lines with `tail -n +7`, which is brittle and can include non-device rows from later reports. Changed it to use `iostat -x -y 1 1` and parse named columns.
- The Prometheus textfile example appended repeated `HELP` lines inside the per-device loop and did not truncate the temporary file before appending samples. Updated it to write each `HELP`/`TYPE` line once, emit samples separately, and atomically move the completed temporary file.
- The Prometheus example described `node_disk_read_bytes_per_second`/`node_disk_write_bytes_per_second` while emitting kB/s metrics. Corrected the help names and text to `node_disk_read_kbytes_per_second` and `node_disk_write_kbytes_per_second`, noting KiB/s as used by iostat.
- The service setup used `chmod +x` on `/usr/local/bin/iostat-monitor.sh` without `sudo`. Updated it to `sudo chmod +x`.
- The troubleshooting section implied that starting the `sysstat` service fixes live `iostat` utilization. Corrected it to explain that `iostat` reads live counters from `/proc/diskstats` and `/sys`, and to check host/kernel/container counter visibility instead.
- The `rrqm/s` and `wrqm/s` descriptions said higher is always better. Reworded them to say high values can indicate effective request merging, which is more accurate for modern schedulers and devices.

## Review Notes
The remaining examples are generally valid as operational guidance, but several tuning recommendations are workload- and kernel-dependent. Readers should confirm available schedulers in `/sys/block/<device>/queue/scheduler` before applying scheduler changes, and should benchmark against their own devices rather than treating the baseline table as guaranteed performance.
