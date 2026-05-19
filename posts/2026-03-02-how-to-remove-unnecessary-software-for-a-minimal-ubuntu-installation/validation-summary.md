# Validation Summary: How to Remove Unnecessary Software for a Minimal Ubuntu Installation

## Status
validated

## Post Type
Tutorial / Guide (Linux system hardening)

## Technologies Covered
- Ubuntu (server)
- dpkg / dpkg-query
- apt / apt-get / apt-mark
- systemd / systemctl
- deborphan
- cloud-init
- unattended-upgrades
- Legacy network services (telnet, rsh, finger, talk, NIS, SNMP, xinetd)

## Sources Consulted
- apt-get(8) man page — https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-get.8.html
- apt-mark(8) man page — https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-mark.8.html
- dpkg(1) and dpkg-query(1) man pages — https://manpages.ubuntu.com/manpages/jammy/en/man1/dpkg.1.html
- systemctl(1) man page — https://manpages.ubuntu.com/manpages/jammy/en/man1/systemctl.1.html
- deborphan(1) man page — https://manpages.ubuntu.com/manpages/jammy/en/man1/deborphan.1.html
- cloud-init module reference — https://cloudinit.readthedocs.io/en/latest/reference/modules.html
- cloud-init "Package Update Upgrade Install" module docs
- Ubuntu Server Guide — Security/Hardening sections

## Issues Found

1. **cloud-init YAML: invalid key `packages_upgrade`**
   - The post used `packages_upgrade: true` (plural). The correct cloud-init key is `package_upgrade: true` (singular), per the cloud-init `Package Update Upgrade Install` module. The plural form would be silently ignored.
   - Fix: changed to `package_upgrade: true` and also added `package_update: true` (which the module documents as the recommended companion key to ensure the package index is refreshed before upgrade/install).

2. **cloud-init YAML: invalid top-level key `package_reconfig`**
   - `package_reconfig` is not a real cloud-init module/key. As written, the block would be ignored and `unattended-upgrades` would not be reconfigured.
   - Fix: removed the `package_reconfig` block and moved the reconfiguration into `runcmd` as `dpkg-reconfigure -f noninteractive unattended-upgrades`, which is the standard way to non-interactively reconfigure a package from cloud-init.

3. **cloud-init `runcmd`: duplicate `-y` flag**
   - The line `apt-get purge -y telnet rsh-client nis avahi-daemon cups -y` had `-y` specified twice. Functionally harmless but redundant.
   - Fix: removed the trailing duplicate `-y`.

## Review Notes

- All shell commands (`dpkg -l | grep '^ii'`, `dpkg-query -W --showformat=...`, `apt-mark showmanual/showauto`, `apt-get --simulate/-s`, `apt-get purge`, `apt-get autoremove --purge`, `systemctl mask`, `systemctl --failed`, `dpkg --audit`, `apt-get check`) are correct and current for supported Ubuntu LTS releases (20.04 / 22.04 / 24.04).
- The `deborphan` workflow (`sudo apt-get purge $(deborphan)`) is the documented usage and is safe in the orphaned-library sense, though users should review the list before purging.
- Package availability caveats (not fixed — they are guidance, not errors): on newer Ubuntu releases the legacy `ftp` client has been transitioned (now provided via `tnftp`/`inetutils-ftp`), and `telnetd-ssl` is not available in current archives. `apt-get purge` of a non-installed package simply fails noisily without changing system state, so the examples remain safe — they are intended as a checklist, not a script to run verbatim.
- `systemctl mask cups` will mask `cups.service`; on systems where CUPS is launched via `cups.socket` the socket unit should also be masked for full disablement. This is a minor refinement, not an error.
- The `for user in $(cut -f1 -d: /etc/passwd); do crontab -u "$user" -l ...` loop requires root and will silently skip users without crontabs (via `2>/dev/null`), which is the intended behavior.
- The overarching security advice (reduce attack surface, remove cleartext-protocol clients/servers, remove compilers from prod, baseline the manually-installed package list) is sound and aligned with CIS Ubuntu Benchmark guidance.
