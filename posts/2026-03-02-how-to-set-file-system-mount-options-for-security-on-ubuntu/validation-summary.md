# Validation Summary: How to Set File System Mount Options for Security on Ubuntu

## Status
validated

## Post Type
Tutorial / Hardening guide

## Technologies Covered
- Linux filesystem mount options (noexec, nosuid, nodev)
- /etc/fstab configuration
- tmpfs (e.g., /tmp, /dev/shm)
- /proc with hidepid and gid options
- findmnt / mount utilities
- bind mounts
- CIS Ubuntu Linux Benchmark
- OpenSCAP (oscap) and scap-security-guide

## Sources Consulted
- Ubuntu manpage proc(5): https://manpages.ubuntu.com/manpages/noble/man5/proc.5.html
- Linux Audit hidepid hardening: https://linux-audit.com/linux-system-hardening-adding-hidepid-to-proc/
- OpenSCAP SSG Ubuntu 22.04 guide: https://static.open-scap.org/ssg-guides/ssg-ubuntu2204-guide-index.html
- OpenSCAP CIS Level 1 Server profile for Ubuntu 22.04: https://static.open-scap.org/ssg-guides/ssg-ubuntu2204-guide-cis_level1_server.html
- mount(8) Ubuntu manpages for remount semantics and tmpfs options
- bash(1) on `-p` (privileged mode) and setuid behavior

## Issues Found
1. **Incorrect GID for the `proc` group** — `sudo groupadd -g 1000 proc` would conflict with the first regular user on Ubuntu (Ubuntu assigns UID/GID 1000 to the first created user by default). Changed to `sudo groupadd --system proc` so the group is created as a system group with a sub-1000 GID, avoiding collisions.
2. **Non-existent OpenSCAP profile name** — `xccdf_org.ssgproject.content_profile_cis` does not exist for `ssg-ubuntu2204-ds.xml`. The available CIS profiles are `cis_level1_server`, `cis_level1_workstation`, `cis_level2_server`, and `cis_level2_workstation`. Updated the example to use `xccdf_org.ssgproject.content_profile_cis_level1_server`, which matches CIS Level 1 referenced earlier in the post.
3. **`nosuid` test would be blocked by `noexec`** — the test ran a setuid bash from /tmp, but /tmp in the hardened fstab also has `noexec`, so the test would fail with "Permission denied" before ever exercising nosuid. Updated the test to copy bash into the user's home directory (`~/bash-copy`), which per the example fstab has `nosuid,nodev` but allows execution, so the test now demonstrates nosuid as intended. Also switched `chmod +s` to `chmod u+s` (with `chown root:root`) so the setuid bit is the only thing being tested and the file is owned by root (required for a meaningful setuid demonstration).

## Review Notes
- `hidepid=2` is still accepted on modern kernels (5.8+ also accept the symbolic name `invisible`), so the numeric form remains valid.
- The bind mount syntax `/tmp /var/tmp none bind 0 0` is correct; the comment wording is a bit ambiguous but the resulting behavior (mounting /tmp at /var/tmp so they share restrictions) is correctly described.
- The `echo '#!/bin/bash\necho "executed"'` line uses bash's builtin `echo` which by default does not interpret `\n`, so the resulting test file is a single-line script. It is still effective at demonstrating noexec because execution is blocked before the shebang is consulted. Left as-is since it does not affect correctness of the demonstration.
- The post's CIS control numbers (1.1.2–1.1.5) correspond to the Ubuntu 20.04 CIS Benchmark numbering; the Ubuntu 22.04 CIS Benchmark uses a slightly different nested numbering (e.g., 1.1.2.1–1.1.2.4). Since the post does not pin to a specific CIS Benchmark version, the existing numbering is acceptable but readers targeting 22.04 specifically should verify against the current benchmark.
