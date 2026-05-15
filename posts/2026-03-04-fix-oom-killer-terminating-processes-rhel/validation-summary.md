# Validation Summary: How to Fix OOM Killer Terminating Processes on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux OOM killer
- systemd service resource controls
- Linux procfs
- Linux sysctl VM parameters
- Swap files
- journalctl and dmesg

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Configuring resource management by using cgroups-v2 and systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_configuring-resource-management-using-systemd_managing-monitoring-and-updating-the-kernel
- systemd.resource-control documentation: https://www.freedesktop.org/software/systemd/man/249/systemd.resource-control.html
- systemd.exec documentation for OOMScoreAdjust: https://www.freedesktop.org/software/systemd/man/253/systemd.exec.html
- Linux man-pages documentation for /proc/pid/oom_score_adj: https://man7.org/linux/man-pages/man5/proc_pid_oom_score_adj.5.html
- Linux kernel documentation for /proc/sys/vm, including swappiness and min_free_kbytes: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Local system man pages for journalctl(1), systemd.exec(5), systemd.resource-control(5), and swapon(8)

## Issues Found
- The memory-limit section implied that service memory limits prevent OOM entirely. Updated the heading and surrounding text to clarify that these limits prevent system-wide memory exhaustion, while MemoryMax can still invoke the OOM killer inside the unit if usage cannot be contained.
- The OOMScoreAdjust=-1000 note said it disables OOM killing entirely. Clarified that it disables OOM killing for that service's processes, matching systemd and procfs documentation.
- The swappiness comments overstated the behavior as simply keeping more data in RAM and preferring page cache reclaim. Updated the explanation to match kernel documentation: swappiness represents the relative cost of swap I/O versus filesystem paging, and lower values make the kernel less eager to swap anonymous memory.
- The min_free_kbytes comment described the setting as a minimum free memory value before OOM is triggered. Updated it to describe the VM minimum free-memory watermark reserve and added a tuning caution, because the kernel documentation warns that setting it too high can cause OOM conditions.

## Review Notes
The commands and configuration snippets are valid for modern RHEL systems using systemd resource controls. For older RHEL releases or systems using cgroups v1 defaults, memory-control option availability and behavior can differ.
