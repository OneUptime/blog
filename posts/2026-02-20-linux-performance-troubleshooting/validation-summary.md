# Validation Summary: How to Troubleshoot Linux Performance Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux performance troubleshooting
- procps-ng tools: uptime, free, ps, top, vmstat, pmap
- sysstat tools: mpstat, iostat, sar
- iproute2 tools: ip, ss
- Kernel logs and procfs: dmesg, /proc/meminfo, /proc/net/softnet_stat
- Disk and process diagnostics: smartctl, iotop, strace
- DNS diagnostics: dig

## Sources Consulted
- Local Linux man pages: uptime(1), nproc(1), free(1), df(1), dmesg(1), top(1), ps(1), vmstat(8), pmap(1), iostat(1), mpstat(1), sar(1), strace(1), ip(8), ss(8), dig(1)
- sysstat iostat documentation: https://github.com/sysstat/sysstat
- procps-ng documentation and man pages: https://gitlab.com/procps-ng/procps
- strace documentation: https://strace.io/
- iproute2 documentation and man pages: https://wiki.linuxfoundation.org/networking/iproute2
- smartmontools documentation: https://www.smartmontools.org/

## Issues Found
- The introduction said the tools were available on every Linux system. Several commands in the post, including htop, mpstat, iostat, sar, iotop, smartctl, strace, and dig, are commonly packaged separately. Changed the wording to say they are common Linux tools and may need package installation.
- The USE diagram referred to iostat `avgqu-sz`. Current sysstat names this field `aqu-sz`, with `avgqu-sz` documented as the older name. Updated the diagram and disk I/O notes.
- The CPU section said `ps aux --sort=-%cpu` sorts by cumulative CPU time. The procps `ps` man page defines `%cpu` as CPU time divided by process lifetime, not cumulative CPU time. Updated the comment.
- The disk I/O section described `%util` as "100% = fully saturated" and `await` as "should be < 10ms for SSDs." The iostat man page notes that `%util` does not reflect performance limits for parallel devices such as modern SSDs and RAID arrays, and acceptable `await` depends on the storage and workload baseline. Updated the comments to avoid misleading thresholds.
- The strace example traced only `open`, `read`, and `write`. Modern Linux programs often use related file syscalls such as `openat`; replaced the example with `trace=%file,read,write`, using the current strace syscall class syntax.
- The sar enablement and historical file path examples were Linux-distribution-specific. Clarified that the shown `/etc/default/sysstat` and `/var/log/sysstat/sa20` examples are Debian/Ubuntu examples.

## Review Notes
The guide is technically relevant and the overall troubleshooting methodology is sound. Some performance thresholds remain intentionally heuristic; in production, disk latency, CPU load, and memory pressure should be interpreted against workload-specific baselines and hardware characteristics.
