# Validation Summary: How to Set Up auditd Rules for System Call Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Linux audit subsystem (kernel auditd / audit framework)
- auditctl CLI
- augenrules
- ausearch
- ausyscall
- Audit rule files in `/etc/audit/rules.d/`
- Linux syscalls (execve, setuid family, capset, prctl, mount, umount2, init_module, finit_module, delete_module, socket, setsockopt, bind, chmod family, chown family, setxattr family, unlink/rename family, ptrace, personality)
- Ubuntu (apt-managed audit package)

## Sources Consulted
- auditctl(8) manual page (Linux audit-userspace)
- ausearch(8) manual page
- augenrules(8) manual page
- ausyscall(8) manual page
- Linux kernel source: `arch/x86/entry/syscalls/syscall_64.tbl` and `syscall_32.tbl` (for syscall numbers)
- `<sys/socket.h>` constants (AF_INET = 2, AF_INET6 = 10 on Linux)
- `<linux/audit.h>` AUDIT_ARCH_X86_64 constant (0xC000003E)
- Red Hat / Ubuntu auditd documentation and CIS benchmark audit rules
- https://github.com/linux-audit/audit-userspace

## Issues Found
1. **Deprecated `entry` filter listed as valid.** The syscall rule syntax section listed `entry (before)` as a valid filter alongside `exit`, `user`, and `task`. The `entry` filter has been deprecated and removed from current auditctl; the kernel audit subsystem now exposes `task`, `exit`, `user`, and `exclude`. Updated the bullet to drop `entry` and add `exclude (event type exclusion)`.

2. **Incomplete 32-bit unmount rule.** The mount section's `-F arch=b32` rule listed only `umount`, missing `umount2` (syscall 52 on i386). Since modern Linux programs invoke `umount2`, the rule would silently miss most unmount activity on 32-bit. Added `-S umount2` to the b32 rule. The b64 rule was already correct (`umount2` only — `umount` does not exist as a syscall on x86_64).

3. **Misleading "privileged ports" bind rule comment.** The comment claimed the rule detected `bind` to privileged ports, but the actual rule (`-S bind -F euid=0`) audits every `bind()` call by a root process — the port number lives inside the sockaddr struct (a1) and is not directly filterable with `-F`. Reworded the comment to accurately describe what the rule captures.

4. **Undefined search key.** The "Searching Syscall Events" section ended with `sudo ausearch -k privilege-escalation -i`, but no rule in the post uses the key `privilege-escalation`. Changed it to `setuid-execution`, which matches the key defined in the privilege-escalation detection rules.

## Review Notes
- The example syscall record (`arch=c000003e syscall=59`) is accurate: `0xC000003E` is `AUDIT_ARCH_X86_64` (EM_X86_64 | LE | 64-bit flags), and syscall 59 is `execve` on x86_64.
- The socket-family rule correctly uses `b64` only (on i386, socket operations multiplex through `socketcall`, so `-S socket -F a0=2` would not work on `b32`).
- `-F exe=...` filters on the *calling* process's executable, not the target of execve. The `never` rule for `/usr/bin/python3` therefore suppresses execve calls made *by* python3 (e.g., subprocess spawns), which matches the "high-volume daemon" framing.
- `entry` is technically still parsed by some old userspace for backward compatibility but is internally converted to `exit`; removing it from the docs is the safer modern recommendation.
- Rule-ordering note about `never` rules is correct, and the numeric filename prefixes (`20-exclusions.rules` before `45-syscall-monitoring.rules`) correctly ensure augenrules concatenates exclusions first.
- For future updates: consider mentioning the `-D` flag (delete all rules) and immutable mode (`-e 2`) for hardening guidance, and the `setresuid`/`setresgid` syscalls alongside the setuid/setgid family.
