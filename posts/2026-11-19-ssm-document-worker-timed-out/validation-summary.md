# Validation Summary: SSM `document worker timed out`: Disk, Memory, and Worker Log Checks

## Status
validated

## Post Type
Technical troubleshooting guide with Linux diagnostic commands and conditional remediation.

## Technologies Covered
- AWS Systems Manager, SSM Agent, Session Manager, and Run Command.
- Linux filesystems, disk capacity, inodes, process descriptors, and inotify.
- systemd services, journals, resource limits, and cgroup v2 memory events.
- Bash, GNU coreutils/findutils/grep, procps-ng, and util-linux.

## Sources Consulted
- [AWS Session Manager troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html): worker timeout and channel-creation symptoms.
- [AWS command status definitions](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html): execution versus delivery timeouts.
- [AWS SSM Agent troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-ssm-agent.html): watcher failures, inotify instance limits, the recommended value of 8192, and persistence.
- [AWS service status and startup commands](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-status-and-restart.html): package and Ubuntu Snap service names.
- [AWS SSM Agent logging](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html): log and command output locations and configurable logging.
- [systemctl](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html): status, show, cat, property selection, daemon-reload, and restart.
- [journalctl](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html): unit, time, kernel, and boot filters.
- [systemd resource controls](https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html): memory/task controls and hierarchical limits.
- [systemd execution settings](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html): soft/hard LimitNOFILE values and application compatibility.
- [Linux kernel cgroup v2 documentation](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html): memory.events, oom_kill, and memory.events.local.
- [inotify_init(2)](https://man7.org/linux/man-pages/man2/inotify_init.2.html), [inotify_add_watch(2)](https://man7.org/linux/man-pages/man2/inotify_add_watch.2.html), and [inotify(7)](https://man7.org/linux/man-pages/man7/inotify.7.html): error meanings and separate per-real-UID instance/watch quotas.
- [proc_pid_limits(5)](https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html), [proc_pid_fd(5)](https://man7.org/linux/man-pages/man5/proc_pid_fd.5.html), and [dup(2)](https://man7.org/linux/man-pages/man2/dup.2.html): process limits, descriptor entries, anonymous inode links, and shared open-file descriptions.
- [df(1)](https://man7.org/linux/man-pages/man1/df.1.html) and [findmnt(8)](https://man7.org/linux/man-pages/man8/findmnt.8.html): containing-filesystem lookup and capacity/inode options.
- [find(1)](https://man7.org/linux/man-pages/man1/find.1.html): depth limits, symbolic-link matching, and printf output.
- [ps(1)](https://man7.org/linux/man-pages/man1/ps.1.html), [pgrep(1)](https://man7.org/linux/man-pages/man1/pgrep.1.html), and [free(1)](https://man7.org/linux/man-pages/man1/free.1.html): RSS sorting, real UID selection, and memory reporting.
- [sysctl(8)](https://man7.org/linux/man-pages/man8/sysctl.8.html): runtime kernel parameter reads and writes.
- [Bash manual](https://man7.org/linux/man-pages/man1/bash.1.html): conditionals, substitutions, parameter expansion, and syntax checking.
- [grep(1)](https://man7.org/linux/man-pages/man1/grep.1.html), [ls(1)](https://man7.org/linux/man-pages/man1/ls.1.html), and [head(1)](https://man7.org/linux/man-pages/man1/head.1.html): log searches, file listings, and output selection.

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all eight Bash blocks; each passed `bash -n`. No README changes were necessary.
- The worker-channel diagnosis and execution-timeout distinction agree with AWS documentation. Filesystem and memory checks are appropriately presented as investigations requiring correlated evidence, rather than guaranteed causes of this error.
- The post correctly separates process descriptor limits, system-wide open-file exhaustion, inotify instances, and inotify watches. Its descriptor inventory explicitly acknowledges duplication and process-exit races.
- The memory-event interpretation is accurate: hierarchical counters do not identify individual victims or timestamps, and current memory readings cannot reconstruct a past peak.
- Commands assume Bash and the documented Linux utilities on a systemd host; the cgroup example explicitly requires cgroup v2 at the stated mount. The snippets share variables established earlier and contain placeholders that must be replaced.
- This was a documentation and syntax review on a macOS workspace, not an end-to-end test on an AWS managed Linux node. No service restart, sysctl change, resource exhaustion, or AWS operation was executed.
- All technical reference URLs in the post resolved to the intended documentation. The author GitHub link also resolved. The related OneUptime article could not be retrieved by the web tool; its matching README exists in this repository, so the link is plausible but live availability remains unverified.
- GNU-hosted Bash and grep manual requests timed out; the corresponding upstream manual pages hosted by man7.org were consulted instead. No deprecated command options or version-specific inaccuracies were identified within the stated Linux/systemd scope.
