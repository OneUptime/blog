# Validation Summary: How to Set Up Ubuntu Server After Installation: First 10 Things to Do

## Status
validated

## Post Type
Tutorial / Checklist Guide

## Technologies Covered
- Ubuntu Server (apt, dpkg-reconfigure)
- unattended-upgrades / apt-listchanges
- OpenSSH (sshd_config drop-in, hardening directives)
- UFW (Uncomplicated Firewall)
- systemd-timedated / systemd-timesyncd / timedatectl
- hostnamectl
- Netplan (YAML network configuration)
- Fail2ban (jail.local configuration)
- systemd-journald (journal size / retention)
- logrotate
- Prometheus node_exporter (prometheus-node-exporter package)
- htop / iotop / nethogs
- cron, mail (basic alerting script)
- ss (socket statistics)

## Sources Consulted
- OpenSSH 7.6 release notes (SSHv1 removed, `Protocol` directive deprecated): https://www.openssh.com/txt/release-7.6
- sshd_config(5) man page (current OpenSSH 9.x)
- Local verification with `sshd -T -f` on OpenSSH_9.6p1 to confirm `Protocol 2` is silently ignored (no `protocol` key in output)
- systemd.time(7) — time span syntax (verified `30day` parses via `systemd-analyze timespan "30day"` → 4w 2d)
- journald.conf(5) — `SystemMaxUse`, `RuntimeMaxUse`, `MaxRetentionSec`
- Ubuntu package archive: confirmed `prometheus-node-exporter` exists in universe via `apt-cache show`
- Netplan reference (https://netplan.readthedocs.io/) — modern `routes:` (`to: default` / `via:`) syntax replacing deprecated `gateway4`
- Fail2ban documentation — `jail.local`, `%(sshd_log)s` macro, `fail2ban-client status`
- UFW man page — `ufw allow OpenSSH`, application profiles, default policies
- Ubuntu sshd_config drop-in convention: `Include /etc/ssh/sshd_config.d/*.conf` (Ubuntu 20.04+ default)

## Issues Found
- **Removed deprecated `Protocol 2` SSH directive.** The `Protocol` keyword was deprecated in OpenSSH 7.6 (October 2017) when SSHv1 support was dropped entirely. In modern OpenSSH (8.x / 9.x shipped with current Ubuntu LTS releases) the directive is silently ignored — confirmed locally on OpenSSH_9.6p1 where the directive does not appear in `sshd -T` output. Leaving it in misleads readers into thinking it is doing something, so it (and its accompanying comment) was removed from the hardening drop-in.

## Review Notes
- The `KexAlgorithms`, `Ciphers`, and `MACs` lists are all valid and consist of currently-recommended algorithms. `curve25519-sha256` and `curve25519-sha256@libssh.org` resolve to the same KEX algorithm — listing both is redundant but harmless and a common defensive habit, so it was left as-is.
- The drop-in approach (`/etc/ssh/sshd_config.d/hardening.conf`) relies on the `Include /etc/ssh/sshd_config.d/*.conf` directive present in Ubuntu's default `sshd_config` since 20.04. Because sshd uses first-match semantics and the Include lives near the top of the default config, the drop-in correctly overrides later defaults.
- Health-check script: `free | awk '/Mem/{printf "%.0f", $4/$2*100}'` reports the "free" column ($4), not "available" memory. On modern Linux, "available" is usually more representative because of cached pages, but the script is functionally correct and the author's intent is clear — left as-is.
- `prometheus-node-exporter` (Debian/Ubuntu package name) installs as a systemd service listening on port 9100 by default and is correctly enabled with `systemctl enable --now`. Note that the firewall section earlier does not open 9100; this is intentionally left to the reader since exposure depends on their Prometheus topology.
- The netplan example uses the modern `routes:` syntax instead of the deprecated `gateway4:` — correct for current Ubuntu releases.
- The `MaxRetentionSec=30day` value parses correctly per systemd time-span syntax (singular `day` is accepted alongside `days`).
- `[ -f /var/run/reboot-required ]` is the canonical Ubuntu reboot indicator — correct.
