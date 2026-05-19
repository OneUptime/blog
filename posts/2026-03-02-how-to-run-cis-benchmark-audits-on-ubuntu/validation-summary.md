# Validation Summary: How to Run CIS Benchmark Audits on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (CIS Benchmark)
- Lynis (CISOfy security auditing tool)
- APT / apt-key / signed-by keyring management
- modprobe / kernel module disablement
- sysctl (net.ipv4.* kernel parameters)
- systemd / systemctl (service management)
- auditd, rsyslog
- OpenSSH sshd_config directives
- /etc/login.defs password policy
- Bash scripting

## Sources Consulted
- CIS Ubuntu Linux Benchmarks (https://www.cisecurity.org/benchmark/ubuntu_linux)
- Lynis documentation (https://cisofy.com/documentation/lynis/)
- CISOfy Lynis APT repository instructions (https://packages.cisofy.com/community/)
- sshd_config(5) man page (OpenSSH directives: HostbasedAuthentication, PermitRootLogin, PermitOpen, PermitTunnel, etc.)
- Debian/Ubuntu apt-key deprecation notice (apt-key(8) – deprecated, removed in newer releases; use signed-by with /etc/apt/keyrings/)
- login.defs(5) man page (PASS_MAX_DAYS, PASS_MIN_DAYS)
- Linux kernel sysctl networking documentation (Documentation/networking/ip-sysctl.txt)
- Ubuntu snap/squashfs note (squashfs is required by snapd on Ubuntu and is not disabled in Ubuntu CIS profiles)

## Issues Found

1. **Deprecated `apt-key add` in Lynis install instructions.** `apt-key` is deprecated since Debian 11 / Ubuntu 22.04 and is non-functional in newer releases. Replaced with the modern `gpg --dearmor` + `/etc/apt/keyrings/` + `signed-by=` pattern, which is the official APT-recommended approach.

2. **Invalid sshd_config directive `permittopening`.** This is not a real OpenSSH directive (no match in `sshd_config(5)`). Removed the line; the remaining checks (PermitRootLogin, PasswordAuthentication, etc.) are the canonical CIS Section 5.2 SSH checks.

3. **Misspelled directive `hostsbasedauthentication`.** The correct directive is `HostbasedAuthentication` (no `s` after `Host`). Fixed to `hostbasedauthentication` so the `sshd -T` output match works.

4. **Broken `PASS_MAX_DAYS` / `PASS_MIN_DAYS` checks.** The original `grep -q "^PASS_MAX_DAYS\s*90"` only matched the literal value `90`, not "less than or equal to 90" as the success message claimed. Likewise `PASS_MIN_DAYS\s*[1-9]` only matched single-digit 1–9. Replaced both with `awk` extraction and numeric comparison so the check actually reflects the CIS requirement.

5. **Inconsistent comment about `squashfs` in the filesystem module loop.** The comment listed `squashfs` among modules expected to be disabled, but the loop intentionally omitted it (correct behavior on Ubuntu because snapd requires squashfs). Updated the comment to match the loop and noted why squashfs is excluded.

## Review Notes

- The CISOfy install documentation on their website still shows the legacy `apt-key add` form, but it no longer works on current Ubuntu releases — the modern keyring approach in the post is the correct one going forward.
- Lynis version `3.0.8` in the sample output is illustrative; current releases are slightly newer (3.0.9+) but the format and field names remain accurate.
- The CIS section structure described (Sections 1–6) reflects the v1.x/v2.x Ubuntu CIS Benchmarks. Newer benchmark revisions may renumber sub-controls, but the top-level sections remain stable.
- The script's `$((PASS * 100 / (PASS + FAIL + WARN)))` score formula will divide-by-zero if all counters are zero; in practice this won't occur because checks always run, but a defensive guard could be added in a future revision.
- `dpkg -l <pkg> | grep -q "^ii"` prints a `dpkg-query: no packages found` warning to stderr when the package is missing; this is cosmetic and doesn't affect correctness.
- `lynis audit system --quick` is correct (skips waiting for keypresses); the official non-interactive flag for CI/CD scenarios.
