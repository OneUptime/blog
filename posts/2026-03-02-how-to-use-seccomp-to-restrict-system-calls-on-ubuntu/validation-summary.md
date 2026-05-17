# Validation Summary: How to Use seccomp to Restrict System Calls on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- seccomp (Linux kernel Secure Computing Mode)
- libseccomp (C library and `libseccomp-dev` / `libseccomp2` / `seccomp` Ubuntu packages)
- BPF (Berkeley Packet Filter) for syscall filtering
- strace (syscall tracing for profile discovery)
- Docker `--security-opt seccomp=` and JSON profile format
- systemd unit hardening (`SystemCallFilter`, `SystemCallErrorNumber`, `SystemCallArchitectures`)
- systemd predefined syscall groups (`@system-service`, `@network-io`, etc.)
- `systemd-analyze syscall-filter`
- audit subsystem (`auditd`, `ausearch -m SECCOMP`)
- nginx hardening example

## Sources Consulted
- seccomp(2) man page — https://man7.org/linux/man-pages/man2/seccomp.2.html
- seccomp_init(3), seccomp_rule_add(3), seccomp_load(3) — https://man7.org/linux/man-pages/man3/seccomp_init.3.html
- Docker seccomp documentation — https://docs.docker.com/engine/security/seccomp/
- Ubuntu libseccomp source package — https://packages.ubuntu.com/src:libseccomp
- systemd.exec(5) — SystemCallFilter, SystemCallErrorNumber, SystemCallArchitectures
- systemd issue #16422 (SCMP_ACT_LOG support discussion)
- Linux Audit guides for SystemCallFilter and `systemd-analyze syscall-filter`
- ausearch(8) man page — https://man7.org/linux/man-pages/man8/ausearch.8.html
- strace(1) man page — https://man7.org/linux/man-pages/man1/strace.1.html

## Issues Found

1. **SECCOMP_MODE_STRICT syscall list imprecise.** The post originally said the strict mode allows "read, write, exit, and sigreturn". The kernel allows `__NR__exit` (the `_exit` syscall) specifically — `exit_group` is NOT permitted. Clarified to `_exit` and added a parenthetical note.

2. **Misleading `SystemCallErrorNumber` comment.** The original comment read `Options: kill (default), kill-process, trap, log, errno:EPERM`, implying these were valid values for the `SystemCallErrorNumber=` directive. They are not — that directive only accepts an errno number (0–4095) or errno name (EPERM, EACCES, etc.). The kill/log/trap actions come from libseccomp's `SCMP_ACT_*` constants, not systemd. Rewrote the comment to accurately describe systemd's behavior: SIGSYS-kill is the default when `SystemCallErrorNumber` is unset, and setting it switches to errno-return.

## Review Notes

- The libseccomp C example uses `SCMP_ACT_KILL`, which in libseccomp 2.4+ is an alias for `SCMP_ACT_KILL_THREAD`. For single-threaded processes this is equivalent to killing the process; multi-threaded applications might prefer the newer `SCMP_ACT_KILL_PROCESS`. Not incorrect, just a caveat worth knowing.
- The example does not check return values of `seccomp_rule_add()` (it returns a negative errno on failure). For tutorial brevity this is acceptable, but production code should check.
- The strace example invoking `nginx -g 'daemon off;'` and the `pgrep nginx` attach example would typically require `sudo` since nginx runs as root and binds to a privileged port. The post does not call this out explicitly.
- Docker's default profile is described as blocking "~44 dangerous syscalls" — this matches Docker's own official documentation language ("around 44 system calls out of 300+"), so it's accurate as of the time of writing, but the exact count drifts with profile updates.
- All systemd `@`-prefixed syscall groups listed are real and current.
- The Docker JSON profile correctly uses the plural `names` field (array) per the schema.
