# Validation Summary: How to Monitor Disk I/O and Identify Storage Bottlenecks on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu
- Linux disk I/O monitoring
- sysstat / iostat
- iotop
- Performance Co-Pilot dstat
- vmstat / procps-ng
- /proc process I/O counters
- blktrace, blkparse, and btt
- Bash monitoring scripts

## Sources Consulted
- iostat(1) Linux manual page: https://man7.org/linux/man-pages/man1/iostat.1.html
- vmstat(8) Linux manual page: https://man7.org/linux/man-pages/man8/vmstat.8.html
- Ubuntu iotop manual page: https://manpages.ubuntu.com/manpages/noble/man8/iotop-c.8.html
- Ubuntu pcp-dstat manual page: https://manpages.ubuntu.com/manpages/noble/man1/pcp-dstat.1.html
- proc_pid_io(5) Linux manual page: https://man7.org/linux/man-pages/man5/proc_pid_io.5.html
- blkparse(1) Linux manual page: https://man7.org/linux/man-pages/man1/blkparse.1.html
- blktrace(8) Linux manual page: https://linux.die.net/man/8/blktrace
- Ubuntu package metadata checked locally with `apt-cache policy` for `sysstat`, `iotop`, `blktrace`, `dstat`, and `pcp`.
- Local command behavior checked with `iostat -V`, `vmstat -V`, `iostat -x`, and `vmstat`.

## Issues Found
- The `iostat -x` examples used an older extended-output column order and referenced the removed/deprecated `svctm` field. I updated the sample output and column table to match current sysstat output with `r_await`, `w_await`, `aqu-sz`, and `%util`.
- Several Bash examples parsed `iostat -x` using hard-coded field numbers. On current sysstat versions, those positions point to different metrics because read, write, discard, and flush fields are grouped separately. I changed the affected scripts to parse the `Device` header and read metrics by column name.
- The install section used `sudo apt install -y dstat`, but on Ubuntu 24.04 the `dstat` command is provided by the `pcp` package in this environment. I changed the install command to `sudo apt install -y pcp`.
- The blktrace script suggested installing a non-existent `blktrace-tools` package for `btt`. I corrected the message to install the `blktrace` package.

## Review Notes
- The corrected snippets were checked with `bash -n` for shell syntax.
- `dstat` compatibility varies by Ubuntu release; current Ubuntu 24.04 documentation points to the Performance Co-Pilot implementation.
