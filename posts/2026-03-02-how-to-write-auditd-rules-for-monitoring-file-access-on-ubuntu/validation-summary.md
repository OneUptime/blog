# Validation Summary: How to Write auditd Rules for Monitoring File Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux Audit subsystem (auditd) 3.x
- `auditctl` (rule management / status)
- `augenrules` (rule loader)
- `ausearch` (log search)
- `aureport` (log reporting)
- audisp / built-in syslog plugin
- Ubuntu 22.04 / 24.04 (auditd package 3.0.x / 3.1.x)
- Compliance rulesets (PCI-DSS, NISPOM, STIG, OSPP)
- systemd service management

## Sources Consulted
- auditd(8) man page — https://man7.org/linux/man-pages/man8/auditd.8.html
- auditctl(8) man page — https://man7.org/linux/man-pages/man8/auditctl.8.html
- auditd-plugins(5) man page — https://man7.org/linux/man-pages/man5/auditd-plugins.5.html
- Red Hat: Audit 3.0 replaces audispd with auditd — https://access.redhat.com/solutions/3806561
- linux-audit/audit-userspace GitHub repository — https://github.com/linux-audit/audit-userspace
- Ubuntu Noble (24.04) auditd package file list — https://packages.ubuntu.com/noble/amd64/auditd/filelist
- Local `apt-cache show auditd` (confirmed Ubuntu 24.04 ships auditd 3.1.2)

## Issues Found
1. **`sudo auditd -s` used as a "view audit statistics" command** (Tuning for Performance section). The `auditd` binary's `-s` flag only sets the kernel's initial enabled state at daemon startup (valid values: `disable|enable|nochange`); it does not print statistics. The correct command is `sudo auditctl -s`. Fixed by replacing `auditd` with `auditctl`.

2. **`killall -HUP auditd` described as "Manually rotate logs"** (Log Management section). SIGHUP causes auditd to re-read its configuration file; it does not rotate logs. SIGUSR1 is the signal that triggers immediate log rotation, per the auditd(8) man page. Fixed by switching to `killall -USR1 auditd` and clarifying the comment.

3. **Audisp plugin config written to `/etc/audisp/plugins.d/syslog.conf`** (Sending Audit Logs to Remote Syslog section). In auditd 3.x (shipped in Ubuntu 22.04 and 24.04), audispd was merged into auditd and the plugins directory moved to `/etc/audit/plugins.d/`. The old `/etc/audisp/` path no longer exists on modern Ubuntu. Fixed by updating the path and adding a brief note explaining the move.

## Review Notes
- The "CIS Benchmark Audit Rules" section downloads `30-pci-dss-v31.rules`, which is a PCI-DSS ruleset rather than a CIS-specific ruleset. The `linux-audit/audit-userspace` repository does not ship a CIS-named ruleset (its examples are NISPOM, PCI-DSS, STIG, and OSPP profiles). The section heading is therefore slightly misleading, but the body text does correctly enumerate the included profiles and the file referenced does exist — left as-is since it is not a factual error, just imprecise framing.
- The `open` syscall filter (`-S open -F dir=/etc -F exit=-EACCES`) is valid but on modern glibc and most utilities the `openat` syscall is used instead of `open`. Adding `-S openat` would catch more events; left as-is since the original rule is not incorrect.
- The audit-userspace GitHub default branch is still `master` (not `main`) as of this review, so the `wget` URL remains valid.
- `/usr/share/doc/auditd/examples/rules/` is the correct example-rules path on Ubuntu 24.04 (confirmed via Ubuntu package file list).
- `audispd-plugins` package still exists on Ubuntu 24.04 and is listed as a `Suggests` of `auditd`, so the install command remains valid even though many former audisp features are now in-tree in auditd 3.x.
