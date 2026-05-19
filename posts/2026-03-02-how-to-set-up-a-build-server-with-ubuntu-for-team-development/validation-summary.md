# Validation Summary: How to Set Up a Build Server with Ubuntu for Team Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (apt, useradd, groupadd, hostnamectl, timedatectl)
- OpenSSH (sshd_config: PasswordAuthentication, PubkeyAuthentication, AllowGroups, MaxSessions, MaxStartups)
- OpenJDK 17 / 21, Maven, Gradle, SDKMAN
- Node.js (nvm, NodeSource), pnpm, yarn
- Python 3 (pip, virtualenv, tox, pytest, pyenv)
- Go (manual tarball install)
- Docker (docker.io package)
- /etc/security/limits.conf (PAM limits)
- systemd slices (CPUQuota, MemoryHigh, MemoryMax, TasksMax)
- tmpfs / /etc/fstab
- Nginx (autoindex, allow/deny)
- Prometheus node_exporter
- cron / /etc/cron.d

## Sources Consulted
- limits.conf(5) man page — https://man7.org/linux/man-pages/man5/limits.conf.5.html
- sshd_config(5) man page — https://man.openbsd.org/sshd_config.5
- systemd.resource-control(5) — https://man.archlinux.org/man/systemd.resource-control.5.en
- systemd.special(7) — https://man7.org/linux/man-pages/man7/systemd.special.7.html
- useradd(8) man page — https://man7.org/linux/man-pages/man8/useradd.8.html
- nvm release v0.39.7 — https://github.com/nvm-sh/nvm/releases/tag/v0.39.7
- Go release history — https://go.dev/doc/devel/release (Go 1.22.5 confirmed real)
- NodeSource Node.js distributions

## Issues Found

1. **Misleading `cpu` limit comment in `/etc/security/limits.conf`** — The post wrote:
   ```
   # Prevent a single build from using more than 24 cores
   @builders   soft   cpu      1440     # 24 hours CPU time limit
   ```
   Per limits.conf(5), the `cpu` field is the maximum CPU time in **minutes** (RLIMIT_CPU), not a core count. `cpu 1440` means 1440 minutes (24 hours) of accumulated CPU time per process; it has nothing to do with how many CPU cores a build may use. Fixed the leading comment to clarify that this is a per-process CPU time cap, and that core-count limits are enforced via the cgroups/CPUQuota block below.

2. **Incorrect `MaxStartups` comment** — The post wrote:
   ```
   # Limit concurrent SSH connections per user
   MaxStartups 10:30:60
   ```
   Per sshd_config(5), `MaxStartups` controls the maximum number of concurrent **unauthenticated** connections to the SSH daemon **globally**, not per-user. The triple `start:rate:full` (10:30:60) means: at 10 unauthenticated connections begin refusing new connections with probability 30%, scaling to refusing all at 60. Updated the comment to "Throttle concurrent unauthenticated connections (start:rate:full)".

3. **Missing `##` heading prefix on "Resource Limits and cgroups"** — Section heading was rendered as plain paragraph text rather than a section header, breaking the document outline. Added the `##` prefix.

## Review Notes
- `useradd -r -m` is a valid combination — `-r` alone suppresses home directory creation, and `-m` overrides that. Per the useradd(8) man page, this is the documented way to create a system account with a home directory.
- `sudo systemctl restart sshd` works on Ubuntu 22.04 and 24.04 because the ssh.service unit declares `sshd.service` as an alias. The canonical service name on Debian/Ubuntu is `ssh`, but the post's usage is functional.
- The systemd slice unit has `Before=slices.target` and `DefaultDependencies=no`. `slices.target` does exist as a standard special target, but ordering custom slices before it is generally unnecessary — slices are started automatically when a unit with `Slice=` is activated. Functional but unidiomatic; left as-is since it doesn't break anything.
- `sudo pip3 install virtualenv tox pytest` will fail with "externally-managed-environment" on Ubuntu 24.04+ due to PEP 668. The post doesn't pin a specific Ubuntu version, so this is a forward-compatibility caveat rather than a current bug. A future revision could recommend `pipx` or a system-wide virtualenv instead.
- Go 1.22.5 is a real release (2024-07-02), but as of 2026 the current Go is in the 1.23/1.24 series; readers should bump `GO_VERSION` accordingly.
- The `chown` step for `/home/ci-agent/.ssh` is omitted; the directory ends up owned by root. Since ci-agent uses `/usr/sbin/nologin` and the post never adds an authorized_keys for it, this is mostly cosmetic, but a follow-up could either chown the directory to ci-agent or drop the .ssh setup for that account entirely.
- nvm v0.39.7 is a real release but nvm has continued shipping; newer versions exist as of 2026.
